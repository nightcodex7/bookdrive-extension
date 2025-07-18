// alarm-manager-adaptive.test.js - Tests for the alarm manager's adaptive scheduling integration

import {
  initializeBackupAlarms,
  handleAlarm,
  checkAndTriggerBackup,
  clearBackupAlarms,
} from '../lib/scheduling/alarm-manager.js';

import {
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
  initializeAdaptiveScheduler,
} from '../lib/scheduling/adaptive-scheduler.js';

import { isBackupDue, getSchedule } from '../lib/scheduling/scheduler.js';

// Mock dependencies
jest.mock('../lib/scheduling/adaptive-scheduler.js', () => ({
  shouldDeferBackup: jest.fn(),
  deferBackup: jest.fn(),
  processNextMissedBackup: jest.fn(),
  initializeAdaptiveScheduler: jest.fn(),
}));

jest.mock('../lib/scheduling/scheduler.js', () => ({
  isBackupDue: jest.fn(),
  getSchedule: jest.fn(),
  updateBackupTime: jest.fn(),
}));

// Mock chrome API
global.chrome = {
  alarms: {
    create: jest.fn(),
    clear: jest.fn((name, callback) => callback(true)),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
  },
};

describe('Alarm Manager Adaptive Scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
    it('should initialize adaptive scheduler', async () => {
      await initializeBackupAlarms();

      expect(initializeAdaptiveScheduler).toHaveBeenCalled();
    });

    it('should create missed backup alarm', async () => {
      await initializeBackupAlarms();

      expect(chrome.alarms.create).toHaveBeenCalledWith(
        'missedBackup',
        expect.objectContaining({
          periodInMinutes: expect.any(Number),
        }),
      );
    });
  });

  describe('handleAlarm', () => {
    it('should process missed backups when missedBackup alarm fires', () => {
      handleAlarm({ name: 'missedBackup' });

      expect(processNextMissedBackup).toHaveBeenCalled();
    });
  });

  describe('checkAndTriggerBackup', () => {
    it('should check if backup should be deferred', async () => {
      isBackupDue.mockResolvedValue(true);

      await checkAndTriggerBackup();

      expect(shouldDeferBackup).toHaveBeenCalled();
    });

    it('should trigger backup when resources are sufficient', async () => {
      isBackupDue.mockResolvedValue(true);
      shouldDeferBackup.mockResolvedValue({ shouldDefer: false });

      await checkAndTriggerBackup();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'scheduledBackup' }),
        expect.any(Function),
      );
    });

    it('should defer backup when resources are constrained', async () => {
      isBackupDue.mockResolvedValue(true);
      shouldDeferBackup.mockResolvedValue({
        shouldDefer: true,
        reason: 'Battery is low',
      });

      await checkAndTriggerBackup();

      expect(deferBackup).toHaveBeenCalled();
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('clearBackupAlarms', () => {
    it('should clear missed backup alarm', async () => {
      await clearBackupAlarms();

      expect(chrome.alarms.clear).toHaveBeenCalledWith('missedBackup', expect.any(Function));
    });
  });
});
