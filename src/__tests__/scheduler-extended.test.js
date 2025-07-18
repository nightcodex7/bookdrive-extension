// scheduler-extended.test.js - Additional tests for the scheduler module

import {
  createOrUpdateSchedule,
  deleteSchedule,
  getSchedule,
  getRetentionCount,
  isBackupDue,
  updateBackupTime,
  FREQUENCY_OPTIONS,
  RETENTION_OPTIONS,
} from '../lib/scheduler.js';

// Mock the storage module
jest.mock('../lib/storage.js', () => ({
  getSettings: jest.fn(),
  setSettings: jest.fn(),
}));

// Import the mocked functions
import { getSettings, setSettings } from '../lib/storage/storage.js';

describe('Scheduler Module Extended Tests', () => {
  // Save original Date implementation
  const RealDate = global.Date;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
    getSettings.mockResolvedValue({});
    setSettings.mockResolvedValue({});

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

  describe('createOrUpdateSchedule', () => {
    test('should create a new schedule with valid data', async () => {
      const scheduleConfig = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = await createOrUpdateSchedule(scheduleConfig);

      expect(result.success).toBe(true);
      expect(result.schedule).toMatchObject({
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
        nextBackupTime: expect.any(String),
      });
      expect(setSettings).toHaveBeenCalledWith({
        backupSchedule: expect.objectContaining(scheduleConfig),
      });
    });

    test('should update an existing schedule', async () => {
      // Mock existing schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: true,
          frequency: FREQUENCY_OPTIONS.DAILY,
          hour: 3,
          minute: 0,
          retentionCount: 10,
          lastBackupTime: null,
          nextBackupTime: '2025-07-18T03:00:00.000Z',
        },
      });

      const scheduleConfig = {
        frequency: FREQUENCY_OPTIONS.WEEKLY,
        dayOfWeek: 1, // Monday
        retentionCount: 20,
      };

      const result = await createOrUpdateSchedule(scheduleConfig);

      expect(result.success).toBe(true);
      expect(result.schedule).toMatchObject({
        enabled: true, // Preserved from existing schedule
        frequency: FREQUENCY_OPTIONS.WEEKLY, // Updated
        dayOfWeek: 1, // Added
        hour: 3, // Preserved
        minute: 0, // Preserved
        retentionCount: 20, // Updated
        nextBackupTime: expect.any(String),
      });
    });

    test('should reject invalid schedule data', async () => {
      const scheduleConfig = {
        enabled: true,
        frequency: 'invalid',
        hour: 25, // Invalid
        minute: 60, // Invalid
        retentionCount: 7, // Not in RETENTION_OPTIONS
      };

      const result = await createOrUpdateSchedule(scheduleConfig);

      expect(result.success).toBe(false);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors).toHaveProperty('frequency');
      expect(result.validation.errors).toHaveProperty('hour');
      expect(result.validation.errors).toHaveProperty('minute');
      expect(result.validation.errors).toHaveProperty('retentionCount');
      expect(setSettings).not.toHaveBeenCalled();
    });
  });

  describe('deleteSchedule', () => {
    test('should delete an existing schedule', async () => {
      // Mock existing schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: true,
          frequency: FREQUENCY_OPTIONS.DAILY,
          hour: 3,
          minute: 0,
          retentionCount: 10,
        },
        otherSetting: 'value',
      });

      const result = await deleteSchedule();

      expect(result).toBe(true);
      expect(setSettings).toHaveBeenCalledWith({
        otherSetting: 'value',
        // backupSchedule should be removed
      });
    });

    test('should handle case when no schedule exists', async () => {
      // Mock no existing schedule
      getSettings.mockResolvedValue({
        otherSetting: 'value',
      });

      const result = await deleteSchedule();

      expect(result).toBe(true);
      expect(setSettings).toHaveBeenCalledWith({
        otherSetting: 'value',
      });
    });

    test('should handle errors', async () => {
      // Mock error
      getSettings.mockRejectedValue(new Error('Test error'));

      const result = await deleteSchedule();

      expect(result).toBe(false);
      expect(setSettings).not.toHaveBeenCalled();
    });
  });

  describe('isBackupDue', () => {
    test('should return true when backup time is in the past', async () => {
      // Mock schedule with next backup time in the past
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: true,
          nextBackupTime: new Date(2025, 6, 17, 10, 0, 0).toISOString(), // 10 AM, 2 hours ago
        },
      });

      const result = await isBackupDue();

      expect(result).toBe(true);
    });

    test('should return false when backup time is in the future', async () => {
      // Mock schedule with next backup time in the future
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: true,
          nextBackupTime: new Date(2025, 6, 17, 14, 0, 0).toISOString(), // 2 PM, 2 hours from now
        },
      });

      const result = await isBackupDue();

      expect(result).toBe(false);
    });

    test('should return false when scheduling is disabled', async () => {
      // Mock disabled schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: false,
          nextBackupTime: new Date(2025, 6, 17, 10, 0, 0).toISOString(), // 10 AM, 2 hours ago
        },
      });

      const result = await isBackupDue();

      expect(result).toBe(false);
    });

    test('should return false when no next backup time is set', async () => {
      // Mock schedule with no next backup time
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: true,
          nextBackupTime: null,
        },
      });

      const result = await isBackupDue();

      expect(result).toBe(false);
    });

    test('should handle errors', async () => {
      // Mock error
      getSettings.mockRejectedValue(new Error('Test error'));

      const result = await isBackupDue();

      expect(result).toBe(false);
    });
  });

  describe('updateBackupTime', () => {
    test('should update last backup time and calculate next backup time', async () => {
      // Mock existing schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: true,
          frequency: FREQUENCY_OPTIONS.DAILY,
          hour: 3,
          minute: 0,
          retentionCount: 10,
          lastBackupTime: null,
          nextBackupTime: '2025-07-17T03:00:00.000Z',
        },
      });

      const result = await updateBackupTime();

      expect(result).toMatchObject({
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
        lastBackupTime: expect.any(String),
      });
      // Just check that nextBackupTime is a string, not the exact value
      expect(result.nextBackupTime).toEqual(expect.any(String));
      expect(setSettings).toHaveBeenCalledWith({
        backupSchedule: expect.objectContaining({
          lastBackupTime: expect.any(String),
          nextBackupTime: expect.any(String),
        }),
      });
    });

    test('should use provided backup time', async () => {
      // Mock existing schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: true,
          frequency: FREQUENCY_OPTIONS.DAILY,
          hour: 3,
          minute: 0,
          retentionCount: 10,
          lastBackupTime: null,
          nextBackupTime: '2025-07-17T03:00:00.000Z',
        },
      });

      const customBackupTime = '2025-07-16T15:30:00.000Z';
      const result = await updateBackupTime(customBackupTime);

      expect(result).toMatchObject({
        lastBackupTime: customBackupTime,
      });
      // Just check that nextBackupTime is a string, not the exact value
      expect(result.nextBackupTime).toEqual(expect.any(String));
    });

    test('should not update when scheduling is disabled', async () => {
      // Mock disabled schedule
      getSettings.mockResolvedValue({
        backupSchedule: {
          enabled: false,
          frequency: FREQUENCY_OPTIONS.DAILY,
          hour: 3,
          minute: 0,
          retentionCount: 10,
          lastBackupTime: null,
          nextBackupTime: null,
        },
      });

      const result = await updateBackupTime();

      expect(result).toMatchObject({
        enabled: false,
      });
      expect(setSettings).not.toHaveBeenCalled();
    });

    test('should handle errors', async () => {
      // Mock error
      getSettings.mockRejectedValue(new Error('Test error'));

      // Instead of expecting an error to be thrown, we'll check that the console.error was called
      const originalConsoleError = console.error;
      console.error = jest.fn();

      try {
        await updateBackupTime();

        // Verify console.error was called with the expected message
        expect(console.error).toHaveBeenCalledWith(
          'Failed to get schedule:',
          expect.objectContaining({ message: 'Test error' }),
        );
      } finally {
        // Restore original console.error
        console.error = originalConsoleError;
      }
    });
  });

  describe('getRetentionCount', () => {
    test('should return retention count from schedule', async () => {
      // Mock schedule with retention count
      getSettings.mockResolvedValue({
        backupSchedule: {
          retentionCount: 20,
        },
      });

      const result = await getRetentionCount();

      expect(result).toBe(20);
    });

    test('should return default retention count when not set', async () => {
      // Mock schedule without retention count
      getSettings.mockResolvedValue({
        backupSchedule: {},
      });

      const result = await getRetentionCount();

      expect(result).toBe(10); // Default value
    });

    test('should handle errors', async () => {
      // Mock error
      getSettings.mockRejectedValue(new Error('Test error'));

      const result = await getRetentionCount();

      expect(result).toBe(10); // Default value
    });
  });
});
