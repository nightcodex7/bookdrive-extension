// backup-metadata-extended.test.js - Additional tests for the backup metadata module

import {
  createBackupMetadata,
  updateBackupMetadata,
  getAllBackups,
  getBackupsByType,
  getBackupsBySchedule,
  saveBackup,
  deleteBackup,
  deleteBackups,
  getBackupsToRemove,
  enforceRetentionPolicy,
  calculateNextRetryTime,
  scheduleBackupRetry,
  getBackupsDueForRetry,
  BACKUP_TYPES,
  BACKUP_STATUS,
} from '../lib/backup/backup-metadata.js';



describe('Backup Metadata Extended Tests', () => {
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

  describe('getBackupsByType', () => {
    test('should return backups of specified type', async () => {
      // Mock backups of different types
      const mockBackups = [
        {
          id: 'backup_1',
          type: BACKUP_TYPES.MANUAL,
          timestamp: '2025-07-15T00:00:00.000Z',
        },
        {
          id: 'backup_2',
          type: BACKUP_TYPES.SCHEDULED,
          timestamp: '2025-07-16T00:00:00.000Z',
        },
        {
          id: 'backup_3',
          type: BACKUP_TYPES.MANUAL,
          timestamp: '2025-07-17T00:00:00.000Z',
        },
      ];

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: mockBackups });
      });

      const manualBackups = await getBackupsByType(BACKUP_TYPES.MANUAL);
      expect(manualBackups).toHaveLength(2);
      expect(manualBackups[0].id).toBe('backup_1');
      expect(manualBackups[1].id).toBe('backup_3');

      const scheduledBackups = await getBackupsByType(BACKUP_TYPES.SCHEDULED);
      expect(scheduledBackups).toHaveLength(1);
      expect(scheduledBackups[0].id).toBe('backup_2');
    });

    test('should return empty array when no backups of specified type exist', async () => {
      // Mock backups of only one type
      const mockBackups = [
        {
          id: 'backup_1',
          type: BACKUP_TYPES.MANUAL,
          timestamp: '2025-07-15T00:00:00.000Z',
        },
        {
          id: 'backup_2',
          type: BACKUP_TYPES.MANUAL,
          timestamp: '2025-07-16T00:00:00.000Z',
        },
      ];

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: mockBackups });
      });

      const scheduledBackups = await getBackupsByType(BACKUP_TYPES.SCHEDULED);
      expect(scheduledBackups).toHaveLength(0);
    });
  });

  describe('saveBackup', () => {
    test('should add new backup to storage', async () => {
      const newBackup = {
        id: 'backup_123',
        type: BACKUP_TYPES.SCHEDULED,
        status: BACKUP_STATUS.SUCCESS,
        timestamp: '2025-07-17T00:00:00.000Z',
      };

      const savedBackup = await saveBackup(newBackup);

      expect(chrome.storage.local.get).toHaveBeenCalledWith({ backups: [] }, expect.any(Function));
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { backups: [newBackup] },
        expect.any(Function),
      );
      expect(savedBackup).toEqual(newBackup);
    });

    test('should update existing backup in storage', async () => {
      // Mock existing backups
      const existingBackups = [
        {
          id: 'backup_123',
          type: BACKUP_TYPES.SCHEDULED,
          status: BACKUP_STATUS.IN_PROGRESS,
          timestamp: '2025-07-17T00:00:00.000Z',
        },
        {
          id: 'backup_456',
          type: BACKUP_TYPES.MANUAL,
          status: BACKUP_STATUS.SUCCESS,
          timestamp: '2025-07-16T00:00:00.000Z',
        },
      ];

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: existingBackups });
      });

      const updatedBackup = {
        id: 'backup_123',
        type: BACKUP_TYPES.SCHEDULED,
        status: BACKUP_STATUS.SUCCESS, // Updated status
        timestamp: '2025-07-17T00:00:00.000Z',
        bookmarkCount: 100, // New field
      };

      const savedBackup = await saveBackup(updatedBackup);

      // The updatedAt field is added dynamically, so we can't check the exact object
      // Instead, check that chrome.storage.local.set was called with an object that contains
      // the expected backups array with the updated backup
      expect(chrome.storage.local.set).toHaveBeenCalled();
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      expect(setCall).toHaveProperty('backups');
      expect(setCall.backups).toHaveLength(2);
      expect(setCall.backups[0].id).toBe('backup_123');
      expect(setCall.backups[0].status).toBe(BACKUP_STATUS.SUCCESS);
      expect(setCall.backups[0].bookmarkCount).toBe(100);
      expect(setCall.backups[1].id).toBe('backup_456');

      // Check that the returned backup has the expected properties
      expect(savedBackup.id).toBe('backup_123');
      expect(savedBackup.status).toBe(BACKUP_STATUS.SUCCESS);
      expect(savedBackup.bookmarkCount).toBe(100);
    });
  });

  describe('deleteBackup', () => {
    test('should delete backup from storage', async () => {
      // Mock existing backups
      const existingBackups = [
        {
          id: 'backup_123',
          type: BACKUP_TYPES.SCHEDULED,
          status: BACKUP_STATUS.SUCCESS,
          timestamp: '2025-07-17T00:00:00.000Z',
        },
        {
          id: 'backup_456',
          type: BACKUP_TYPES.MANUAL,
          status: BACKUP_STATUS.SUCCESS,
          timestamp: '2025-07-16T00:00:00.000Z',
        },
      ];

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: existingBackups });
      });

      const result = await deleteBackup('backup_123');

      expect(result).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        {
          backups: [existingBackups[1]], // Only the second backup should remain
        },
        expect.any(Function),
      );
    });

    test('should return false when backup does not exist', async () => {
      // Mock existing backups
      const existingBackups = [
        {
          id: 'backup_123',
          type: BACKUP_TYPES.SCHEDULED,
          status: BACKUP_STATUS.SUCCESS,
          timestamp: '2025-07-17T00:00:00.000Z',
        },
      ];

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: existingBackups });
      });

      const result = await deleteBackup('backup_456');

      expect(result).toBe(false);
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('calculateNextRetryTime', () => {
    test('should calculate exponential backoff for retries', () => {
      // Save original Date implementation
      const RealDate = global.Date;

      try {
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

        // First retry: 5 minutes
        const firstRetry = new Date(calculateNextRetryTime(1));
        expect(firstRetry.getTime() - mockDate.getTime()).toBe(5 * 60 * 1000);

        // Second retry: 10 minutes
        const secondRetry = new Date(calculateNextRetryTime(2));
        expect(secondRetry.getTime() - mockDate.getTime()).toBe(10 * 60 * 1000);

        // Third retry: 20 minutes
        const thirdRetry = new Date(calculateNextRetryTime(3));
        expect(thirdRetry.getTime() - mockDate.getTime()).toBe(20 * 60 * 1000);

        // Fourth retry: 40 minutes
        const fourthRetry = new Date(calculateNextRetryTime(4));
        expect(fourthRetry.getTime() - mockDate.getTime()).toBe(40 * 60 * 1000);

        // Fifth retry: 60 minutes (capped at maxDelayMinutes)
        const fifthRetry = new Date(calculateNextRetryTime(5));
        expect(fifthRetry.getTime() - mockDate.getTime()).toBe(60 * 60 * 1000);

        // Sixth retry: 60 minutes (still capped)
        const sixthRetry = new Date(calculateNextRetryTime(6));
        expect(sixthRetry.getTime() - mockDate.getTime()).toBe(60 * 60 * 1000);
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });

    test('should respect custom base and max delay values', () => {
      // Save original Date implementation
      const RealDate = global.Date;

      try {
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

        // Custom base delay: 2 minutes, max delay: 10 minutes

        // First retry: 2 minutes
        const firstRetry = new Date(calculateNextRetryTime(1, 2, 10));
        expect(firstRetry.getTime() - mockDate.getTime()).toBe(2 * 60 * 1000);

        // Second retry: 4 minutes
        const secondRetry = new Date(calculateNextRetryTime(2, 2, 10));
        expect(secondRetry.getTime() - mockDate.getTime()).toBe(4 * 60 * 1000);

        // Third retry: 8 minutes
        const thirdRetry = new Date(calculateNextRetryTime(3, 2, 10));
        expect(thirdRetry.getTime() - mockDate.getTime()).toBe(8 * 60 * 1000);

        // Fourth retry: 10 minutes (capped at maxDelayMinutes)
        const fourthRetry = new Date(calculateNextRetryTime(4, 2, 10));
        expect(fourthRetry.getTime() - mockDate.getTime()).toBe(10 * 60 * 1000);
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });
  });

  describe('scheduleBackupRetry', () => {
    test('should schedule retry for a failed backup', async () => {
      // Mock existing backups
      const existingBackups = [
        {
          id: 'backup_123',
          type: BACKUP_TYPES.SCHEDULED,
          status: BACKUP_STATUS.FAILED,
          attempt: 1,
          maxAttempts: 3,
          timestamp: '2025-07-17T00:00:00.000Z',
        },
      ];

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: existingBackups });
      });

      // Save original Date implementation
      const RealDate = global.Date;

      try {
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

        const result = await scheduleBackupRetry('backup_123');

        expect(result).toMatchObject({
          id: 'backup_123',
          attempt: 2, // Incremented
          status: BACKUP_STATUS.RETRY_PENDING,
          nextRetryTime: expect.any(String),
        });

        expect(chrome.storage.local.set).toHaveBeenCalled();
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });

    test('should mark backup as failed when max attempts reached', async () => {
      // Mock existing backups
      const existingBackups = [
        {
          id: 'backup_123',
          type: BACKUP_TYPES.SCHEDULED,
          status: BACKUP_STATUS.FAILED,
          attempt: 3, // Already at max attempts
          maxAttempts: 3,
          timestamp: '2025-07-17T00:00:00.000Z',
        },
      ];

      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: existingBackups });
      });

      const result = await scheduleBackupRetry('backup_123');

      expect(result).toMatchObject({
        id: 'backup_123',
        attempt: 3, // Not incremented
        status: BACKUP_STATUS.FAILED, // Marked as failed
        maxAttempts: 3,
      });

      expect(chrome.storage.local.set).toHaveBeenCalled();
    });

    test('should return null when backup not found', async () => {
      // Mock empty backups
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: [] });
      });

      const result = await scheduleBackupRetry('backup_123');

      expect(result).toBeNull();
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('getBackupsDueForRetry', () => {
    test('should return backups due for retry', async () => {
      // Save original Date implementation
      const RealDate = global.Date;

      try {
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

        // Mock backups with different retry times
        const mockBackups = [
          {
            id: 'backup_1',
            status: BACKUP_STATUS.RETRY_PENDING,
            nextRetryTime: new Date(2025, 6, 17, 11, 0, 0).toISOString(), // 1 hour ago
          },
          {
            id: 'backup_2',
            status: BACKUP_STATUS.RETRY_PENDING,
            nextRetryTime: new Date(2025, 6, 17, 13, 0, 0).toISOString(), // 1 hour from now
          },
          {
            id: 'backup_3',
            status: BACKUP_STATUS.SUCCESS,
            nextRetryTime: new Date(2025, 6, 17, 11, 0, 0).toISOString(), // 1 hour ago
          },
        ];

        chrome.storage.local.get.mockImplementation((key, callback) => {
          callback({ backups: mockBackups });
        });

        const result = await getBackupsDueForRetry();

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('backup_1');
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });

    test('should return empty array when no backups are due for retry', async () => {
      // Save original Date implementation
      const RealDate = global.Date;

      try {
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

        // Mock backups with future retry times
        const mockBackups = [
          {
            id: 'backup_1',
            status: BACKUP_STATUS.RETRY_PENDING,
            nextRetryTime: new Date(2025, 6, 17, 13, 0, 0).toISOString(), // 1 hour from now
          },
          {
            id: 'backup_2',
            status: BACKUP_STATUS.SUCCESS,
            nextRetryTime: null,
          },
        ];

        chrome.storage.local.get.mockImplementation((key, callback) => {
          callback({ backups: mockBackups });
        });

        const result = await getBackupsDueForRetry();

        expect(result).toHaveLength(0);
      } finally {
        // Restore original Date
        global.Date = RealDate;
      }
    });

    test('should handle errors', async () => {
      // Mock error
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback(null); // Invalid response
      });

      const result = await getBackupsDueForRetry();

      expect(result).toHaveLength(0);
      expect(console.error).toHaveBeenCalled();
    });
  });
});

