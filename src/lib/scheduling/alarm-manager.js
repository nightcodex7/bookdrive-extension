// alarm-manager.js - Chrome Alarms integration for scheduled backups

import { getSchedule, isBackupDue, updateBackupTime } from './scheduler.js';
import {
  getBackupsDueForRetry,
  BACKUP_STATUS,
  updateBackupMetadata,
  saveBackup,
} from '../backup/backup-metadata.js';
import { canPerformOperation, RESOURCE_STATE } from './resource-monitor.js';
import {
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
  initializeAdaptiveScheduler,
} from './adaptive-scheduler.js';
import { BACKUP_RESOURCE_CHECK_OPTIONS, RETRY_RESOURCE_CHECK_OPTIONS } from './scheduler-utils.js';
import { initializeResourceProcessor, processBatch, runWhenIdle } from './resource-processor.js';

// Constants
const BACKUP_ALARM_NAME = 'scheduledBackup';
const RETRY_ALARM_NAME = 'backupRetry';
const MISSED_BACKUP_ALARM_NAME = 'missedBackup';
const CHECK_INTERVAL_MINUTES = 15; // Check every 15 minutes
const RETRY_CHECK_INTERVAL_MINUTES = 2; // Check for retries every 2 minutes
const MISSED_BACKUP_CHECK_INTERVAL_MINUTES = 10; // Check for missed backups every 10 minutes

/**
 * Initialize backup alarm system
 */
export async function initializeBackupAlarms() {
  try {
    const settings = await getSettings();
    
    if (!settings.scheduledBackups) {
      return;
    }

    // Clear existing alarms first
    await clearBackupAlarms();

    // Create new alarms
    await chrome.alarms.create('scheduledBackup', {
      delayInMinutes: CHECK_INTERVAL_MINUTES,
      periodInMinutes: CHECK_INTERVAL_MINUTES,
    });

    await chrome.alarms.create('backupRetry', {
      delayInMinutes: RETRY_CHECK_INTERVAL_MINUTES,
      periodInMinutes: RETRY_CHECK_INTERVAL_MINUTES,
    });

    await chrome.alarms.create('missedBackup', {
      delayInMinutes: MISSED_BACKUP_CHECK_INTERVAL_MINUTES,
      periodInMinutes: MISSED_BACKUP_CHECK_INTERVAL_MINUTES,
    });

  } catch (error) {
    console.error('Failed to initialize backup alarms:', error);
  }
}

/**
 * Clear all backup alarms
 * @returns {Promise<void>}
 */
export async function clearBackupAlarms() {
  const clearMainAlarm = new Promise((resolve) => {
    chrome.alarms.clear(BACKUP_ALARM_NAME, (wasCleared) => {
      if (wasCleared) {
        console.log('Cleared existing backup alarms');
      }
      resolve();
    });
  });

  const clearRetryAlarm = new Promise((resolve) => {
    chrome.alarms.clear(RETRY_ALARM_NAME, (wasCleared) => {
      if (wasCleared) {
        console.log('Cleared existing retry alarms');
      }
      resolve();
    });
  });

  const clearMissedBackupAlarm = new Promise((resolve) => {
    chrome.alarms.clear(MISSED_BACKUP_ALARM_NAME, (wasCleared) => {
      if (wasCleared) {
        console.log('Cleared existing missed backup alarms');
      }
      resolve();
    });
  });

  return Promise.all([clearMainAlarm, clearRetryAlarm, clearMissedBackupAlarm]);
}

/**
 * Handle alarm events
 * @param {chrome.alarms.Alarm} alarm The alarm that fired
 */
export function handleAlarm(alarm) {
  if (alarm.name === BACKUP_ALARM_NAME) {
    console.log('Backup alarm fired, checking if backup is due');
    checkAndTriggerBackup();
  } else if (alarm.name === RETRY_ALARM_NAME) {
    console.log('Retry alarm fired, checking for backups to retry');
    checkAndTriggerRetries();
  } else if (alarm.name === MISSED_BACKUP_ALARM_NAME) {
    console.log('Missed backup alarm fired, checking for missed backups to process');
    processNextMissedBackup()
      .then((result) => {
        if (result.processed) {
          console.log(`Processed missed backup: ${result.missedBackup.id}`);
        } else {
          console.log(`No missed backups processed: ${result.reason || 'Unknown reason'}`);
        }
      })
      .catch((error) => {
        console.error('Error processing missed backups:', error);
      });
  }
}

/**
 * Check if a backup is due and trigger it if needed
 * @returns {Promise<void>}
 */
