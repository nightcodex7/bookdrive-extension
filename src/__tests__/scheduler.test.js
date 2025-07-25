// scheduler.test.js - Tests for the scheduler module

import {
  validateSchedule,
  calculateNextBackupTime,
  FREQUENCY_OPTIONS,
  RETENTION_OPTIONS,
} from '../lib/scheduling/scheduler.js';

// Mock the storage module
jest.mock('../lib/storage/storage.js', () => ({
  getSettings: jest.fn().mockResolvedValue({}),
  setSettings: jest.fn().mockResolvedValue({}),
}));

describe('Scheduler Module', () => {
  describe('validateSchedule', () => {
    test('should validate a valid daily schedule', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should validate a valid weekly schedule', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.WEEKLY,
        dayOfWeek: 1, // Monday
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should validate a valid bi-weekly schedule', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.BI_WEEKLY,
        dayOfWeek: 3, // Wednesday
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should validate a valid monthly schedule', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.MONTHLY,
        dayOfMonth: 15,
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    test('should reject invalid frequency', () => {
      const schedule = {
        enabled: true,
        frequency: 'invalid',
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('frequency');
    });

    test('should reject invalid day of week', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.WEEKLY,
        dayOfWeek: 8, // Invalid
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('dayOfWeek');
    });

    test('should reject invalid day of month', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.MONTHLY,
        dayOfMonth: 32, // Invalid
        hour: 3,
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('dayOfMonth');
    });

    test('should reject invalid hour', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 24, // Invalid
        minute: 0,
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('hour');
    });

    test('should reject invalid minute', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 60, // Invalid
        retentionCount: 10,
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('minute');
    });

    test('should reject invalid retention count', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: 7, // Not in RETENTION_OPTIONS
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('retentionCount');
    });

    test('should accept unlimited retention count', () => {
      const schedule = {
        enabled: true,
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3,
        minute: 0,
        retentionCount: -1, // Unlimited
      };

      const result = validateSchedule(schedule);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });
  });

  describe('calculateNextBackupTime', () => {
    // Save original Date implementation
    const RealDate = global.Date;

    beforeEach(() => {
      // Mock the current date to a fixed value for testing
      const mockDate = new Date(2025, 6, 17, 12, 0, 0); // July 17, 2025, 12:00:00
      global.Date = class extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            return new RealDate(mockDate);
          }
          return new RealDate(...args);
        }
      };
    });

    afterEach(() => {
      // Restore original Date
      global.Date = RealDate;
    });

    test('should calculate next daily backup time for today if time is in future', () => {
      const schedule = {
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 15, // 3 PM, which is in the future from our mock 12 PM
        minute: 0,
      };

      const nextBackupTime = new Date(calculateNextBackupTime(schedule));
      expect(nextBackupTime.getFullYear()).toBe(2025);
      expect(nextBackupTime.getMonth()).toBe(6); // July
      expect(nextBackupTime.getDate()).toBe(17); // Today
      expect(nextBackupTime.getHours()).toBe(15);
      expect(nextBackupTime.getMinutes()).toBe(0);
    });

    test('should calculate next daily backup time for tomorrow if time is in past', () => {
      const schedule = {
        frequency: FREQUENCY_OPTIONS.DAILY,
        hour: 3, // 3 AM, which is in the past from our mock 12 PM
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
      // July 17, 2025 is a Thursday (day 4)
      const schedule = {
        frequency: FREQUENCY_OPTIONS.WEEKLY,
        dayOfWeek: 1, // Monday
        hour: 3,
        minute: 0,
      };

      const nextBackupTime = new Date(calculateNextBackupTime(schedule));
      expect(nextBackupTime.getFullYear()).toBe(2025);
      expect(nextBackupTime.getMonth()).toBe(6); // July
      expect(nextBackupTime.getDate()).toBe(21); // Next Monday (July 21)
      expect(nextBackupTime.getDay()).toBe(1); // Monday
      expect(nextBackupTime.getHours()).toBe(3);
      expect(nextBackupTime.getMinutes()).toBe(0);
    });

    test('should calculate next bi-weekly backup time', () => {
      // July 17, 2025 is a Thursday (day 4)
      const schedule = {
        frequency: FREQUENCY_OPTIONS.BI_WEEKLY,
        dayOfWeek: 1, // Monday
        hour: 3,
        minute: 0,
      };

      const nextBackupTime = new Date(calculateNextBackupTime(schedule));
      expect(nextBackupTime.getFullYear()).toBe(2025);
      expect(nextBackupTime.getMonth()).toBe(6); // July
      expect(nextBackupTime.getDate()).toBe(28); // Monday after next (July 28)
      expect(nextBackupTime.getDay()).toBe(1); // Monday
      expect(nextBackupTime.getHours()).toBe(3);
      expect(nextBackupTime.getMinutes()).toBe(0);
    });

    test('should calculate next monthly backup time', () => {
      const schedule = {
        frequency: FREQUENCY_OPTIONS.MONTHLY,
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

    test('should handle month with fewer days for monthly schedule', () => {
      const schedule = {
        frequency: FREQUENCY_OPTIONS.MONTHLY,
        dayOfMonth: 31, // 31st of the month
        hour: 3,
        minute: 0,
      };

      // Mock date to February
      const februaryDate = new Date(2025, 1, 15, 12, 0, 0); // February 15, 2025
      global.Date = class extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            return new RealDate(februaryDate);
          }
          return new RealDate(...args);
        }
      };

      const nextBackupTime = new Date(calculateNextBackupTime(schedule));
      expect(nextBackupTime.getFullYear()).toBe(2025);
      expect(nextBackupTime.getMonth()).toBe(2); // March
      expect(nextBackupTime.getDate()).toBe(31); // 31st
      expect(nextBackupTime.getHours()).toBe(3);
      expect(nextBackupTime.getMinutes()).toBe(0);
    });
  });
});
