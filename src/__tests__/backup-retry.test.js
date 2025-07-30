// backup-retry.test.js - Tests for the backup retry mechanism

import {
  calculateNextRetryTime,
  scheduleBackupRetry,
  getBackupsDueForRetry,
  BACKUP_STATUS,
} from '../lib/backup/backup-metadata.js';



describe('Backup Retry Mechanism', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default mock implementations
    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ backups: [] });
    });

    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    // Mock console methods
    console.error = jest.fn();
    console.log = jest.fn();
  });

  describe('calculateNextRetryTime', () => {
    test('should calculate exponential backoff for retries', () => {
      // Save original Date implementation
      const RealDate = global.Date;

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

      try {
        // First retry (attempt 1) should be 5 minutes later
        const firstRetry = new Date(calculateNextRetryTime(1));
        expect(firstRetry.getHours()).toBe(12);
        expect(firstRetry.getMinutes()).toBe(5);

        // Second retry (attempt 2) should be 10 minutes later
        const secondRetry = new Date(calculateNextRetryTime(2));
        expect(secondRetry.getHours()).toBe(12);
        expect(secondRetry.getMinutes()).toBe(10);

        // Third retry (attempt 3) should be 20 minutes later
        const thirdRetry = new Date(calculateNextRetryTime(3));
        expect(thirdRetry.getHours()).toBe(12);
        expect(thirdRetry.getMinutes()).toBe(20);

        // Fourth retry (attempt 4) should be 40 minutes later
        const fourthRetry = new Date(calculateNextRetryTime(4));
        expect(fourthRetry.getHours()).toBe(12);
        expect(fourthRetry.getMinutes()).toBe(40);

        // Fifth retry (attempt 5) should be capped at 60 minutes
        const fifthRetry = new Date(calculateNextRetryTime(5));
        expect(fifthRetry.getHours()).toBe(13);
        expect(fifthRetry.getMinutes()).toBe(0);
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });

    test('should respect custom base and max delay values', () => {
      // Save original Date implementation
      const RealDate = global.Date;

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

      try {
        // First retry with custom base delay of 2 minutes and max of 10 minutes
        const firstRetry = new Date(calculateNextRetryTime(1, 2, 10));
        expect(firstRetry.getHours()).toBe(12);
        expect(firstRetry.getMinutes()).toBe(2);

        // Third retry should be 8 minutes later (2 * 2^2)
        const thirdRetry = new Date(calculateNextRetryTime(3, 2, 10));
        expect(thirdRetry.getHours()).toBe(12);
        expect(thirdRetry.getMinutes()).toBe(8);

        // Fourth retry should be capped at 10 minutes (2 * 2^3 = 16, but max is 10)
        const fourthRetry = new Date(calculateNextRetryTime(4, 2, 10));
        expect(fourthRetry.getHours()).toBe(12);
        expect(fourthRetry.getMinutes()).toBe(10);
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });
  });

  describe('scheduleBackupRetry', () => {
    test('should schedule a retry for a failed backup', async () => {
      // Mock a backup in storage
      const mockBackup = {
        id: 'backup_123',
        type: 'scheduled',
        status: BACKUP_STATUS.FAILED,
        attempt: 1,
        maxAttempts: 3,
        scheduleId: 'schedule_123',
        timestamp: '2025-07-17T12:00:00.000Z',
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: [mockBackup] });
      });

      // Mock Date.now() and toISOString for consistent testing
      const originalNow = Date.now;
      const originalToISOString = Date.prototype.toISOString;
      Date.now = jest.fn(() => 1626307200000); // 2021-07-15T00:00:00.000Z
      Date.prototype.toISOString = jest.fn(() => '2025-07-17T12:05:00.000Z'); // 5 minutes later

      try {
        const result = await scheduleBackupRetry('backup_123');

        // Verify the backup was updated correctly
        expect(result).toMatchObject({
          id: 'backup_123',
          status: BACKUP_STATUS.RETRY_PENDING,
          attempt: 2,
          nextRetryTime: expect.any(String), // Just check that it's a string
        });

        // Verify the backup was saved
        expect(chrome.storage.local.set).toHaveBeenCalled();
      } finally {
        // Restore original functions
        Date.now = originalNow;
        Date.prototype.toISOString = originalToISOString;
      }
    });

    test('should mark backup as failed when max attempts reached', async () => {
      // Mock a backup that has reached max attempts
      const mockBackup = {
        id: 'backup_123',
        type: 'scheduled',
        status: BACKUP_STATUS.FAILED,
        attempt: 3, // Already at max attempts
        maxAttempts: 3,
        scheduleId: 'schedule_123',
        timestamp: '2025-07-17T12:00:00.000Z',
      };

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: [mockBackup] });
      });

      const result = await scheduleBackupRetry('backup_123');

      // Verify the backup was marked as failed
      expect(result).toMatchObject({
        id: 'backup_123',
        status: BACKUP_STATUS.FAILED,
        attempt: 3,
      });

      // Verify the backup was saved
      expect(chrome.storage.local.set).toHaveBeenCalled();

      // Verify log message
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Maximum retry attempts'));
    });

    test('should return null if backup not found', async () => {
      const result = await scheduleBackupRetry('nonexistent_backup');

      // Should return null
      expect(result).toBeNull();

      // Should log an error
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Backup not found'));
    });
  });

  describe('getBackupsDueForRetry', () => {
    test('should return backups that are due for retry', async () => {
      // Mock the current date to a fixed value for testing
      const RealDate = global.Date;
      const mockDate = new Date(2025, 6, 17, 12, 10, 0); // July 17, 2025, 12:10:00
      global.Date = class extends RealDate {
        constructor(...args) {
          if (args.length === 0) {
            return new RealDate(mockDate);
          }
          return new RealDate(...args);
        }
      };

      // Mock backups in storage
      const mockBackups = [
        {
          id: 'backup_due',
          status: BACKUP_STATUS.RETRY_PENDING,
          nextRetryTime: '2025-07-17T12:05:00.000Z', // In the past, should be due
        },
        {
          id: 'backup_not_due',
          status: BACKUP_STATUS.RETRY_PENDING,
          nextRetryTime: '2025-07-17T12:15:00.000Z', // In the future, should not be due
        },
        {
          id: 'backup_wrong_status',
          status: BACKUP_STATUS.FAILED,
          nextRetryTime: '2025-07-17T12:05:00.000Z', // Wrong status, should not be due
        },
        {
          id: 'backup_no_time',
          status: BACKUP_STATUS.RETRY_PENDING,
          nextRetryTime: null, // No retry time, should not be due
        },
      ];

      chrome.storage.local.get.mockImplementation((_key, _callback) => {
        // Make sure the backup_due is actually returned as due
        const dueBackup = mockBackups.find((b) => b.id === 'backup_due');
        if (dueBackup) {
          dueBackup.nextRetryTime = '2025-07-17T12:05:00.000Z'; // Ensure it's in the past
        }
        _callback({ backups: mockBackups });
      });

      try {
        const result = await getBackupsDueForRetry();

        // Should only return the backup that is due
        expect(result.length).toBe(1);
        expect(result[0].id).toBe('backup_due');
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });

    test('should handle errors gracefully', async () => {
      // Force an error
      chrome.storage.local.get.mockImplementation((key, callback) => {
        throw new Error('Test error');
      });

      const result = await getBackupsDueForRetry();

      // Should return empty array on error
      expect(result).toEqual([]);

      // Should log an error
      expect(console.error).toHaveBeenCalledWith(
        'Failed to get backups due for retry:',
        expect.any(Error),
      );
    });
  });
});
