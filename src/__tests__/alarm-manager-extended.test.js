// alarm-manager-extended.test.js - Additional tests for the alarm manager module

import {
  initializeBackupAlarms,
  clearBackupAlarms,
  handleAlarm,
  checkAndTriggerBackup,
  triggerBackup,
  updateBackupAlarm,
  checkAndTriggerRetries,
  triggerBackupRetry,
} from '../lib/scheduling/alarm-manager.js';

import { getSchedule, isBackupDue, updateBackupTime } from '../lib/scheduling/scheduler.js';

import {
  getBackupsDueForRetry,
  BACKUP_STATUS,
  updateBackupMetadata,
  saveBackup,
} from '../lib/backup/backup-metadata.js';

import { canPerformOperation, RESOURCE_STATE } from '../lib/scheduling/resource-monitor.js';

import {
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
  initializeAdaptiveScheduler,
} from '../lib/scheduling/adaptive-scheduler.js';

const mockStorage = { missedBackups: [] };

// Mock the scheduler module
jest.mock('../lib/scheduling/scheduler.js');

// Mock the backup-metadata module
jest.mock('../lib/backup/backup-metadata.js');

// Mock the resource-monitor module
jest.mock('../lib/scheduling/resource-monitor.js');

// Mock the adaptive-scheduler module
jest.mock('../lib/scheduling/adaptive-scheduler.js');

jest.setTimeout(15000);

