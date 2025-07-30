// backup-metadata.test.js - Tests for the backup metadata module

import {
  createBackupMetadata,
  updateBackupMetadata,
  BACKUP_TYPES,
  BACKUP_STATUS,
} from '../lib/backup/backup-metadata.js';

describe('Backup Metadata Module', () => {
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
  });

  describe('createBackupMetadata', () => {
    test('should create backup metadata with default values', () => {
      // Mock Date.now() for this test only
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1626307200000); // 2021-07-15T00:00:00.000Z

      // Mock toISOString for this test only
      const originalToISOString = Date.prototype.toISOString;
      Date.prototype.toISOString = jest.fn(() => '2021-07-15T00:00:00.000Z');

      try {
        const metadata = createBackupMetadata();

        expect(metadata).toMatchObject({
          id: expect.stringContaining('backup_'),
          type: 'manual',
          status: 'in_progress',
          attempt: 1,
          maxAttempts: 3,
          scheduleId: null,
        });
      } finally {
        // Restore original functions
        Date.now = originalNow;
        Date.prototype.toISOString = originalToISOString;
      }
    });

    test('should create backup metadata with custom values', () => {
      const metadata = createBackupMetadata({
        type: BACKUP_TYPES.MANUAL,
        status: BACKUP_STATUS.IN_PROGRESS,
        scheduleId: 'schedule_123',
        filename: 'backup_123.json',
      });

      expect(metadata).toMatchObject({
        type: 'manual',
        status: 'in_progress',
        attempt: 1,
        maxAttempts: 3,
        scheduleId: 'schedule_123',
        filename: 'backup_123.json',
      });
    });

    test('should use provided ID if available', () => {
      // Mock Date.now() for consistent ID generation
      const originalNow = Date.now;
      Date.now = jest.fn(() => 1626307200000);

      try {
        const metadata = createBackupMetadata({
          id: 'custom_id',
        });

        expect(metadata.id).toBe('custom_id');
      } finally {
        // Restore original function
        Date.now = originalNow;
      }
    });
  });

  describe('updateBackupMetadata', () => {
    test('should update backup metadata', () => {
      const original = createBackupMetadata({
        type: BACKUP_TYPES.MANUAL,
        status: BACKUP_STATUS.IN_PROGRESS,
      });

      const updated = updateBackupMetadata(original, {
        status: BACKUP_STATUS.SUCCESS,
        bookmarkCount: 100,
      });

      expect(updated).toMatchObject({
        status: BACKUP_STATUS.SUCCESS,
        bookmarkCount: 100,
      });
    });

    test('should preserve original fields', () => {
      const original = createBackupMetadata({
        type: BACKUP_TYPES.SCHEDULED,
        scheduleId: 'schedule_123',
      });

      const updated = updateBackupMetadata(original, {
        status: BACKUP_STATUS.FAILED,
      });

      expect(updated.type).toBe(BACKUP_TYPES.SCHEDULED);
      expect(updated.scheduleId).toBe('schedule_123');
    });
  });
});
