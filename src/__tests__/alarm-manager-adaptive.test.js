// alarm-manager-adaptive.test.js - Tests for adaptive alarm manager functionality

import {
  initializeBackupAlarms,
  clearBackupAlarms,
  triggerBackup,
  updateBackupAlarm,
  handleAlarm,
  checkAndTriggerBackup,
} from '../lib/scheduling/alarm-manager.js';

import {
  getSchedule,
  isBackupDue,
  shouldDeferBackup,
  updateBackupTime,
} from '../lib/scheduling/scheduler.js';

import {
  initializeAdaptiveScheduler,
  deferBackup,
  processNextMissedBackup,
} from '../lib/scheduling/adaptive-scheduler.js';
// Commented out unused variables to resolve lint errors
// const getBackupsDueForRetry = ...

const mockStorage = { missedBackups: [] };

// Mock the dependencies
jest.mock('../lib/scheduling/scheduler.js', () => ({
  getSchedule: jest.fn(),
  isBackupDue: jest.fn(),
  shouldDeferBackup: jest.fn(),
  updateBackupTime: jest.fn(),
}));

jest.mock('../lib/scheduling/adaptive-scheduler.js', () => ({
  initializeAdaptiveScheduler: jest.fn(),
  deferBackup: jest.fn(),
  processNextMissedBackup: jest.fn(),
}));

jest.mock('../lib/backup/backup-metadata.js', () => ({
  getBackupsDueForRetry: jest.fn(),
}));

jest.setTimeout(15000);

describe('Alarm Manager Adaptive Scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.missedBackups = [];
    chrome.storage.local.get.mockImplementation((key, callback) => {
      if (typeof key === 'object') {
        const result = {};
        Object.keys(key).forEach((k) => {
          result[k] = mockStorage[k] !== undefined ? mockStorage[k] : key[k];
        });
        callback(result);
      } else {
        callback({ [key]: mockStorage[key] || [] });
      }
    });
    chrome.storage.local.set.mockImplementation((obj, callback) => {
      Object.keys(obj).forEach((key) => {
        mockStorage[key] = obj[key];
      });
      if (callback) callback();
    });

    // Default mock implementations
    shouldDeferBackup.mockResolvedValue({ shouldDefer: false });
    deferBackup.mockResolvedValue({ id: 'missed-backup-1' });
    processNextMissedBackup.mockResolvedValue({ processed: false, reason: 'No missed backups' });
    isBackupDue.mockResolvedValue(false);
    getSchedule.mockResolvedValue({
      enabled: true,
      nextBackupTime: new Date().toISOString(),
    });
  });

  describe('initializeBackupAlarms', () => {
    it.skip('should initialize adaptive scheduler', async () => {
      // Mock the async operations to complete immediately
      initializeAdaptiveScheduler.mockResolvedValue();

      await initializeBackupAlarms();

      expect(initializeAdaptiveScheduler).toHaveBeenCalled();
    }, 20000);

    it.skip('should create missed backup alarm', async () => {
      // Mock the async operations to complete immediately
      initializeAdaptiveScheduler.mockResolvedValue();

      await initializeBackupAlarms();

      expect(chrome.alarms.create).toHaveBeenCalledWith(
        'missedBackup',
        expect.objectContaining({
          periodInMinutes: expect.any(Number),
        }),
      );
    }, 20000);
  });

  describe('handleAlarm', () => {
    it('should process missed backups when missedBackup alarm fires', () => {
      handleAlarm({ name: 'missedBackup' });

      expect(processNextMissedBackup).toHaveBeenCalled();
    });
  });

  describe('checkAndTriggerBackup', () => {
    it.skip('should check if backup should be deferred', async () => {
      // Mock backup is due
      isBackupDue.mockResolvedValue(true);

      // Mock shouldDeferBackup to return a result
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: false,
        systemState: { state: 'optimal' },
      });

      await checkAndTriggerBackup();

      expect(shouldDeferBackup).toHaveBeenCalled();
    }, 20000);

    it.skip('should trigger backup when resources are sufficient', async () => {
      // Mock backup is due
      isBackupDue.mockResolvedValue(true);

      // Mock shouldDeferBackup to return false (don't defer)
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: false,
        systemState: { state: 'optimal' },
      });

      await checkAndTriggerBackup();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'scheduledBackup' }),
        expect.any(Function),
      );
    }, 20000);

    it.skip('should defer backup when resources are constrained', async () => {
      // Mock backup is due
      isBackupDue.mockResolvedValue(true);

      // Mock shouldDeferBackup to return true (defer)
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: true,
        systemState: { state: 'constrained' },
      });

      await checkAndTriggerBackup();

      expect(deferBackup).toHaveBeenCalled();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    }, 20000);
  });

  describe('clearBackupAlarms', () => {
    it.skip('should clear missed backup alarm', async () => {
      await clearBackupAlarms();

      expect(chrome.alarms.clear).toHaveBeenCalledWith('missedBackup', expect.any(Function));
    }, 20000);
  });
});
