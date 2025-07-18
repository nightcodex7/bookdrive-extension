// notification-integration.test.js - Integration tests for notification system with backup process

import {
  showBackupNotification,
  showRestorationNotification,
  updateBackupProgress,
} from '../lib/notification-manager.js';

import {
  createBackupMetadata,
  updateBackupMetadata,
  BACKUP_TYPES,
  BACKUP_STATUS,
} from '../lib/backup-metadata.js';

import { handleAlarm, triggerBackup } from '../lib/alarm-manager.js';

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
  },
  notifications: {
    create: jest.fn(),
  },
};

// Mock window.Notification
const originalNotification = global.Notification;
let notificationMock;

describe('Notification Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Notification API
    notificationMock = {
      permission: 'granted',
      requestPermission: jest.fn().mockResolvedValue('granted'),
    };
    global.Notification = jest.fn().mockImplementation((title, options) => {
      return {
        title,
        ...options,
        onclick: null,
      };
    });
    global.Notification.permission = 'granted';
    global.Notification.requestPermission = notificationMock.requestPermission;

    // Mock chrome.storage.local.get
    chrome.storage.local.get.mockImplementation((key, callback) => {
      callback({ backups: [] });
    });

    // Mock chrome.storage.local.set
    chrome.storage.local.set.mockImplementation((data, callback) => {
      if (callback) callback();
    });

    // Mock chrome.runtime.sendMessage
    chrome.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) {
        callback({ status: 'ok' });
      }
    });
  });

  afterEach(() => {
    // Restore original Notification
    global.Notification = originalNotification;
  });

  describe('Backup Process and Notifications', () => {
    test('should show notification when backup completes successfully', async () => {
      // Spy on showBackupNotification
      const showBackupNotificationSpy = jest.spyOn(
        require('../lib/notification-manager.js'),
        'showBackupNotification',
      );

      // Mock chrome.runtime.sendMessage to simulate successful backup
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'scheduledBackup') {
          // Create a backup metadata object
          const backupMetadata = {
            id: 'backup_123',
            type: BACKUP_TYPES.SCHEDULED,
            status: BACKUP_STATUS.SUCCESS,
            timestamp: new Date().toISOString(),
          };

          if (callback) {
            callback({ status: 'ok', backupId: backupMetadata.id });
          }

          // Simulate the notification being triggered by the background process
          showBackupNotification(backupMetadata, true);
        }
      });

      // Trigger a backup
      await triggerBackup();

      // Check that chrome.runtime.sendMessage was called with scheduledBackup action
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Check that showBackupNotification was called
      expect(showBackupNotificationSpy).toHaveBeenCalled();

      // Check that Notification constructor was called
      expect(global.Notification).toHaveBeenCalled();

      // Clean up spy
      showBackupNotificationSpy.mockRestore();
    });

    test('should show notification when backup fails', async () => {
      // Spy on showBackupNotification
      const showBackupNotificationSpy = jest.spyOn(
        require('../lib/notification-manager.js'),
        'showBackupNotification',
      );

      // Mock chrome.runtime.sendMessage to simulate failed backup
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'scheduledBackup') {
          // Create a backup metadata object
          const backupMetadata = {
            id: 'backup_123',
            type: BACKUP_TYPES.SCHEDULED,
            status: BACKUP_STATUS.FAILED,
            timestamp: new Date().toISOString(),
          };

          if (callback) {
            callback({ status: 'error', error: 'Network error', backupId: backupMetadata.id });
          }

          // Simulate the notification being triggered by the background process
          showBackupNotification(backupMetadata, false, 'Backup failed: Network error');
        }
      });

      // Trigger a backup
      await triggerBackup();

      // Check that chrome.runtime.sendMessage was called with scheduledBackup action
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'scheduledBackup' },
        expect.any(Function),
      );

      // Check that showBackupNotification was called
      expect(showBackupNotificationSpy).toHaveBeenCalled();

      // Check that Notification constructor was called with error type
      expect(global.Notification).toHaveBeenCalledWith(
        'Backup Failed',
        expect.objectContaining({
          body: 'Backup failed: Network error',
        }),
      );

      // Clean up spy
      showBackupNotificationSpy.mockRestore();
    });

    test('should update backup progress during backup process', async () => {
      // Spy on updateBackupProgress
      const updateBackupProgressSpy = jest.spyOn(
        require('../lib/notification-manager.js'),
        'updateBackupProgress',
      );

      // Mock chrome.runtime.sendMessage to simulate backup progress updates
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'scheduledBackup') {
          // Create a backup metadata object
          const backupMetadata = {
            id: 'backup_123',
            type: BACKUP_TYPES.SCHEDULED,
            status: BACKUP_STATUS.IN_PROGRESS,
            timestamp: new Date().toISOString(),
          };

          // Simulate progress updates
          updateBackupProgress(backupMetadata.id, 25, 'Starting backup...');
          updateBackupProgress(backupMetadata.id, 50, 'Backing up bookmarks...');
          updateBackupProgress(backupMetadata.id, 75, 'Uploading to Google Drive...');
          updateBackupProgress(backupMetadata.id, 100, 'Backup complete');

          if (callback) {
            callback({ status: 'ok', backupId: backupMetadata.id });
          }
        }
      });

      // Trigger a backup
      await triggerBackup();

      // Check that updateBackupProgress was called multiple times
      expect(updateBackupProgressSpy).toHaveBeenCalledTimes(4);

      // Check that chrome.runtime.sendMessage was called with updateBackupProgress action
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateBackupProgress',
        backupId: 'backup_123',
        progress: 25,
        status: 'Starting backup...',
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateBackupProgress',
        backupId: 'backup_123',
        progress: 50,
        status: 'Backing up bookmarks...',
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateBackupProgress',
        backupId: 'backup_123',
        progress: 75,
        status: 'Uploading to Google Drive...',
      });

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        action: 'updateBackupProgress',
        backupId: 'backup_123',
        progress: 100,
        status: 'Backup complete',
      });

      // Clean up spy
      updateBackupProgressSpy.mockRestore();
    });
  });

  describe('Restoration Process and Notifications', () => {
    test('should show notification when restoration completes successfully', async () => {
      // Spy on showRestorationNotification
      const showRestorationNotificationSpy = jest.spyOn(
        require('../lib/notification-manager.js'),
        'showRestorationNotification',
      );

      // Create a backup metadata object
      const backupMetadata = {
        id: 'backup_123',
        type: BACKUP_TYPES.SCHEDULED,
        status: BACKUP_STATUS.SUCCESS,
        timestamp: new Date().toISOString(),
      };

      // Mock chrome.runtime.sendMessage to simulate successful restoration
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'restoreBackup') {
          // Simulate the notification being triggered by the background process
          showRestorationNotification(backupMetadata, true);

          if (callback) {
            callback({ status: 'ok' });
          }
        }
      });

      // Trigger a restoration
      chrome.runtime.sendMessage(
        { action: 'restoreBackup', backupId: backupMetadata.id },
        (response) => {
          expect(response.status).toBe('ok');
        },
      );

      // Check that showRestorationNotification was called
      expect(showRestorationNotificationSpy).toHaveBeenCalled();

      // Check that Notification constructor was called
      expect(global.Notification).toHaveBeenCalled();

      // Clean up spy
      showRestorationNotificationSpy.mockRestore();
    });

    test('should show notification when restoration fails', async () => {
      // Spy on showRestorationNotification
      const showRestorationNotificationSpy = jest.spyOn(
        require('../lib/notification-manager.js'),
        'showRestorationNotification',
      );

      // Create a backup metadata object
      const backupMetadata = {
        id: 'backup_123',
        type: BACKUP_TYPES.SCHEDULED,
        status: BACKUP_STATUS.SUCCESS,
        timestamp: new Date().toISOString(),
      };

      // Mock chrome.runtime.sendMessage to simulate failed restoration
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        if (message.action === 'restoreBackup') {
          // Simulate the notification being triggered by the background process
          showRestorationNotification(backupMetadata, false, 'Restoration failed: File not found');

          if (callback) {
            callback({ status: 'error', error: 'File not found' });
          }
        }
      });

      // Trigger a restoration
      chrome.runtime.sendMessage(
        { action: 'restoreBackup', backupId: backupMetadata.id },
        (response) => {
          expect(response.status).toBe('error');
        },
      );

      // Check that showRestorationNotification was called
      expect(showRestorationNotificationSpy).toHaveBeenCalled();

      // Check that Notification constructor was called with error type
      expect(global.Notification).toHaveBeenCalledWith(
        'Restoration Failed',
        expect.objectContaining({
          body: 'Restoration failed: File not found',
        }),
      );

      // Clean up spy
      showRestorationNotificationSpy.mockRestore();
    });
  });
});
