// retention-policy-integration.test.js - Integration tests for retention policy application

import {
  getBackupsToRemove,
  enforceRetentionPolicy,
  getBackupsBySchedule,
  deleteBackups,
  getAllBackups,
  saveBackup,
  BACKUP_TYPES,
  BACKUP_STATUS,
} from '../lib/backup-metadata.js';

import { getSchedule, getRetentionCount } from '../lib/scheduler.js';

// Mock chrome.storage.local
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
};

// Mock the scheduler module
jest.mock('../lib/scheduler.js', () => ({
  getSchedule: jest.fn(),
  getRetentionCount: jest.fn(),
}));

describe('Retention Policy Integration Tests', () => {
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

    // Default scheduler mock implementations
    getSchedule.mockResolvedValue({
      enabled: true,
      frequency: 'daily',
      hour: 3,
      minute: 0,
      retentionCount: 10,
    });

    getRetentionCount.mockResolvedValue(10);

    // Mock console methods
    console.error = jest.fn();
    console.log = jest.fn();
  });

  describe('Retention Policy Application', () => {
    test('should remove excess backups based on retention policy', async () => {
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
      getRetentionCount.mockResolvedValue(10);

      // Enforce retention policy
      const removedCount = await enforceRetentionPolicy('schedule_123', 10);

      // Check that 5 backups were removed (15 - 10 = 5)
      expect(removedCount).toBe(5);

      // Check that chrome.storage.local.set was called
      expect(chrome.storage.local.set).toHaveBeenCalled();

      // Get the backups that were saved
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      expect(setCall).toHaveProperty('backups');

      // Check that we have 11 backups left (10 scheduled + 1 manual)
      expect(setCall.backups).toHaveLength(11);

      // Check that the oldest scheduled backups were removed
      const remainingBackups = setCall.backups;
      for (let i = 1; i <= 5; i++) {
        expect(remainingBackups.find((b) => b.id === `backup_${i}`)).toBeUndefined();
      }

      // Check that the manual backup was preserved
      expect(remainingBackups.find((b) => b.id === 'manual_backup_1')).toBeDefined();
    });

    test('should not remove any backups when retention count is unlimited', async () => {
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

      // Mock storage to return our backups
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: mockBackups });
      });

      // Set retention count to unlimited (-1)
      getRetentionCount.mockResolvedValue(-1);

      // Enforce retention policy
      const removedCount = await enforceRetentionPolicy('schedule_123', -1);

      // Check that no backups were removed
      expect(removedCount).toBe(0);

      // Check that chrome.storage.local.set was not called
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    test('should handle multiple schedules independently', async () => {
      // Create mock backups
      const mockBackups = [];

      // Create 15 scheduled backups for schedule_123
      for (let i = 1; i <= 15; i++) {
        mockBackups.push({
          id: `backup_123_${i}`,
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_123',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, i, 3, 0, 0).toISOString(), // July 1-15, 2025
        });
      }

      // Create 8 scheduled backups for schedule_456
      for (let i = 1; i <= 8; i++) {
        mockBackups.push({
          id: `backup_456_${i}`,
          type: BACKUP_TYPES.SCHEDULED,
          scheduleId: 'schedule_456',
          status: BACKUP_STATUS.SUCCESS,
          timestamp: new Date(2025, 6, i, 3, 0, 0).toISOString(), // July 1-8, 2025
        });
      }

      // Mock storage to return our backups
      chrome.storage.local.get.mockImplementation((key, callback) => {
        callback({ backups: mockBackups });
      });

      // Set retention count to 10 for schedule_123
      getRetentionCount.mockResolvedValue(10);

      // Enforce retention policy for schedule_123
      const removedCount = await enforceRetentionPolicy('schedule_123', 10);

      // Check that 5 backups were removed from schedule_123 (15 - 10 = 5)
      expect(removedCount).toBe(5);

      // Check that chrome.storage.local.set was called
      expect(chrome.storage.local.set).toHaveBeenCalled();

      // Get the backups that were saved
      const setCall = chrome.storage.local.set.mock.calls[0][0];
      expect(setCall).toHaveProperty('backups');

      // Check that we have 18 backups left (10 from schedule_123 + 8 from schedule_456)
      expect(setCall.backups).toHaveLength(18);

      // Check that the oldest backups from schedule_123 were removed
      const remainingBackups = setCall.backups;
      for (let i = 1; i <= 5; i++) {
        expect(remainingBackups.find((b) => b.id === `backup_123_${i}`)).toBeUndefined();
      }

      // Check that all backups from schedule_456 were preserved
      for (let i = 1; i <= 8; i++) {
        expect(remainingBackups.find((b) => b.id === `backup_456_${i}`)).toBeDefined();
      }
    });
  });
});
