// scheduler-backup-integration.test.js - Integration tests for scheduler and backup execution

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
  checkAndTriggerRetries,
  triggerBackupRetry,
} from '../lib/alarm-manager.js';

import {
  createBackupMetadata,
  updateBackupMetadata,
  getAllBackups,
  getBackupsByType,
  getBackupsBySchedule,
  getBackupsDueForRetry,
  scheduleBackupRetry,
  BACKUP_TYPES,
  BACKUP_STATUS,
} from '../lib/backup-metadata.js';

import { enforceRetentionPolicy } from '../lib/backup-metadata.js';

// Mock chrome API
global.chrome = {
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
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

describe('Scheduler and Backup Integration Tests', () => {
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

  describe('Schedule Creation and Backup Execution', () => {
    test('should create schedule and trigger backup when due', async () => {
      // Create a schedule
      const scheduleConfig = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 11, // Set to 11:00 (1 hour before our mocked current time)
        minute: 0,
        retentionCount: 10,
      };

      // Mock the settings to return our schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          ...scheduleConfig,
          nextBackupTime: new Date(2025, 6, 17, 11, 0, 0).toISOString(), // Today at 11:00 (1 hour ago)
        },
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

      // Mock successful backup response
      const callback = chrome.runtime.sendMessage.mock.calls[0][1];
      callback({
        status: 'ok',
        backupId: 'backup_123',
      });

      // Mock the storage to include our new backup
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({
          backups: [
            {
              id: 'backup_123',
              type: BACKUP_TYPES.SCHEDULED,
              scheduleId: 'schedule_123',
              status: BACKUP_STATUS.SUCCESS,
              timestamp: new Date().toISOString(),
            },
          ],
        });
      });

      // Check that next backup time was updated
      expect(setSettings).toHaveBeenCalled();
    });

    test('should handle backup failure and schedule retry', async () => {
      // Create a schedule
      const scheduleConfig = {
        id: 'schedule_123',
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 11, // Set to 11:00 (1 hour before our mocked current time)
        minute: 0,
        retentionCount: 10,
      };

      // Mock the settings to return our schedule
      getSettings.mockResolvedValue({
        backupSchedule: scheduleConfig,
      });

      // Mock chrome.runtime.sendMessage to simulate backup failure
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'scheduledBackup') {
          if (callback) {
            callback({
              status: 'error',
              error: 'Network error',
              backupId: 'backup_123',
            });
          }
        }
      });

      // Mock scheduleBackupRetry
      jest.spyOn(require('../lib/backup-metadata.js'), 'scheduleBackupRetry').mockResolvedValue({
        id: 'backup_123',
        attempt: 1,
        maxAttempts: 3,
        nextRetryTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      });

      // Trigger backup
      await triggerBackup();

      // Check that scheduleBackupRetry was called
      expect(require('../lib/backup-metadata.js').scheduleBackupRetry).toHaveBeenCalled();

      // Check that alarm was created for retry
      expect(chrome.alarms.create).toHaveBeenCalledWith(
        'backupRetry',
        expect.objectContaining({
          periodInMinutes: expect.any(Number),
        }),
      );
    });

    test('should retry failed backups when due', async () => {
      // Mock getBackupsDueForRetry to return a backup due for retry
      jest.spyOn(require('../lib/backup-metadata.js'), 'getBackupsDueForRetry').mockResolvedValue([
        {
          id: 'backup_123',
          scheduleId: 'schedule_123',
          attempt: 1,
          maxAttempts: 3,
          status: BACKUP_STATUS.RETRY_PENDING,
          nextRetryTime: new Date(2025, 6, 17, 11, 30, 0).toISOString(), // 30 minutes ago
        },
      ]);

      // Check and trigger retries
      await checkAndTriggerRetries();

      // Check that backup retry was triggered
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
          backupId: 'backup_123',
          attempt: 1,
        }),
        expect.any(Function),
      );
    });
  });

  describe('Backup Metadata and Retention Policy', () => {
    test('should create backup metadata with correct type and status', async () => {
      // Create backup metadata
      const backupMetadata = createBackupMetadata({
        type: BACKUP_TYPES.SCHEDULED,
        scheduleId: 'schedule_123',
        status: BACKUP_STATUS.SUCCESS,
        bookmarkCount: 100,
      });

      // Check that metadata has correct properties
      expect(backupMetadata).toHaveProperty('id');
      expect(backupMetadata.type).toBe(BACKUP_TYPES.SCHEDULED);
      expect(backupMetadata.scheduleId).toBe('schedule_123');
      expect(backupMetadata.status).toBe(BACKUP_STATUS.SUCCESS);
      expect(backupMetadata.bookmarkCount).toBe(100);
      expect(backupMetadata).toHaveProperty('timestamp');
    });

    test('should enforce retention policy after successful backup', async () => {
      // Create mock backups
      const mockBackups = [];

      // Create 15 scheduled backups for the same schedule
      for (let i = 1; i <= 15; i++) {
        mockBackups.push({
          id: `backup_${i}`,
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, i, 3, 0, 0).toISOString(), // July 1-15, 2025
        });
      }

      // Add a manual backup that should not be affected by retention policy
      mockBackups.push({
        id: 'manual_backup_1',
        type: BACKUP_TYPES.MANUAL,
        status: BACKUP_STATUS.SUCCESS,
        timestamp: new Date(2025, 6, 5, 12, 0, 0).toISOString(), // July 5, 2025
      });

      // Mock storage to return our backups
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: mockBackups });
      });

      // Set retention count to 10
      getSettings.mockResolvedValue({
        backupSchedule: {
          id: 'schedule_123',
          enabled: true,
          frequency: FREQUENCY_OPTIONS.DAILY,
          hour: 3,
          minute: 0,
          retentionCount: 10,
        },
      });

      // Mock successful backup
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'scheduledBackup') {
          if (callback) {
            callback({
              status: 'ok',
              backupId: 'new_backup',
            });
          }

          // After successful backup, enforce retention policy
          enforceRetentionPolicy('schedule_123', 10);
        }
      });

      // Trigger backup
      await triggerBackup();

      // Check that chrome.storage.local.set was called (to update backups)
      expect(chrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('Alarm Handling and Scheduling', () => {
    test('should initialize alarms on startup', async () => {
      // Initialize alarms
      await initializeBackupAlarms();

      // Check that alarms were created
      expect(chrome.alarms.create).toHaveBeenCalledWith(
        'scheduledBackup',
        expect.objectContaining({
          periodInMinutes: expect.any(Number),
        }),
      );

      expect(chrome.alarms.create).toHaveBeenCalledWith(
        'backupRetry',
        expect.objectContaining({
          periodInMinutes: expect.any(Number),
        }),
      );

      expect(chrome.alarms.create).toHaveBeenCalledWith(
        'missedBackup',
        expect.objectContaining({
          periodInMinutes: expect.any(Number),
        }),
      );
    });

    test('should handle different alarm types correctly', async () => {
      // Mock isBackupDue to return true
      jest.spyOn(require('../lib/scheduler.js'), 'isBackupDue').mockResolvedValue(true);

      // Mock getBackupsDueForRetry to return a backup
      jest.spyOn(require('../lib/backup-metadata.js'), 'getBackupsDueForRetry').mockResolvedValue([
        {
          id: 'backup_123',
          scheduleId: 'schedule_123',
          attempt: 1,
          maxAttempts: 3,
          status: BACKUP_STATUS.RETRY_PENDING,
          nextRetryTime: new Date(2025, 6, 17, 11, 30, 0).toISOString(), // 30 minutes ago
        },
      ]);

      // Handle scheduledBackup alarm
      await handleAlarm({ name: 'scheduledBackup' });

      // Check that checkAndTriggerBackup was called
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Reset mocks
      jest.clearAllMocks();

      // Handle backupRetry alarm
      await handleAlarm({ name: 'backupRetry' });

      // Check that checkAndTriggerRetries was called
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
          backupId: 'backup_123',
          attempt: 1,
        }),
        expect.any(Function),
      );

      // Reset mocks
      jest.clearAllMocks();

      // Handle missedBackup alarm
      await handleAlarm({ name: 'missedBackup' });

      // Check that processNextMissedBackup was called
      expect(require('../lib/adaptive-scheduler.js').processNextMissedBackup).toHaveBeenCalled();
    });

    test('should clear alarms when requested', async () => {
      // Clear alarms
      await clearBackupAlarms();

      // Check that alarms were cleared
      expect(chrome.alarms.clear).toHaveBeenCalledWith('scheduledBackup', expect.any(Function));

      expect(chrome.alarms.clear).toHaveBeenCalledWith('backupRetry', expect.any(Function));

      expect(chrome.alarms.clear).toHaveBeenCalledWith('missedBackup', expect.any(Function));
    });
  });
});
