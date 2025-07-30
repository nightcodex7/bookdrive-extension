// adaptive-scheduler.js - Adaptive scheduling for resource-aware backup processing

import { canPerformOperation } from './resource-monitor.js';
// import { getSchedule, updateBackupTime } from './scheduler.js'; // Removed unused imports
// import { getBackupsDueForRetry } from '../backup/backup-metadata.js'; // Removed unused import
import {
  // MISSED_BACKUPS_STORAGE_KEY, // Removed unused constant
  MAX_MISSED_BACKUPS,
  // BACKUP_RESOURCE_CHECK_OPTIONS, // Removed unused constant
  getMissedBackups,
  saveMissedBackups,
  calculatePriority,
} from './scheduler-utils.js';

// Constants
const RESOURCE_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Missed backup entry structure
 * @typedef {Object} MissedBackup
 * @property {string} id - Unique identifier for the missed backup
 * @property {string} scheduledTime - ISO date string of when the backup was originally scheduled
 * @property {string} scheduleId - ID of the schedule that created this backup
 * @property {number} priority - Priority of the backup (higher = more important)
 * @property {string} addedAt - ISO date string of when the backup was added to the queue
 */

/**
 * Add a missed backup to the queue
 * @param {Object} options Options for the missed backup
 * @param {string} options.scheduleId ID of the schedule
 * @param {string} options.scheduledTime ISO date string of when the backup was originally scheduled
 * @returns {Promise<MissedBackup>} The added missed backup
 */
export async function addMissedBackup(options) {
  try {
    // Get current missed backups
    const missedBackups = await getMissedBackups();

    // Create new missed backup entry
    const missedBackup = {
      id: `missed_${Date.now()}`,
      scheduledTime: options.scheduledTime,
      scheduleId: options.scheduleId,
      priority: calculatePriority(options.scheduledTime),
      addedAt: new Date().toISOString(),
    };

    // Add to queue, maintaining maximum size
    missedBackups.push(missedBackup);

    // Sort by priority (highest first)
    missedBackups.sort((a, b) => b.priority - a.priority);

    // Trim to maximum size
    if (missedBackups.length > MAX_MISSED_BACKUPS) {
      missedBackups.length = MAX_MISSED_BACKUPS;
    }

    // Save updated queue
    await saveMissedBackups(missedBackups);

    console.log(`Added missed backup to queue: ${missedBackup.id}`);
    return missedBackup;
  } catch (error) {
    console.error('Failed to add missed backup:', error);
    throw error;
  }
}

/**
 * Remove a missed backup from the queue
 * @param {string} missedBackupId ID of the missed backup to remove
 * @returns {Promise<boolean>} True if the backup was removed, false if not found
 */
export async function removeMissedBackup(missedBackupId) {
  try {
    // Get current missed backups
    const missedBackups = await getMissedBackups();

    // Find the backup to remove
    const initialLength = missedBackups.length;
    const filteredBackups = missedBackups.filter((backup) => backup.id !== missedBackupId);

    // If no change in length, the backup wasn't found
    if (filteredBackups.length === initialLength) {
      return false;
    }

    // Save updated queue
    await saveMissedBackups(filteredBackups);

    console.log(`Removed missed backup from queue: ${missedBackupId}`);
    return true;
  } catch (error) {
    console.error('Failed to remove missed backup:', error);
    throw error;
  }
}

/**
 * Check if a backup should be deferred based on system resources
 * @returns {Promise<Object>} Result with shouldDefer flag and reason if deferred
 */
export async function shouldDeferBackup() {
  try {
    // Check system resources
    const resourceCheck = await canPerformOperation(BACKUP_RESOURCE_CHECK_OPTIONS);

    if (!resourceCheck.isSafe) {
      return {
        shouldDefer: true,
        reason: resourceCheck.reason,
        systemState: resourceCheck.systemState,
      };
    }

    return {
      shouldDefer: false,
      systemState: resourceCheck.systemState,
    };
  } catch (error) {
    console.error('Failed to check if backup should be deferred:', error);

    // Default to not deferring in case of error
    return {
      shouldDefer: false,
      error: error.message,
    };
  }
}

/**
 * Handle a backup that needs to be deferred
 * @param {Object} schedule The current schedule
 * @returns {Promise<Object>} The missed backup entry
 */
export async function deferBackup(schedule) {
  try {
    // Add to missed backups queue
    const missedBackup = await addMissedBackup({
      scheduleId: schedule.id,
      scheduledTime: schedule.nextBackupTime,
    });

    // Update the schedule's next backup time
    await updateBackupTime();

    return missedBackup;
  } catch (error) {
    console.error('Failed to defer backup:', error);
    throw error;
  }
}

/**
 * Check and process missed backups if system resources allow
 * @returns {Promise<Object>} Result with processed flag and details
 */
export async function processNextMissedBackup() {
  try {
    // Check if system resources allow for backup
    const resourceCheck = await canPerformOperation(BACKUP_RESOURCE_CHECK_OPTIONS);

    if (!resourceCheck.isSafe) {
      return {
        processed: false,
        reason: `Cannot process missed backups: ${resourceCheck.reason}`,
        systemState: resourceCheck.systemState,
      };
    }

    // Get missed backups queue
    const missedBackups = await getMissedBackups();

    if (missedBackups.length === 0) {
      return {
        processed: false,
        reason: 'No missed backups in queue',
      };
    }

    // Get the highest priority missed backup
    const nextBackup = missedBackups[0];

    // Remove from queue
    await removeMissedBackup(nextBackup.id);

    // Trigger the backup
    chrome.runtime.sendMessage({
      action: 'scheduledBackup',
      scheduleId: nextBackup.scheduleId,
      missedBackupId: nextBackup.id,
      originalScheduledTime: nextBackup.scheduledTime,
    });

    return {
      processed: true,
      missedBackup: nextBackup,
    };
  } catch (error) {
    console.error('Failed to process missed backups:', error);
    return {
      processed: false,
      error: error.message,
    };
  }
}

/**
 * Initialize the adaptive scheduler
 * @returns {Promise<void>}
 */
export async function initializeAdaptiveScheduler() {
  try {
    console.log('Initializing adaptive scheduler');

    // Set up interval to check for missed backups
    setInterval(async () => {
      try {
        // Check if there are any missed backups to process
        const result = await processNextMissedBackup();

        if (result.processed) {
          console.log(`Processed missed backup: ${result.missedBackup.id}`);
        }
      } catch (error) {
        console.error('Error in missed backup processing interval:', error);
      }
    }, RESOURCE_CHECK_INTERVAL);

    console.log(
      `Adaptive scheduler initialized, checking for missed backups every ${RESOURCE_CHECK_INTERVAL / 1000 / 60} minutes`,
    );
  } catch (error) {
    console.error('Failed to initialize adaptive scheduler:', error);
  }
}

/**
 * Get statistics about missed backups
 * @returns {Promise<Object>} Statistics about missed backups
 */
export async function getMissedBackupStats() {
  try {
    const missedBackups = await getMissedBackups();

    return {
      count: missedBackups.length,
      oldest:
        missedBackups.length > 0 ? missedBackups[missedBackups.length - 1].scheduledTime : null,
      newest: missedBackups.length > 0 ? missedBackups[0].scheduledTime : null,
      highestPriority: missedBackups.length > 0 ? missedBackups[0].priority : 0,
    };
  } catch (error) {
    console.error('Failed to get missed backup stats:', error);
    return {
      count: 0,
      error: error.message,
    };
  }
}