describe('Alarm Manager Extended Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockStorage.missedBackups = [];

    // Default mock implementations
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
    updateBackupMetadata.mockImplementation((backup, updates) => ({
      ...backup,
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
    saveBackup.mockImplementation((backup) => Promise.resolve(backup));

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
    initializeAdaptiveScheduler.mockResolvedValue(undefined);

    // Mock Chrome APIs after clearAllMocks
    chrome.alarms.create.mockImplementation((name, alarmInfo) => {
      return Promise.resolve();
    });

    chrome.alarms.clear.mockImplementation((name) => {
      return Promise.resolve(true);
    });

    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) callback({ status: 'ok' });
    });

    chrome.storage.local.get.mockImplementation((key, callback) => {
      if (typeof key === 'object') {
        const result = {};
        Object.keys(key).forEach(k => {
          result[k] = mockStorage[k] !== undefined ? mockStorage[k] : key[k];
        });
        callback(result);
      } else {
        callback({ [key]: mockStorage[key] || [] });
      }
    });
    chrome.storage.local.set.mockImplementation((obj, callback) => {
      Object.keys(obj).forEach(key => {
        mockStorage[key] = obj[key];
      });
      if (callback) callback();
    });
  });

  describe('initializeBackupAlarms', () => {
    test.skip('should create all three types of alarms when scheduling is enabled', async () => {
      await initializeBackupAlarms();

      expect(chrome.alarms.clear).toHaveBeenCalledTimes(3);
      expect(chrome.alarms.create).toHaveBeenCalledWith('scheduledBackup', expect.any(Object));
      expect(chrome.alarms.create).toHaveBeenCalledWith('backupRetry', expect.any(Object));
      expect(chrome.alarms.create).toHaveBeenCalledWith('missedBackup', expect.any(Object));
    }, 20000);

    test.skip('should defer backup when system resources are constrained', async () => {
      // Mock backup is due
      isBackupDue.mockResolvedValue(true);
      
      // Mock shouldDeferBackup to return true (defer)
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: true,
        systemState: { state: 'constrained' },
      });

      await initializeBackupAlarms();

      expect(shouldDeferBackup).toHaveBeenCalled();
      expect(deferBackup).toHaveBeenCalled();
    }, 20000);
  });

  describe('handleAlarm', () => {
    test('should handle missed backup alarm', () => {
      handleAlarm({ name: 'missedBackup' });

      expect(processNextMissedBackup).toHaveBeenCalled();
    });

    test('should handle retry alarm', () => {
      handleAlarm({ name: 'backupRetry' });

      // We can't directly test checkAndTriggerRetries is called since it's not exported as a mock
      // Instead, we can check that getBackupsDueForRetry is called, which is part of that function
      expect(getBackupsDueForRetry).toHaveBeenCalled();
    });
  });

  describe('checkAndTriggerRetries', () => {
    test('should trigger retry for each backup due for retry', async () => {
      // Mock backups due for retry
      const mockBackups = [
        {
          id: 'backup_1',
          scheduleId: 'schedule_123',
          attempt: 1,
          maxAttempts: 3,
          status: 'retry_pending',
        },
        {
          id: 'backup_2',
          scheduleId: 'schedule_123',
          attempt: 2,
          maxAttempts: 3,
          status: 'retry_pending',
        },
      ];

      getBackupsDueForRetry.mockResolvedValue(mockBackups);

      await checkAndTriggerRetries();

      // Should update status to in_progress for each backup
      expect(updateBackupMetadata).toHaveBeenCalledTimes(2);
      expect(updateBackupMetadata).toHaveBeenCalledWith(mockBackups[0], { status: 'in_progress' });
      expect(updateBackupMetadata).toHaveBeenCalledWith(mockBackups[1], { status: 'in_progress' });

      // Should save each updated backup
      expect(saveBackup).toHaveBeenCalledTimes(2);

      // Should send message to trigger retry for each backup
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

    test('should defer retry when system resources are constrained', async () => {
      // Mock backups due for retry
      const mockBackups = [
        {
          id: 'backup_1',
          scheduleId: 'schedule_123',
          attempt: 1,
          maxAttempts: 3,
          status: 'retry_pending',
        },
      ];

      getBackupsDueForRetry.mockResolvedValue(mockBackups);

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

      await checkAndTriggerRetries();

      // Should not update or save any backups
      expect(updateBackupMetadata).not.toHaveBeenCalled();
      expect(saveBackup).not.toHaveBeenCalled();

      // Should not send any messages
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    test('should handle empty retry queue', async () => {
      getBackupsDueForRetry.mockResolvedValue([]);

      await checkAndTriggerRetries();

      // Should not update or save any backups
      expect(updateBackupMetadata).not.toHaveBeenCalled();
      expect(saveBackup).not.toHaveBeenCalled();

      // Should not send any messages
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('triggerBackupRetry', () => {
    test('should trigger retry for a specific backup', async () => {
      const mockBackup = {
        id: 'backup_1',
        scheduleId: 'schedule_123',
        attempt: 1,
        maxAttempts: 3,
        status: 'retry_pending',
      };

      await triggerBackupRetry(mockBackup);

      // Should update status to in_progress
      expect(updateBackupMetadata).toHaveBeenCalledWith(mockBackup, { status: 'in_progress' });

      // Should save the updated backup
      expect(saveBackup).toHaveBeenCalled();

      // Should send message to trigger retry
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          action: 'scheduledBackup',
          scheduleId: 'schedule_123',
          backupId: 'backup_1',
          attempt: 1,
        },
        expect.any(Function),
      );
    });

    test('should defer retry when system resources are constrained', async () => {
      const mockBackup = {
        id: 'backup_1',
        scheduleId: 'schedule_123',
        attempt: 1,
        maxAttempts: 3,
        status: 'retry_pending',
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

      await triggerBackupRetry(mockBackup);

      // Should not update or save any backups
      expect(updateBackupMetadata).not.toHaveBeenCalled();
      expect(saveBackup).not.toHaveBeenCalled();

      // Should not send any messages
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('checkAndTriggerBackup', () => {
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

      await checkAndTriggerBackup();

      expect(isBackupDue).toHaveBeenCalled();
      expect(shouldDeferBackup).toHaveBeenCalled();

      // Should send message to trigger backup
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );
    });

    test('should defer backup when due but resources are constrained', async () => {
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

      await checkAndTriggerBackup();

      expect(isBackupDue).toHaveBeenCalled();
      expect(shouldDeferBackup).toHaveBeenCalled();
      expect(deferBackup).toHaveBeenCalled();

      // Should not send message to trigger backup
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    test('should do nothing when no backup is due', async () => {
      // Mock no backup is due
      isBackupDue.mockResolvedValue(false);

      await checkAndTriggerBackup();

      expect(isBackupDue).toHaveBeenCalled();
      expect(shouldDeferBackup).not.toHaveBeenCalled();
      expect(deferBackup).not.toHaveBeenCalled();

      // Should not send message to trigger backup
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });
});
