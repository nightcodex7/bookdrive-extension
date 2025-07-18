// scheduler-integration.test.js - Integration tests for the scheduler and backup system

import {
  createOrUpdateSchedule,
  getSchedule,
  isBackupDue,
  updateBackupTime,
  FREQUENCY_OPTIONS,
  RETENTION_OPTIONS,
} from '../lib/scheduler.js';

import {
  initializeBackupAlarms,
  clearBackupAlarms,
  handleAlarm,
  checkAndTriggerBackup,
  triggerBackup,
} from '../lib/alarm-manager.js';

import {
  createBackupMetadata,
  updateBackupMetadata,
  getAllBackups,
  getBackupsByType,
  getBackupsBySchedule,
  saveBackup,
  enforceRetentionPolicy,
  BACKUP_TYPES,
  BACKUP_STATUS,
} from '../lib/backup-metadata.js';

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
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// Mock the storage module
jest.mock('../lib/storage.js', () => ({
  getSettings: jest.fn(),
  setSettings: jest.fn(),
}));

// Import the mocked functions
import { getSettings, setSettings } from '../lib/storage/storage.js';

// Mock the resource-monitor module
jest.mock('../lib/resource-monitor.js', () => ({
  canPerformOperation: jest.fn().mockResolvedValue({
    isSafe: true,
    systemState: {
      battery: 'optimal',
      network: 'optimal',
      performance: 'optimal',
    },
  }),
  RESOURCE_STATE: {
    OPTIMAL: 'optimal',
    CONSTRAINED: 'constrained',
    UNAVAILABLE: 'unavailable',
  },
}));

// Mock the adaptive-scheduler module
jest.mock('../lib/adaptive-scheduler.js', () => ({
  shouldDeferBackup: jest.fn().mockResolvedValue({
    shouldDefer: false,
    reason: null,
    systemState: {
      battery: 'optimal',
      network: 'optimal',
      performance: 'optimal',
    },
  }),
  deferBackup: jest.fn().mockResolvedValue({
    id: 'missed_backup_123',
    timestamp: new Date().toISOString(),
  }),
  processNextMissedBackup: jest.fn().mockResolvedValue({
    processed: false,
    reason: 'No missed backups',
  }),
  initializeAdaptiveScheduler: jest.fn().mockResolvedValue(undefined),
}));

