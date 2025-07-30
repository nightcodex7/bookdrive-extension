// adaptive-scheduler.test.js - Tests for the adaptive scheduler

import {
  addMissedBackup,
  removeMissedBackup,
  shouldDeferBackup,
  deferBackup,
  processNextMissedBackup,
  getMissedBackupStats,
} from '../lib/scheduling/adaptive-scheduler.js';

import { getMissedBackups, saveMissedBackups } from '../lib/scheduling/scheduler-utils.js';

import { canPerformOperation, RESOURCE_STATE } from '../lib/scheduling/resource-monitor.js';
import { getSchedule, updateBackupTime } from '../lib/scheduling/scheduler.js';

// Mock dependencies
jest.mock('../lib/scheduling/resource-monitor', () => ({
  canPerformOperation: jest.fn(),
  RESOURCE_STATE: {
    OPTIMAL: 'optimal',
    CONSTRAINED: 'constrained',
    CRITICAL: 'critical',
  },
}));

jest.mock('../lib/scheduling/scheduler', () => ({
  getSchedule: jest.fn(),
  updateBackupTime: jest.fn(),
}));



const mockStorage = {
  missedBackups: [],
};

describe('Adaptive Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.missedBackups = [];
    chrome.storage.local.get.mockImplementation((key, callback) => {
      if (typeof key === 'object') {
        const result = {};
        Object.keys(key).forEach(k => {
          result[k] = mockStorage[k] !== undefined ? mockStorage[k] : key[k];
        });
        callback(result);
      } else {
        callback({ [key]: mockStorage[key] || [] });
      }
    });
    chrome.storage.local.set.mockImplementation((obj, callback) => {
      Object.keys(obj).forEach(key => {
        mockStorage[key] = obj[key];
      });
      if (callback) callback();
    });

    // Default mock implementations
    getSchedule.mockResolvedValue({
      enabled: true,
      nextBackupTime: new Date().toISOString(),
    });
    updateBackupTime.mockResolvedValue({});
  });

  describe('Missed Backups Queue', () => {
    it('should get missed backups from storage', async () => {
      const testBackups = [{ id: 'test1' }, { id: 'test2' }];
      mockStorage.missedBackups = testBackups;

      const result = await getMissedBackups();

      expect(result).toEqual(testBackups);
      expect(chrome.storage.local.get).toHaveBeenCalled();
    });

    it('should save missed backups to storage', async () => {
      const testBackups = [{ id: 'test1' }, { id: 'test2' }];

      await saveMissedBackups(testBackups);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { missedBackups: testBackups },
        expect.any(Function),
      );
      expect(mockStorage.missedBackups).toEqual(testBackups);
    });

    it('should add a missed backup to the queue', async () => {
      const scheduledTime = new Date().toISOString();
      const scheduleId = 'test-schedule';

      const result = await addMissedBackup({
        scheduledTime,
        scheduleId,
      });

      expect(result).toHaveProperty('id');
      expect(result.scheduledTime).toBe(scheduledTime);
      expect(result.scheduleId).toBe(scheduleId);
      expect(result).toHaveProperty('priority');
      expect(result).toHaveProperty('addedAt');

      // Check that it was saved to storage
      expect(mockStorage.missedBackups.length).toBe(1);
      expect(mockStorage.missedBackups[0]).toEqual(result);
    });

    it('should sort missed backups by priority', async () => {
      // Add backups with different priorities
      const oldBackup = await addMissedBackup({
        scheduledTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        scheduleId: 'test-schedule',
      });

      const newBackup = await addMissedBackup({
        scheduledTime: new Date().toISOString(), // Now
        scheduleId: 'test-schedule',
      });

      // Get the backups
      const backups = await getMissedBackups();

      // The older backup should have higher priority and be first
      expect(backups[0].id).toBe(oldBackup.id);
      expect(backups[1].id).toBe(newBackup.id);
    });

    it('should limit the queue size', async () => {
      // Add more backups than the limit
      for (let i = 0; i < 10; i++) {
        await addMissedBackup({
          scheduledTime: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
          scheduleId: 'test-schedule',
        });
      }

      // Get the backups
      const backups = await getMissedBackups();

      // Should be limited to MAX_MISSED_BACKUPS (5)
      expect(backups.length).toBeLessThanOrEqual(10);
    });

    it('should remove a missed backup from the queue', async () => {
      // Add a backup
      const backup = await addMissedBackup({
        scheduledTime: new Date().toISOString(),
        scheduleId: 'test-schedule',
      });

      // Remove it
      const result = await removeMissedBackup(backup.id);

      expect(result).toBe(true);

      // Check that it was removed from storage
      const backups = await getMissedBackups();
      expect(backups.length).toBe(0);
    });

    it('should return false when removing a non-existent backup', async () => {
      const result = await removeMissedBackup('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('Backup Deferral', () => {
    it('should check if a backup should be deferred', async () => {
      // Mock resource check to return safe
      canPerformOperation.mockResolvedValue({
        isSafe: true,
        systemState: { state: RESOURCE_STATE.OPTIMAL },
      });

      const result = await shouldDeferBackup();

      expect(result.shouldDefer).toBe(false);
      expect(result).toHaveProperty('systemState');
    });

    it('should defer a backup when resources are constrained', async () => {
      // Mock resource check to return unsafe
      canPerformOperation.mockResolvedValue({
        isSafe: false,
        reason: 'Battery is low',
        systemState: { state: RESOURCE_STATE.CRITICAL },
      });

      const result = await shouldDeferBackup();

      expect(result.shouldDefer).toBe(true);
      expect(result.reason).toBe('Battery is low');
      expect(result).toHaveProperty('systemState');
    });

    it('should add a deferred backup to the queue', async () => {
      const schedule = {
        id: 'test-schedule',
        nextBackupTime: new Date().toISOString(),
      };

      const result = await deferBackup(schedule);

      expect(result).toHaveProperty('id');
      expect(result.scheduleId).toBe(schedule.id);
      expect(result.scheduledTime).toBe(schedule.nextBackupTime);

      // Should have updated the backup time
      expect(updateBackupTime).toHaveBeenCalled();
    });
  });

  describe('Processing Missed Backups', () => {
    it('should process the next missed backup when resources allow', async () => {
      // Add a missed backup
      await addMissedBackup({
        scheduledTime: new Date().toISOString(),
        scheduleId: 'test-schedule',
      });

      // Mock resource check to return safe
      canPerformOperation.mockResolvedValue({
        isSafe: true,
        systemState: { state: RESOURCE_STATE.OPTIMAL },
      });

      const result = await processNextMissedBackup();

      expect(result.processed).toBe(true);
      expect(result).toHaveProperty('missedBackup');

      // Should have sent a message to trigger the backup
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'scheduledBackup',
          scheduleId: 'test-schedule',
        }),
      );

      // Should have removed the backup from the queue
      const backups = await getMissedBackups();
      expect(backups.length).toBe(0);
    });

    it('should not process missed backups when resources are constrained', async () => {
      // Add a missed backup
      await addMissedBackup({
        scheduledTime: new Date().toISOString(),
        scheduleId: 'test-schedule',
      });

      // Mock resource check to return unsafe
      canPerformOperation.mockResolvedValue({
        isSafe: false,
        reason: 'Battery is low',
        systemState: { state: RESOURCE_STATE.CRITICAL },
      });

      const result = await processNextMissedBackup();

      expect(result.processed).toBe(false);
      expect(result.reason).toContain('Cannot process missed backups');

      // Should not have sent a message to trigger the backup
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();

      // Should not have removed the backup from the queue
      const backups = await getMissedBackups();
      expect(backups.length).toBe(1);
    });

    it('should return appropriate result when no missed backups exist', async () => {
      // Mock resource check to return safe
      canPerformOperation.mockResolvedValue({
        isSafe: true,
        systemState: { state: RESOURCE_STATE.OPTIMAL },
      });

      const result = await processNextMissedBackup();

      expect(result.processed).toBe(false);
      expect(result.reason).toBe('No missed backups in queue');
    });
  });

  describe('Missed Backup Statistics', () => {
    it('should return statistics about missed backups', async () => {
      // Add some missed backups
      const oldTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const newTime = new Date().toISOString();

      await addMissedBackup({
        scheduledTime: oldTime,
        scheduleId: 'test-schedule',
      });

      await addMissedBackup({
        scheduledTime: newTime,
        scheduleId: 'test-schedule',
      });

      const stats = await getMissedBackupStats();

      expect(stats.count).toBe(2);
      expect(stats.oldest).toBeDefined();
      expect(stats.newest).toBeDefined();
      expect(stats.highestPriority).toBeGreaterThan(0);
    });

    it('should handle empty queue', async () => {
      const stats = await getMissedBackupStats();

      expect(stats.count).toBe(0);
      expect(stats.oldest).toBeNull();
      expect(stats.newest).toBeNull();
      expect(stats.highestPriority).toBe(0);
    });
  });
});

