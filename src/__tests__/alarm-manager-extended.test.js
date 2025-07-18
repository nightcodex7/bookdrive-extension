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
} from '../lib/alarm-manager.js';

import { getSchedule, isBackupDue, updateBackupTime } from '../lib/scheduler.js';

import {
  getBackupsDueForRetry,
  BACKUP_STATUS,
  updateBackupMetadata,
  saveBackup,
} from '../lib/backup-metadata.js';

import { canPerformOperation, RESOURCE_STATE } from '../lib/resource-monitor.js';

import {
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
  initializeAdaptiveScheduler,
} from '../lib/adaptive-scheduler.js';

// Mock the scheduler module
jest.mock('../lib/scheduler.js');

// Mock the backup-metadata module
jest.mock('../lib/backup-metadata.js');

// Mock the resource-monitor module
jest.mock('../lib/resource-monitor.js');

// Mock the adaptive-scheduler module
jest.mock('../lib/adaptive-scheduler.js');

// Mock chrome API
global.chrome = {
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
  },
  runtime: {
    sendMessage: jest.fn(),
    lastError: null,
  },
};

describe('Alarm Manager Extended Tests', () => {
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
      enabled: true,
      frequency: 'daily',
      hour: 3,
      minute: 0,
      nextBackupTime: new Date(2025, 6, 18, 3, 0, 0).toISOString(),
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
  });

  describe('initializeBackupAlarms', () => {
    test('should create all three types of alarms when scheduling is enabled', async () => {
      await initializeBackupAlarms();

      expect(chrome.alarms.clear).toHaveBeenCalledTimes(3);
      expect(chrome.alarms.create).toHaveBeenCalledTimes(3);

      // Check that the main backup alarm was created
      expect(chrome.alarms.create).toHaveBeenCalledWith('scheduledBackup', {
        periodInMinutes: 15,
      });

      // Check that the retry alarm was created
      expect(chrome.alarms.create).toHaveBeenCalledWith('backupRetry', {
        periodInMinutes: 2,
      });

      // Check that the missed backup alarm was created
      expect(chrome.alarms.create).toHaveBeenCalledWith('missedBackup', {
        periodInMinutes: 10,
      });

      // Check that the adaptive scheduler was initialized
      expect(initializeAdaptiveScheduler).toHaveBeenCalled();
    });

    test('should defer backup when system resources are constrained', async () => {
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

      await initializeBackupAlarms();

      expect(isBackupDue).toHaveBeenCalled();
      expect(shouldDeferBackup).toHaveBeenCalled();
      expect(deferBackup).toHaveBeenCalled();
    });
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
