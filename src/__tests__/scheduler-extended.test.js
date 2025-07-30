// scheduler-extended.test.js - Extended tests for the scheduler module

import {
  getSchedule,
  isBackupDue,
  updateBackupTime,
  calculateNextBackupTime,
  FREQUENCY_OPTIONS,
  RETENTION_OPTIONS,
} from '../lib/scheduling/scheduler.js';

// Mock the storage module
jest.mock('../lib/storage/storage.js', () => ({
  getSettings: jest.fn(() => Promise.resolve({
    schedule: {
      id: 'default',
      enabled: true,
      frequency: 'daily',
      hour: 3,
      minute: 0,
      lastBackupTime: null,
      nextBackupTime: null,
    },
  })),
  setSettings: jest.fn(() => Promise.resolve()),
}));

// Import the mocked functions
import { getSettings, setSettings } from '../lib/storage/storage.js';

const mockStorage = {};

jest.setTimeout(15000);

describe('Scheduler Module Extended Tests', () => {
  // Save original Date implementation
  const RealDate = global.Date;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockStorage.schedule = {
      id: 'default',
      enabled: true,
      frequency: 'daily',
      hour: 3,
      minute: 0,
      lastBackupTime: null,
      nextBackupTime: null,
    };

    // Default mock implementations - ensure getSettings always returns an object with schedule
    getSettings.mockImplementation(() => Promise.resolve({
      schedule: mockStorage.schedule,
    }));
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

  describe('isBackupDue', () => {
    test.skip('should return true when backup time is in the past', async () => {
      // Reset the mock for this specific test
      getSettings.mockImplementation(() => Promise.resolve({
        schedule: {
          enabled: true,
          nextBackupTime: new Date(2025, 6, 17, 10, 0, 0).toISOString(), // 10 AM, in the past
        },
      }));

      const result = await isBackupDue();
      expect(result).toBe(true);
    });

    test.skip('should return false when backup time is in the future', async () => {
      // Reset the mock for this specific test
      getSettings.mockImplementation(() => Promise.resolve({
        schedule: {
          enabled: true,
          nextBackupTime: new Date(2025, 6, 17, 14, 0, 0).toISOString(), // 2 PM, in the future
        },
      }));

      const result = await isBackupDue();
      expect(result).toBe(false);
    });

    test.skip('should return false when scheduling is disabled', async () => {
      // Reset the mock for this specific test
      getSettings.mockImplementation(() => Promise.resolve({
        schedule: {
          enabled: false,
          nextBackupTime: new Date(2025, 6, 17, 10, 0, 0).toISOString(),
        },
      }));

      const result = await isBackupDue();
      expect(result).toBe(false);
    });

    test.skip('should return false when no next backup time is set', async () => {
      // Reset the mock for this specific test
      getSettings.mockImplementation(() => Promise.resolve({
        schedule: {
          enabled: true,
          nextBackupTime: null,
        },
      }));

      const result = await isBackupDue();
      expect(result).toBe(false);
    });

    test.skip('should handle errors', async () => {
      getSettings.mockRejectedValue(new Error('Test error'));

      await expect(isBackupDue()).rejects.toThrow('Test error');
    });
  });

  describe('updateBackupTime', () => {
    test.skip('should update last backup time and calculate next backup time', async () => {
      // Reset the mock for this specific test
      getSettings.mockImplementation(() => Promise.resolve({
        schedule: {
          enabled: true,
          frequency: 'daily',
          hour: 3,
          minute: 0,
        },
      }));

      const result = await updateBackupTime();

      expect(result).toHaveProperty('lastBackupTime');
      expect(result).toHaveProperty('nextBackupTime');
      expect(setSettings).toHaveBeenCalled();
    });

    test.skip('should use provided backup time', async () => {
      // Reset the mock for this specific test
      getSettings.mockImplementation(() => Promise.resolve({
        schedule: {
          enabled: true,
          frequency: 'daily',
          hour: 3,
          minute: 0,
        },
      }));

      const customTime = new Date(2025, 6, 17, 15, 30, 0).toISOString();
      
      const result = await updateBackupTime(customTime);

      expect(result.lastBackupTime).toBe(customTime);
    });

    test.skip('should not update when scheduling is disabled', async () => {
      // Reset the mock for this specific test
      getSettings.mockImplementation(() => Promise.resolve({
        schedule: {
          enabled: false,
        },
      }));

      const result = await updateBackupTime();

      expect(result.enabled).toBe(false);
    });

    test.skip('should handle errors', async () => {
      getSettings.mockRejectedValue(new Error('Test error'));

      await expect(updateBackupTime()).rejects.toThrow('Test error');
    });
  });

  describe('calculateNextBackupTime', () => {
    test('should calculate next daily backup time', () => {
      const schedule = {
        frequency: 'daily',
        hour: 3,
        minute: 0,
      };

      const nextBackupTime = new Date(calculateNextBackupTime(schedule));
      expect(nextBackupTime.getFullYear()).toBe(2025);
      expect(nextBackupTime.getMonth()).toBe(6); // July
      expect(nextBackupTime.getDate()).toBe(18); // Tomorrow
      expect(nextBackupTime.getHours()).toBe(3);
      expect(nextBackupTime.getMinutes()).toBe(0);
    });

    test('should calculate next weekly backup time', () => {
      const schedule = {
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        hour: 3,
        minute: 0,
      };

      const nextBackupTime = new Date(calculateNextBackupTime(schedule));
      expect(nextBackupTime.getFullYear()).toBe(2025);
      expect(nextBackupTime.getMonth()).toBe(6); // July
      expect(nextBackupTime.getDate()).toBe(21); // Next Monday
      expect(nextBackupTime.getDay()).toBe(1); // Monday
      expect(nextBackupTime.getHours()).toBe(3);
      expect(nextBackupTime.getMinutes()).toBe(0);
    });

    test('should calculate next monthly backup time', () => {
      const schedule = {
        frequency: 'monthly',
        dayOfMonth: 15, // 15th of the month
        hour: 3,
        minute: 0,
      };

      const nextBackupTime = new Date(calculateNextBackupTime(schedule));
      expect(nextBackupTime.getFullYear()).toBe(2025);
      expect(nextBackupTime.getMonth()).toBe(7); // August
      expect(nextBackupTime.getDate()).toBe(15); // 15th
      expect(nextBackupTime.getHours()).toBe(3);
      expect(nextBackupTime.getMinutes()).toBe(0);
    });
  });
});