export async function checkAndTriggerBackup() {
  try {
    const backupDue = await isBackupDue();
    if (backupDue) {
      console.log('Backup is due, checking system resources');

      // Check if backup should be deferred based on system resources
      const deferCheck = await shouldDeferBackup();

      if (!deferCheck.shouldDefer) {
        console.log('System resources are sufficient, triggering backup');
        triggerBackup();
      } else {
        console.log(`Deferring backup due to resource constraints: ${deferCheck.reason}`);
        // Log the resource state for debugging
        console.debug('Resource state:', JSON.stringify(deferCheck.systemState));

        // Add to missed backups queue
        const schedule = await getSchedule();
        const missedBackup = await deferBackup(schedule);
        console.log(`Added to missed backups queue with ID: ${missedBackup.id}`);
      }
    } else {
      console.log('No backup due at this time');
    }
  } catch (error) {
    console.error('Failed to check if backup is due:', error);
  }
}

/**
 * Trigger a scheduled backup
 * @returns {Promise<void>}
 */
export async function triggerBackup() {
  try {
    console.log('Triggering scheduled backup');

    // Send message to background script to perform backup
    chrome.runtime.sendMessage({ action: 'scheduledBackup' }, async (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error triggering backup:', chrome.runtime.lastError);
        return;
      }

      if (response && response.status === 'ok') {
        console.log('Scheduled backup completed successfully');

        // Update last backup time and calculate next backup time
        await updateBackupTime();
      } else {
        console.error('Scheduled backup failed:', response?.error || 'Unknown error');
      }
    });
  } catch (error) {
    console.error('Failed to trigger backup:', error);
  }
}

/**
 * Check for backups that need to be retried and trigger them
 * @returns {Promise<void>}
 */
export async function checkAndTriggerRetries() {
  try {
    // Get backups that are due for retry
    const backupsDueForRetry = await getBackupsDueForRetry();

    if (backupsDueForRetry.length === 0) {
      console.log('No backups due for retry');
      return;
    }

    console.log(`Found ${backupsDueForRetry.length} backups due for retry`);

    // Use resource-aware batch processing for retries
    const result = await processBatch(backupsDueForRetry, triggerBackupRetry, {
      throttleDelay: 500, // Add delay between retries to avoid overloading the system
      checkResources: true, // Check system resources before processing
      batchSize: 3, // Process in small batches
    });

    console.log(`Processed ${result.processed} of ${result.total} backup retries`);

    if (result.failed > 0) {
      console.warn(`Failed to process ${result.failed} backup retries`);
    }

    if (result.reason) {
      console.log(`Processing stopped: ${result.reason}`);
    }
  } catch (error) {
    console.error('Failed to check for backups to retry:', error);
  }
}

/**
 * Trigger a retry for a specific backup
 * @param {Object} backup The backup metadata
 * @returns {Promise<void>}
 */
export async function triggerBackupRetry(backup) {
  try {
    console.log(
      `Checking resources before triggering retry for backup ${backup.id} (attempt ${backup.attempt}/${backup.maxAttempts})`,
    );

    // Check if system resources allow for retry
    const resourceCheck = await canPerformOperation(RETRY_RESOURCE_CHECK_OPTIONS);

    if (!resourceCheck.isSafe) {
      console.log(`Deferring backup retry due to resource constraints: ${resourceCheck.reason}`);
      // Log the resource state for debugging
      console.debug('Resource state:', JSON.stringify(resourceCheck.systemState));

      // We'll check again on the next retry alarm cycle
      return;
    }

    console.log(`System resources are sufficient, triggering retry for backup ${backup.id}`);

    // Update backup status to in_progress
    const updatedBackup = updateBackupMetadata(backup, {
      status: BACKUP_STATUS.IN_PROGRESS,
    });

    // Save the updated backup
    await saveBackup(updatedBackup);

    // Send message to background script to perform backup retry
    chrome.runtime.sendMessage(
      {
        action: 'scheduledBackup',
        scheduleId: backup.scheduleId,
        backupId: backup.id,
        attempt: backup.attempt,
      },
      async (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error triggering backup retry:', chrome.runtime.lastError);
          return;
        }

        if (response && response.status === 'ok') {
          console.log(`Backup retry for ${backup.id} completed successfully`);
        } else {
          console.error(
            `Backup retry for ${backup.id} failed:`,
            response?.error || 'Unknown error',
          );
        }
      },
    );
  } catch (error) {
    console.error(`Failed to trigger retry for backup ${backup.id}:`, error);
  }
}

/**
 * Update the alarm when schedule changes
 * @returns {Promise<void>}
 */
export async function updateBackupAlarm() {
  try {
    // Re-initialize the alarm system
    return await initializeBackupAlarms();
  } catch (error) {
    console.error('Failed to update backup alarm:', error);
  }
}
