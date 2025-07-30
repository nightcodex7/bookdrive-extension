// alarm-manager.test.js - Tests for the alarm manager module

import {
  initializeBackupAlarms,
  clearBackupAlarms,
  handleAlarm,
  triggerBackup,
  updateBackupAlarm,
} from '../lib/scheduling/alarm-manager.js';

import { getSchedule, isBackupDue, updateBackupTime } from '../lib/scheduling/scheduler.js';
import {
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
  initializeAdaptiveScheduler,
} from '../lib/scheduling/adaptive-scheduler.js';
import { getBackupsDueForRetry } from '../lib/backup/backup-metadata.js';

// Mock the dependencies
jest.mock('../lib/scheduling/scheduler.js', () => ({
  getSchedule: jest.fn(),
  isBackupDue: jest.fn(),
  updateBackupTime: jest.fn(),
}));

jest.mock('../lib/scheduling/adaptive-scheduler.js', () => ({
  shouldDeferBackup: jest.fn(),
  deferBackup: jest.fn(),
  processNextMissedBackup: jest.fn(),
  initializeAdaptiveScheduler: jest.fn(),
}));

jest.mock('../lib/backup/backup-metadata.js', () => ({
  getBackupsDueForRetry: jest.fn().mockResolvedValue([]),
  BACKUP_STATUS: {
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },
  updateBackupMetadata: jest.fn(),
  saveBackup: jest.fn(),
}));

// Mock chrome API
global.chrome = {
  alarms: {
    create: jest.fn(),
    clear: jest.fn((name, callback) => {
      if (callback) callback(true);
    }),
  },
  runtime: {
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ status: 'ok' });
    }),
    lastError: null,
  },
};

describe('Alarm Manager Module', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
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

    shouldDeferBackup.mockResolvedValue({
      shouldDefer: false,
      systemState: { state: 'optimal' },
    });

    deferBackup.mockResolvedValue({
      id: 'missed-backup-1',
      scheduleId: 'test-schedule',
      scheduledTime: new Date().toISOString(),
    });

    processNextMissedBackup.mockResolvedValue({
      processed: false,
      reason: 'No missed backups',
    });

    getBackupsDueForRetry.mockResolvedValue([]);
  });

  describe('initializeBackupAlarms', () => {
    test('should create alarm when scheduling is enabled', async () => {
      await initializeBackupAlarms();

      expect(chrome.alarms.clear).toHaveBeenCalledWith('scheduledBackup', expect.any(Function));
      expect(chrome.alarms.create).toHaveBeenCalledWith('scheduledBackup', {
        periodInMinutes: 15,
      });
    });

    test('should not create alarm when scheduling is disabled', async () => {
      getSchedule.mockResolvedValue({
        enabled: false,
      });

      await initializeBackupAlarms();

      expect(chrome.alarms.clear).toHaveBeenCalledWith('scheduledBackup', expect.any(Function));
      expect(chrome.alarms.create).not.toHaveBeenCalledWith('scheduledBackup', expect.any(Object));
    });

    test('should check if backup is due', async () => {
      isBackupDue.mockResolvedValue(true);
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: false,
        systemState: { state: 'optimal' },
      });

      // Mock console.log to verify it's called
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      await initializeBackupAlarms();

      expect(isBackupDue).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Backup is due now, checking system resources');
      expect(console.log).toHaveBeenCalledWith(
        'System resources are sufficient, triggering backup',
      );

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });

  describe('clearBackupAlarms', () => {
    test('should clear existing alarms', async () => {
      await clearBackupAlarms();

      expect(chrome.alarms.clear).toHaveBeenCalledWith('scheduledBackup', expect.any(Function));
      expect(chrome.alarms.clear).toHaveBeenCalledWith('backupRetry', expect.any(Function));
      expect(chrome.alarms.clear).toHaveBeenCalledWith('missedBackup', expect.any(Function));
    });
  });

  describe('handleAlarm', () => {
    test('should handle backup alarm', () => {
      // Mock console.log to verify it's called
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      handleAlarm({ name: 'scheduledBackup' });

      expect(console.log).toHaveBeenCalledWith('Backup alarm fired, checking if backup is due');

      // Restore console.log
      console.log = originalConsoleLog;
    });

    test('should handle retry alarm', () => {
      // Mock console.log to verify it's called
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      handleAlarm({ name: 'backupRetry' });

      expect(console.log).toHaveBeenCalledWith('Retry alarm fired, checking for backups to retry');

      // Restore console.log
      console.log = originalConsoleLog;
    });

    test('should handle missed backup alarm', () => {
      // Mock console.log to verify it's called
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      processNextMissedBackup.mockResolvedValue({
        processed: false,
        reason: 'No missed backups in queue',
      });

      handleAlarm({ name: 'missedBackup' });

      expect(console.log).toHaveBeenCalledWith(
        'Missed backup alarm fired, checking for missed backups to process',
      );

      // Restore console.log
      console.log = originalConsoleLog;
    });

    test('should do nothing for other alarm types', () => {
      // Mock console.log to verify it's not called
      const originalConsoleLog = console.log;
      console.log = jest.fn();

      handleAlarm({ name: 'otherAlarm' });

      expect(console.log).not.toHaveBeenCalled();

      // Restore console.log
      console.log = originalConsoleLog;
    });
  });

  describe('triggerBackup', () => {
    test('should send message to trigger backup', async () => {
      await triggerBackup();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );
    });

    test('should update backup time on successful backup', async () => {
      await triggerBackup();

      // The callback should have been called, which should update the backup time
      expect(updateBackupTime).toHaveBeenCalled();
    });

    test('should handle runtime errors', async () => {
      // Mock console.error to verify it's called
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Set up runtime error
      chrome.runtime.lastError = { message: 'Test error' };

      // Mock sendMessage to call the callback with the lastError set
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) callback();
      });

      await triggerBackup();

      expect(console.error).toHaveBeenCalledWith('Error triggering backup:', {
        message: 'Test error',
      });

      // Restore console.error and clear lastError
      console.error = originalConsoleError;
      chrome.runtime.lastError = null;
    });

    test('should handle backup failure', async () => {
      // Mock console.error to verify it's called
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Mock failed backup response
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (callback) {
          callback({ status: 'error', error: 'Backup failed' });
        }
      });

      await triggerBackup();

      expect(console.error).toHaveBeenCalledWith('Scheduled backup failed:', 'Backup failed');
      expect(updateBackupTime).not.toHaveBeenCalled();

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('updateBackupAlarm', () => {
    test('should not throw errors', async () => {
      // Just verify the function doesn't throw an error
      await expect(updateBackupAlarm()).resolves.not.toThrow();
    });
  });
});
