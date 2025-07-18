// resource-adaptive-integration.test.js - Integration tests for resource monitor and adaptive scheduler

import { canPerformOperation, getSystemState, RESOURCE_STATE } from '../lib/resource-monitor.js';

import {
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
  addMissedBackup,
  getMissedBackups,
} from '../lib/adaptive-scheduler.js';

import { checkAndTriggerBackup, triggerBackup, handleAlarm } from '../lib/alarm-manager.js';

import { getSchedule, updateBackupTime } from '../lib/scheduler.js';

// Mock navigator APIs
const originalNavigator = global.navigator;

// Mock chrome API
global.chrome = {
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
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
  },
};

// Mock storage module
jest.mock('../lib/storage.js', () => ({
  getSettings: jest.fn(),
  setSettings: jest.fn(),
}));

// Import the mocked functions
import { getSettings, setSettings } from '../lib/storage/storage.js';

describe('Resource Monitor and Adaptive Scheduler Integration Tests', () => {
  // Save original navigator implementation
  const mockStorage = {
    missedBackups: [],
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockStorage.missedBackups = [];

    // Default mock implementations
    getSettings.mockResolvedValue({
      backupSchedule: {
        id: 'schedule_123',
        enabled: true,
        frequency: 'daily',
        hour: 3,
        minute: 0,
        nextBackupTime: new Date(2025, 6, 17, 3, 0, 0).toISOString(),
      },
    });

    setSettings.mockResolvedValue({});

    // Mock chrome.storage.local.get
    chrome.storage.local.get.mockImplementation((key, callback) => {
      if (typeof key === 'object') {
        const result = {};
        const defaultValues = key;
        Object.keys(defaultValues).forEach((k) => {
          result[k] = mockStorage[k] !== undefined ? mockStorage[k] : defaultValues[k];
        });
        callback(result);
      } else {
        callback({ [key]: mockStorage[key] || [] });
      }
    });

    // Mock chrome.storage.local.set
    chrome.storage.local.set.mockImplementation((obj, callback) => {
      Object.keys(obj).forEach((key) => {
        mockStorage[key] = obj[key];
      });
      if (callback) callback();
    });

    // Mock navigator
    global.navigator = {
      ...originalNavigator,
      onLine: true,
      getBattery: jest.fn().mockResolvedValue({
        charging: true,
        level: 0.8,
        chargingTime: 3600,
        dischargingTime: Infinity,
      }),
      connection: {
        type: 'wifi',
        effectiveType: '4g',
        downlinkMax: 10,
        downlink: 5,
        rtt: 50,
        saveData: false,
      },
    };

    // Mock performance API
    global.performance = {
      now: jest.fn().mockReturnValue(Date.now()),
      memory: {
        totalJSHeapSize: 50000000,
        usedJSHeapSize: 25000000,
        jsHeapSizeLimit: 100000000,
      },
    };

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((callback) => {
      setTimeout(callback, 16);
      return 1;
    });
  });

  afterEach(() => {
    // Restore original navigator
    global.navigator = originalNavigator;
  });

  describe('Resource Monitoring and Backup Execution', () => {
    test('should execute backup when system resources are optimal', async () => {
      // Mock isBackupDue to return true
      jest.spyOn(require('../lib/scheduler.js'), 'isBackupDue').mockResolvedValue(true);

      // Check and trigger backup
      await checkAndTriggerBackup();

      // Check that backup was triggered
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );
    });

    test('should defer backup when battery is low', async () => {
      // Mock isBackupDue to return true
      jest.spyOn(require('../lib/scheduler.js'), 'isBackupDue').mockResolvedValue(true);

      // Mock battery to be low
      global.navigator.getBattery = jest.fn().mockResolvedValue({
        charging: false,
        level: 0.1, // 10% battery
        chargingTime: Infinity,
        dischargingTime: 1800,
      });

      // Check and trigger backup
      await checkAndTriggerBackup();

      // Check that backup was deferred (not triggered)
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Check that a missed backup was added
      expect(mockStorage.missedBackups.length).toBeGreaterThan(0);
    });

    test('should defer backup when network is offline', async () => {
      // Mock isBackupDue to return true
      jest.spyOn(require('../lib/scheduler.js'), 'isBackupDue').mockResolvedValue(true);

      // Mock network to be offline
      global.navigator.onLine = false;

      // Check and trigger backup
      await checkAndTriggerBackup();

      // Check that backup was deferred (not triggered)
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Check that a missed backup was added
      expect(mockStorage.missedBackups.length).toBeGreaterThan(0);
    });

    test('should defer backup when on a slow connection', async () => {
      // Mock isBackupDue to return true
      jest.spyOn(require('../lib/scheduler.js'), 'isBackupDue').mockResolvedValue(true);

      // Mock network to be slow
      global.navigator.connection = {
        type: 'cellular',
        effectiveType: '2g',
        downlinkMax: 0.5,
        downlink: 0.1,
        rtt: 1000,
        saveData: true,
      };

      // Check and trigger backup
      await checkAndTriggerBackup();

      // Check that backup was deferred (not triggered)
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Check that a missed backup was added
      expect(mockStorage.missedBackups.length).toBeGreaterThan(0);
    });
  });

  describe('Missed Backup Processing', () => {
    test('should process missed backup when resources are optimal', async () => {
      // Add a missed backup
      await addMissedBackup({
        scheduleId: 'schedule_123',
        scheduledTime: new Date(2025, 6, 16, 3, 0, 0).toISOString(), // Yesterday
      });

      // Verify the missed backup was added
      expect(mockStorage.missedBackups.length).toBe(1);

      // Process missed backups
      await processNextMissedBackup();

      // Check that a message was sent to trigger the backup
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
          scheduleId: 'schedule_123',
        }),
      );

      // Check that the missed backup was removed from the queue
      expect(mockStorage.missedBackups.length).toBe(0);
    });

    test('should not process missed backup when resources are constrained', async () => {
      // Add a missed backup
      await addMissedBackup({
        scheduleId: 'schedule_123',
        scheduledTime: new Date(2025, 6, 16, 3, 0, 0).toISOString(), // Yesterday
      });

      // Mock battery to be low
      global.navigator.getBattery = jest.fn().mockResolvedValue({
        charging: false,
        level: 0.1, // 10% battery
        chargingTime: Infinity,
        dischargingTime: 1800,
      });

      // Process missed backups
      await processNextMissedBackup();

      // Check that no message was sent to trigger the backup
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
        }),
      );

      // Check that the missed backup is still in the queue
      expect(mockStorage.missedBackups.length).toBe(1);
    });

    test('should process missed backup when alarm is triggered', async () => {
      // Add a missed backup
      await addMissedBackup({
        scheduleId: 'schedule_123',
        scheduledTime: new Date(2025, 6, 16, 3, 0, 0).toISOString(), // Yesterday
      });

      // Handle missed backup alarm
      await handleAlarm({ name: 'missedBackup' });

      // Check that a message was sent to trigger the backup
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
          scheduleId: 'schedule_123',
        }),
      );

      // Check that the missed backup was removed from the queue
      expect(mockStorage.missedBackups.length).toBe(0);
    });
  });

  describe('System State Transitions', () => {
    test('should defer backup when system transitions to constrained state', async () => {
      // Mock isBackupDue to return true
      jest.spyOn(require('../lib/scheduler.js'), 'isBackupDue').mockResolvedValue(true);

      // First check with optimal resources
      await checkAndTriggerBackup();

      // Check that backup was triggered
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Reset mocks
      jest.clearAllMocks();

      // Mock isBackupDue to return true again
      jest.spyOn(require('../lib/scheduler.js'), 'isBackupDue').mockResolvedValue(true);

      // Now transition to constrained state
      global.navigator.getBattery = jest.fn().mockResolvedValue({
        charging: false,
        level: 0.1, // 10% battery
        chargingTime: Infinity,
        dischargingTime: 1800,
      });

      // Check and trigger backup again
      await checkAndTriggerBackup();

      // Check that backup was deferred (not triggered)
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Check that a missed backup was added
      expect(mockStorage.missedBackups.length).toBeGreaterThan(0);
    });

    test('should process missed backups when system transitions from constrained to optimal', async () => {
      // Add a missed backup
      await addMissedBackup({
        scheduleId: 'schedule_123',
        scheduledTime: new Date(2025, 6, 16, 3, 0, 0).toISOString(), // Yesterday
      });

      // Mock battery to be low
      global.navigator.getBattery = jest.fn().mockResolvedValue({
        charging: false,
        level: 0.1, // 10% battery
        chargingTime: Infinity,
        dischargingTime: 1800,
      });

      // Process missed backups
      await processNextMissedBackup();

      // Check that no message was sent to trigger the backup
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
        }),
      );

      // Check that the missed backup is still in the queue
      expect(mockStorage.missedBackups.length).toBe(1);

      // Reset mocks
      jest.clearAllMocks();

      // Now transition to optimal state
      global.navigator.getBattery = jest.fn().mockResolvedValue({
        charging: true,
        level: 0.8,
        chargingTime: 3600,
        dischargingTime: Infinity,
      });

      // Process missed backups again
      await processNextMissedBackup();

      // Check that a message was sent to trigger the backup
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
          scheduleId: 'schedule_123',
        }),
      );

      // Check that the missed backup was removed from the queue
      expect(mockStorage.missedBackups.length).toBe(0);
    });
  });
});