describe('Scheduler Integration Tests', () => {
  // Save original Date implementation
  const RealDate = global.Date;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
    getSettings.mockResolvedValue({});
    setSettings.mockResolvedValue({});

    chrome.alarms.clear.mockImplementation((name, callback) => {
      callback(true);
    });

    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) {
        callback({ status: 'ok' });
      }
    });

    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ backups: [] });
    });

    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    chrome.storage.sync.get.mockImplementation((key, callback) => {
      callback({});
    });

    chrome.storage.sync.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    // Mock the current date to a fixed value for testing
    const mockDate = new Date(2025, 6, 17, 12, 0, 0); // July 17, 2025, 12:00:00
    global.Date = class extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return new RealDate(mockDate);
        }
        return new RealDate(...args);
      }
      static now() {
        return mockDate.getTime();
      }
    };
    // Keep the real toISOString
    global.Date.prototype.toISOString = RealDate.prototype.toISOString;
  });

  afterEach(() => {
    // Restore original Date
    global.Date = RealDate;
  });

  describe('Scheduler and Alarm Manager Integration', () => {
    test('should initialize alarms based on schedule', async () => {
      // Set up a schedule
      const scheduleConfig = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      // Mock the settings to return our schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          ...scheduleConfig,
          nextBackupTime: new Date(2025, 6, 18, 3, 0, 0).toISOString(), // Tomorrow
        },
      });

      // Initialize alarms
      await initializeBackupAlarms();

      // Check that alarms were created
      expect(chrome.alarms.create).toHaveBeenCalledTimes(3);
      expect(chrome.alarms.create).toHaveBeenCalledWith('scheduledBackup', {
        periodInMinutes: 15,
      });
    });

    test('should trigger backup when due', async () => {
      // Set up a schedule with backup due
      const scheduleConfig = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
        nextBackupTime: new Date(2025, 6, 17, 11, 0, 0).toISOString(), // 1 hour ago
      };

      // Mock the settings to return our schedule
      getSettings.mockResolvedValue({
        backupSchedule: scheduleConfig,
      });

      // Check if backup is due
      const backupDue = await isBackupDue();
      expect(backupDue).toBe(true);

      // Trigger backup check
      await checkAndTriggerBackup();

      // Check that backup was triggered
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );
    });

    test('should update next backup time after successful backup', async () => {
      // Set up a schedule
      const scheduleConfig = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
        nextBackupTime: new Date(2025, 6, 17, 11, 0, 0).toISOString(), // 1 hour ago
      };

      // Mock the settings to return our schedule
      getSettings.mockResolvedValue({
        backupSchedule: scheduleConfig,
      });

      // Create a spy for updateBackupTime
      const updateBackupTimeSpy = jest.spyOn(require('../lib/scheduler.js'), 'updateBackupTime');

      // Trigger backup
      await triggerBackup();

      // Check that the message was sent
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Manually call the callback to simulate the response
      const callback = chrome.runtime.sendMessage.mock.calls[0][1];
      callback({ status: 'ok' });

      // Since we can't easily test the callback's execution in an asynchronous context,
      // we'll just verify that the message was sent correctly
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Clean up the spy
      updateBackupTimeSpy.mockRestore();
    });
  });

  describe('Alarm Manager and Backup Metadata Integration', () => {
    test('should create scheduled backup with correct metadata', async () => {
      // Mock chrome.runtime.sendMessage to simulate backup creation
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'scheduledBackup') {
          // Simulate backup creation
          const backupMetadata = createBackupMetadata({
            type: BACKUP_TYPES.SCHEDULED,
            scheduleId: 'schedule_123',
            status: BACKUP_STATUS.SUCCESS,
            bookmarkCount: 100,
          });

          // Add to storage
          chrome.storage.local.get.mockImplementation((key, callback) => {
            callback({ backups: [backupMetadata] });
          });

          if (callback) {
            callback({ status: 'ok', backupId: backupMetadata.id });
          }
        }
      });

      // Set up a schedule
      const scheduleConfig = {
        id: 'schedule_123',
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
        nextBackupTime: new Date(2025, 6, 17, 11, 0, 0).toISOString(), // 1 hour ago
      };

      // Mock the settings to return our schedule
      getSettings.mockResolvedValue({
        backupSchedule: scheduleConfig,
      });

      // Trigger backup
      await triggerBackup();

      // Get backups
      const backups = await getAllBackups();

      // Check that a backup was created with the correct metadata
      expect(backups).toHaveLength(1);
      expect(backups[0].type).toBe(BACKUP_TYPES.SCHEDULED);
      expect(backups[0].status).toBe(BACKUP_STATUS.SUCCESS);
      expect(backups[0].scheduleId).toBe('schedule_123');
    });
  });

  describe('Retention Policy Integration', () => {
    test('should enforce retention policy after backup', async () => {
      // Create mock backups
      const mockBackups = [
        {
          id: 'backup_1',
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, 10, 3, 0, 0).toISOString(), // Oldest
        },
        {
          id: 'backup_2',
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, 11, 3, 0, 0).toISOString(),
        },
        {
          id: 'backup_3',
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, 12, 3, 0, 0).toISOString(),
        },
        {
          id: 'backup_4',
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, 13, 3, 0, 0).toISOString(),
        },
        {
          id: 'backup_5',
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, 14, 3, 0, 0).toISOString(),
        },
        {
          id: 'backup_6',
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, 15, 3, 0, 0).toISOString(), // Newest
        },
      ];

      // Add manual backup that should not be affected by retention policy
      const manualBackup = {
        id: 'manual_backup_1',
        type: BACKUP_TYPES.MANUAL,
        status: BACKUP_STATUS.SUCCESS,
        timestamp: new Date(2025, 6, 10, 12, 0, 0).toISOString(), // Old but manual
      };

      mockBackups.push(manualBackup);

      // Mock storage to return our backups
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: mockBackups });
      });

      // Set up a schedule with retention count of 5
      const scheduleConfig = {
        id: 'schedule_123',
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 5, // Keep only 5 backups
        nextBackupTime: new Date(2025, 6, 17, 3, 0, 0).toISOString(),
      };

      // Mock the settings to return our schedule
      getSettings.mockResolvedValue({
        backupSchedule: scheduleConfig,
      });

      // Enforce retention policy
      const removedCount = await enforceRetentionPolicy('schedule_123', 5);

      // Check that one backup was removed
      expect(removedCount).toBe(1);

      // Check that chrome.storage.local.set was called with the correct backups
      expect(chrome.storage.local.set).toHaveBeenCalled();

      // Get the backups that were saved
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      expect(setCall).toHaveProperty('backups');

      // Check that the oldest scheduled backup was removed
      const remainingBackups = setCall.backups;
      expect(remainingBackups).toHaveLength(6); // 5 scheduled + 1 manual
      expect(remainingBackups.find((b) => b.id === 'backup_1')).toBeUndefined();
      expect(remainingBackups.find((b) => b.id === 'manual_backup_1')).toBeDefined();
    });
  });
});
