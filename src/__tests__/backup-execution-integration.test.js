// backup-execution-integration.test.js - Integration tests for backup execution

import {
  handleAlarm,
  checkAndTriggerBackup,
  triggerBackup,
  checkAndTriggerRetries,
  triggerBackupRetry,
} from '../lib/scheduling/alarm-manager.js';

import {
  getBackupsDueForRetry,
  scheduleBackupRetry,
  enforceRetentionPolicy,
  BACKUP_TYPES,
  BACKUP_STATUS,
} from '../lib/backup/backup-metadata.js';

import { getSchedule, isBackupDue, updateBackupTime } from '../lib/scheduling/scheduler.js';

import { canPerformOperation, RESOURCE_STATE } from '../lib/scheduling/resource-monitor.js';

import {
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
} from '../lib/scheduling/adaptive-scheduler.js';

// Mock all the modules
jest.mock('../lib/scheduling/scheduler.js');
jest.mock('../lib/backup/backup-metadata.js');
jest.mock('../lib/scheduling/resource-monitor.js');
jest.mock('../lib/scheduling/adaptive-scheduler.js');



describe('Backup Execution Integration Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
    chrome.alarms.clear.mockImplementation((name, callback) => {
      callback(true);
    });

    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) {
        callback({ status: 'ok' });
      }
    });

    // Default scheduler mock implementations
    getSchedule.mockResolvedValue({
      schedule: {
        enabled: true,
        frequency: 'daily',
        hour: 3,
        minute: 0,
        nextBackupTime: new Date(2025, 6, 18, 3, 0, 0).toISOString(),
      },
    });

    isBackupDue.mockResolvedValue(false);
    updateBackupTime.mockResolvedValue({
      enabled: true,
      frequency: 'daily',
      hour: 3,
      minute: 0,
      lastBackupTime: new Date().toISOString(),
      nextBackupTime: new Date(2025, 6, 18, 3, 0, 0).toISOString(),
    });

    // Default backup-metadata mock implementations
    getBackupsDueForRetry.mockResolvedValue([]);
    scheduleBackupRetry.mockImplementation((backupId) => {
      return Promise.resolve({
        id: backupId,
        attempt: 2,
        maxAttempts: 3,
        status: BACKUP_STATUS.RETRY_PENDING,
        nextRetryTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
      });
    });
    enforceRetentionPolicy.mockResolvedValue(0);

    // Default resource-monitor mock implementations
    canPerformOperation.mockResolvedValue({
      isSafe: true,
      systemState: {
        battery: RESOURCE_STATE.OPTIMAL,
        network: RESOURCE_STATE.OPTIMAL,
        performance: RESOURCE_STATE.OPTIMAL,
      },
    });

    // Default adaptive-scheduler mock implementations
    shouldDeferBackup.mockResolvedValue({
      shouldDefer: false,
      reason: null,
      systemState: {
        battery: RESOURCE_STATE.OPTIMAL,
        network: RESOURCE_STATE.OPTIMAL,
        performance: RESOURCE_STATE.OPTIMAL,
      },
    });
    deferBackup.mockResolvedValue({
      id: 'missed_backup_123',
      timestamp: new Date().toISOString(),
    });
    processNextMissedBackup.mockResolvedValue({
      processed: false,
      reason: 'No missed backups',
    });
  });

  describe('Alarm Handling and Backup Execution', () => {
    test('should handle scheduled backup alarm', () => {
      // Mock the alarm
      const alarm = { name: 'scheduledBackup' };

      // Handle the alarm
      handleAlarm(alarm);

      // Check that isBackupDue was called
      expect(isBackupDue).toHaveBeenCalled();
    });

    test('should handle retry alarm', () => {
      // Mock the alarm
      const alarm = { name: 'backupRetry' };

      // Handle the alarm
      handleAlarm(alarm);

      // Check that getBackupsDueForRetry was called
      expect(getBackupsDueForRetry).toHaveBeenCalled();
    });

    test('should handle missed backup alarm', () => {
      // Mock the alarm
      const alarm = { name: 'missedBackup' };

      // Handle the alarm
      handleAlarm(alarm);

      // Check that processNextMissedBackup was called
      expect(processNextMissedBackup).toHaveBeenCalled();
    });

    test('should ignore other alarms', () => {
      // Mock the alarm
      const alarm = { name: 'otherAlarm' };

      // Handle the alarm
      handleAlarm(alarm);

      // Check that none of the handlers were called
      expect(isBackupDue).not.toHaveBeenCalled();
      expect(getBackupsDueForRetry).not.toHaveBeenCalled();
      expect(processNextMissedBackup).not.toHaveBeenCalled();
    });
  });

  describe('Backup Execution and Resource Monitoring', () => {
    test('should trigger backup when due and resources are sufficient', async () => {
      // Mock backup is due
      isBackupDue.mockResolvedValue(true);

      // Mock system resources are sufficient
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: false,
        reason: null,
        systemState: {
          battery: RESOURCE_STATE.OPTIMAL,
          network: RESOURCE_STATE.OPTIMAL,
          performance: RESOURCE_STATE.OPTIMAL,
        },
      });

      // Check and trigger backup
      await checkAndTriggerBackup();

      // Check that backup was triggered
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );
    });

    test('should defer backup when resources are constrained', async () => {
      // Mock backup is due
      isBackupDue.mockResolvedValue(true);

      // Mock system resources are constrained
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: true,
        reason: 'Low battery',
        systemState: {
          battery: RESOURCE_STATE.CONSTRAINED,
          network: RESOURCE_STATE.OPTIMAL,
          performance: RESOURCE_STATE.OPTIMAL,
        },
      });

      // Check and trigger backup
      await checkAndTriggerBackup();

      // Check that backup was deferred
      expect(deferBackup).toHaveBeenCalled();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Retry Handling', () => {
    test('should trigger retries for backups due for retry', async () => {
      // Mock backups due for retry
      const mockBackups = [
        {
          id: 'backup_1',
          scheduleId: 'schedule_123',
          attempt: 1,
          maxAttempts: 3,
          status: BACKUP_STATUS.RETRY_PENDING,
        },
        {
          id: 'backup_2',
          scheduleId: 'schedule_123',
          attempt: 2,
          maxAttempts: 3,
          status: BACKUP_STATUS.RETRY_PENDING,
        },
      ];

      getBackupsDueForRetry.mockResolvedValue(mockBackups);

      // Check and trigger retries
      await checkAndTriggerRetries();

      // Check that each backup was retried
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'scheduledBackup',
          scheduleId: 'schedule_123',
          backupId: 'backup_1',
          attempt: 1,
        },
        expect.any(Function),
      );
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'scheduledBackup',
          scheduleId: 'schedule_123',
          backupId: 'backup_2',
          attempt: 2,
        },
        expect.any(Function),
      );
    });

    test('should defer retry when resources are constrained', async () => {
      // Mock backup due for retry
      const mockBackup = {
        id: 'backup_1',
        scheduleId: 'schedule_123',
        attempt: 1,
        maxAttempts: 3,
        status: BACKUP_STATUS.RETRY_PENDING,
      };

      // Mock system resources are constrained
      canPerformOperation.mockResolvedValue({
        isSafe: false,
        reason: 'Network unavailable',
        systemState: {
          battery: RESOURCE_STATE.OPTIMAL,
          network: RESOURCE_STATE.UNAVAILABLE,
          performance: RESOURCE_STATE.OPTIMAL,
        },
      });

      // Trigger retry
      await triggerBackupRetry(mockBackup);

      // Check that retry was deferred
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('Missed Backup Processing', () => {
    test('should process missed backup when resources are sufficient', async () => {
      // Mock a missed backup
      const missedBackup = {
        id: 'missed_backup_123',
        scheduleId: 'schedule_123',
        timestamp: new Date().toISOString(),
      };

      // Mock processNextMissedBackup to return a processed backup
      processNextMissedBackup.mockResolvedValue({
        processed: true,
        missedBackup,
      });

      // Handle missed backup alarm
      handleAlarm({ name: 'missedBackup' });

      // Check that processNextMissedBackup was called
      expect(processNextMissedBackup).toHaveBeenCalled();
    });
  });
});

