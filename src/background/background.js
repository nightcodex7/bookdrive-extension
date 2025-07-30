// Background script for BookDrive
console.log('BookDrive background script loaded');

import {
  isAuthenticated,
  ensureBookDriveFolder,
  createBackupMetadata,
  saveBackup,
  getAllBackups,
  scheduleBackupRetry,
  BACKUP_TYPES,
  BACKUP_STATUS,
  showToast,
  updateBackupProgress,
  showBackupNotification,
  // showRestorationNotification,
} from '../lib/index.js';

// Import real sync service
import {
  performRealSync,
  createRealBackup,
  restoreRealBackup,
  SYNC_MODES,
} from '../lib/sync/sync-service.js';

// Global state
let syncInProgress = false;
let authInitialized = false;

// Log a sync event
function logSyncEvent(event) {
  chrome.storage.local.get({ syncLog: [] }, (data) => {
    const log = data.syncLog || [];
    log.unshift(event);
    if (log.length > 100) log.length = 100;
    chrome.storage.local.set({ syncLog: log });
  });
}

// Show toast notification in popup if open
function showNotification(message, type = 'info') {
  showToast(message, type);

  // Also log to console
  console.log(`[${type}] ${message}`);
}

// Initialize authentication on extension startup
async function initializeAuth() {
  if (authInitialized) return;

  try {
    // Check if user is authenticated
    const authenticated = await isAuthenticated();

    if (authenticated) {
      // If successful, ensure folder exists
      const folderId = await ensureBookDriveFolder(false);
      console.log(`Using folder ID: ${folderId}`);
      authInitialized = true;
    }
  } catch (error) {
    console.log('Auth check failed, will prompt on user action:', error.message);
    // We'll prompt the user when they interact with the extension
  }
}

// Handle messages from popup and other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  if (message.action === 'syncNow') {
    // Ensure we're authenticated before syncing
    initializeAuth()
      .then(async () => {
        if (syncInProgress) {
          sendResponse({ status: 'error', error: 'Sync already in progress' });
          return;
        }

        syncInProgress = true;

        try {
          // Get current sync mode from settings
          const result = await chrome.storage.sync.get({ syncMode: 'host-to-many' });
          const syncMode =
            result.syncMode === 'global' ? SYNC_MODES.GLOBAL : SYNC_MODES.HOST_TO_MANY;

          // Perform real sync
          const syncResult = await performRealSync(syncMode, {
            autoResolveConflicts: true,
          });

          if (syncResult.success) {
            const now = new Date().toISOString();

            // Update storage with sync results
            chrome.storage.local.set({
              lastSync: now,
              lastSyncStatus: 'success',
              lastChange: now,
            });

            // Log the sync event
            logSyncEvent({
              time: now,
              mode: 'manual',
              status: 'success',
              bookmarkCount: syncResult.bookmarkCount,
              changes: syncResult.localChanges,
              conflicts: syncResult.conflicts,
            });

            syncInProgress = false;
            sendResponse({ status: 'ok', result: syncResult });
          } else {
            throw new Error(syncResult.message || 'Sync failed');
          }
        } catch (error) {
          console.error('Real sync failed:', error);
          syncInProgress = false;
          sendResponse({ status: 'error', error: error.message });
          showNotification(`Sync failed: ${error.message}`, 'error');
        }
      })
      .catch((_error) => {
        syncInProgress = false;
        sendResponse({ status: 'error', error: 'Authentication failed' });
        showNotification('Authentication failed', 'error');
      });

    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'manualBackup') {
    // Ensure we're authenticated before backup
    initializeAuth()
      .then(async () => {
        try {
          // Create real backup
          const backupResult = await createRealBackup({
            type: 'manual',
            description: 'Manual backup from background',
            progressCallback: (progress, message) => {
              // Update progress in storage for popup to read
              chrome.storage.local.set({
                backupProgress: { progress, message, timestamp: Date.now() },
              });
            },
          });

          if (backupResult.success) {
            const now = new Date().toISOString();

            // Log the backup event
            logSyncEvent({
              time: now,
              mode: 'backup',
              status: 'success',
              backupId: backupResult.backupId,
              bookmarkCount: backupResult.bookmarkCount,
            });

            sendResponse({ status: 'ok', result: backupResult });
          } else {
            throw new Error(backupResult.message || 'Backup failed');
          }
        } catch (error) {
          console.error('Real backup failed:', error);
          sendResponse({ status: 'error', error: error.message });
          showNotification(`Backup failed: ${error.message}`, 'error');
        }
      })
      .catch((_error) => {
        sendResponse({ status: 'error', error: 'Authentication failed' });
        showNotification('Authentication failed', 'error');
      });

    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'getSyncLog') {
    chrome.storage.local.get({ syncLog: [] }, (data) => {
      sendResponse({ log: data.syncLog });
    });

    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'showNotification' || message.action === 'showToast') {
    showNotification(message.message, message.type);
    return true;
  }

  if (message.action === 'checkAuthStatus') {
    initializeAuth()
      .then(() => {
        sendResponse({ status: 'authenticated', initialized: authInitialized });
      })
      .catch((error) => {
        sendResponse({ status: 'unauthenticated', error: error.message });
      });
    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'getFolderInfo') {
    chrome.storage.local.get(['bookDriveFolderId'], (result) => {
      if (result.bookDriveFolderId) {
        sendResponse({
          folderId: result.bookDriveFolderId,
          folderName: 'MyExtensionData',
        });
      } else {
        sendResponse({ folderId: null });
      }
    });
    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'updateBackupAlarm') {
    (async () => {
      try {
        const { updateBackupAlarm } = await import('../lib/index.js');
        await updateBackupAlarm();
        sendResponse({ status: 'ok' });
      } catch (error) {
        console.error('Failed to update backup alarm:', error);
        sendResponse({ status: 'error', error: error.message });
      }
    })();
    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'clearBackupAlarms') {
    (async () => {
      try {
        const { clearBackupAlarms } = await import('../lib/index.js');
        await clearBackupAlarms();
        sendResponse({ status: 'ok' });
      } catch (error) {
        console.error('Failed to clear backup alarms:', error);
        sendResponse({ status: 'error', error: error.message });
      }
    })();
    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'restoreBackup') {
    // Ensure we're authenticated before restoring
    initializeAuth()
      .then(async () => {
        try {
          const { backupId } = message;

          if (!backupId) {
            throw new Error('Backup ID is required');
          }

          // Perform real restore
          const restoreResult = await restoreRealBackup(backupId, {
            mode: 'replace',
            progressCallback: (progress, message) => {
              // Update progress in storage for popup to read
              chrome.storage.local.set({
                restoreProgress: { progress, message, timestamp: Date.now() },
              });
            },
          });

          if (restoreResult.success) {
            const now = new Date().toISOString();

            // Log the restore event
            logSyncEvent({
              time: now,
              mode: 'restore',
              status: 'success',
              backupId: backupId,
              bookmarkCount: restoreResult.bookmarkCount,
            });

            sendResponse({
              success: true,
              backupId: backupId,
              message: restoreResult.message,
              bookmarkCount: restoreResult.bookmarkCount,
            });
          } else {
            throw new Error(restoreResult.message || 'Restore failed');
          }
        } catch (error) {
          console.error('Real restore failed:', error);
          sendResponse({ status: 'error', error: error.message });
          showNotification(`Restore failed: ${error.message}`, 'error');
        }
      })
      .catch((_error) => {
        sendResponse({ status: 'error', error: 'Authentication failed' });
        showNotification('Authentication failed', 'error');
      });

    return true; // Keep the message channel open for the async response
  }

  if (message.action === 'scheduledBackup') {
    // Ensure we're authenticated before backup
    initializeAuth()
      .then(async () => {
        try {
          // Ensure folder exists
          await ensureBookDriveFolder(false);

          // Get schedule ID from message if available
          const scheduleId = message.scheduleId || null;

          // Check if this is a retry for an existing backup or a missed backup
          let backupMetadata;
          if (message.backupId) {
            // Get existing backup metadata
            const backups = await getAllBackups();
            const existingBackup = backups.find((b) => b.id === message.backupId);

            if (existingBackup) {
              // Update existing backup metadata
              backupMetadata = existingBackup;
              backupMetadata.status = BACKUP_STATUS.IN_PROGRESS;
              backupMetadata.updatedAt = new Date().toISOString();
            } else {
              // Create new backup metadata if existing one not found
              backupMetadata = createBackupMetadata({
                id: message.backupId,
                type: BACKUP_TYPES.SCHEDULED,
                status: BACKUP_STATUS.IN_PROGRESS,
                scheduleId: scheduleId,
                filename: `bookmarks_scheduled_${Date.now()}.json`,
                attempt: message.attempt || 1,
                maxAttempts: 3,
              });
            }
          } else if (message.missedBackupId) {
            // This is a missed backup being processed
            backupMetadata = createBackupMetadata({
              type: BACKUP_TYPES.SCHEDULED,
              status: BACKUP_STATUS.IN_PROGRESS,
              scheduleId: scheduleId,
              filename: `bookmarks_scheduled_${Date.now()}.json`,
              attempt: 1,
              maxAttempts: 3,
              missedBackupId: message.missedBackupId,
              originalScheduledTime: message.originalScheduledTime,
            });
          } else {
            // Create new backup metadata
            backupMetadata = createBackupMetadata({
              type: BACKUP_TYPES.SCHEDULED,
              status: BACKUP_STATUS.IN_PROGRESS,
              scheduleId: scheduleId,
              filename: `bookmarks_scheduled_${Date.now()}.json`,
              attempt: message.attempt || 1,
              maxAttempts: 3,
            });
          }

          // Save initial backup metadata
          await saveBackup(backupMetadata);

          // Send initial progress update
          updateBackupProgress(backupMetadata.id, 0, 'Starting scheduled backup...');

          // Simulate backup process with progress updates
          let progress = 0;
          const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
              updateBackupProgress(
                backupMetadata.id,
                progress,
                `Backing up bookmarks (${progress}%)...`,
              );
            }
          }, 100);

          // Perform scheduled backup
          setTimeout(async () => {
            try {
              clearInterval(progressInterval);
              updateBackupProgress(backupMetadata.id, 100, 'Finalizing backup...');

              const now = new Date().toISOString();

              // Simulate a random failure for testing purposes (10% chance)
              // In a real implementation, this would be replaced with actual backup logic
              const shouldFail = Math.random() < 0.1;

              if (shouldFail) {
                throw new Error('Simulated backup failure');
              }

              // Count bookmarks
              chrome.bookmarks.getTree(async (tree) => {
                try {
                  let count = 0;

                  function countBookmarks(nodes) {
                    for (const node of nodes) {
                      if (node.url) count++;
                      if (node.children) countBookmarks(node.children);
                    }
                  }

                  countBookmarks(tree);

                  // Update backup metadata
                  const updatedMetadata = {
                    ...backupMetadata,
                    status: BACKUP_STATUS.SUCCESS,
                    timestamp: now,
                    bookmarkCount: count,
                    updatedAt: now,
                  };

                  // Save updated backup metadata
                  await saveBackup(updatedMetadata);

                  // Enforce retention policy if this is a scheduled backup with a scheduleId
                  if (scheduleId) {
                    try {
                      const { getRetentionCount, enforceRetentionPolicy } = await import(
                        '../lib/index.js'
                      );

                      // Get retention count from schedule settings
                      const retentionCount = await getRetentionCount();

                      // Enforce retention policy
                      const removedCount = await enforceRetentionPolicy(scheduleId, retentionCount);

                      if (removedCount > 0) {
                        console.log(
                          `Removed ${removedCount} old backups based on retention policy`,
                        );
                      }
                    } catch (retentionError) {
                      console.error('Failed to enforce retention policy:', retentionError);
                    }
                  }

                  // Log the backup event
                  logSyncEvent({
                    time: now,
                    mode: 'scheduled',
                    status: 'success',
                    type: 'backup',
                    backupId: backupMetadata.id,
                    scheduleId: scheduleId,
                    attempt: backupMetadata.attempt,
                    missedBackupId: backupMetadata.missedBackupId,
                    originalScheduledTime: backupMetadata.originalScheduledTime,
                  });

                  sendResponse({ status: 'ok', backupId: backupMetadata.id });

                  // Show appropriate notification based on whether this was a missed backup
                  if (backupMetadata.missedBackupId) {
                    const originalTime = new Date(
                      backupMetadata.originalScheduledTime,
                    ).toLocaleString();
                    const successMessage = `Deferred backup from ${originalTime} completed successfully with ${count} bookmarks`;
                    showBackupNotification(updatedMetadata, true, successMessage);
                  } else {
                    const successMessage = `Scheduled backup completed successfully with ${count} bookmarks`;
                    showBackupNotification(updatedMetadata, true, successMessage);
                  }
                } catch (error) {
                  handleBackupError(error, backupMetadata, scheduleId, sendResponse);
                }
              });
            } catch (error) {
              clearInterval(progressInterval);
              handleBackupError(error, backupMetadata, scheduleId, sendResponse);
            }
          }, 1000);
        } catch (error) {
          sendResponse({ status: 'error', error: error.message });
          showBackupNotification(
            { type: BACKUP_TYPES.SCHEDULED },
            false,
            `Scheduled backup failed: ${error.message}`,
          );
        }
      })
      .catch((_error) => {
        sendResponse({ status: 'error', error: 'Authentication failed' });
        showNotification('Authentication failed', 'error');
      });

    return true; // Keep the message channel open for the async response
  }
});

// Set up alarm for auto sync
chrome.alarms.create('autoSync', { periodInMinutes: 30 });

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  // Handle scheduled backup alarms
  if (alarm.name === 'scheduledBackup' || alarm.name === 'backupRetry') {
    (async () => {
      try {
        const { handleAlarm } = await import('../lib/scheduling/alarm-manager.js');
        await handleAlarm(alarm);
      } catch (error) {
        console.error('Failed to handle alarm:', error);
      }
    })();
    return;
  }

  // Handle auto sync alarm
  if (alarm.name === 'autoSync') {
    // Check if auto sync is enabled
    chrome.storage.sync.get({ autoSync: true }, (data) => {
      if (data.autoSync && !syncInProgress) {
        // Ensure we're authenticated before syncing
        initializeAuth()
          .then(async () => {
            try {
              // Ensure folder exists
              await ensureBookDriveFolder(false);

              // Trigger auto sync
              const now = new Date().toISOString();

              // Count bookmarks
              chrome.bookmarks.getTree((tree) => {
                let count = 0;

                function countBookmarks(nodes) {
                  for (const node of nodes) {
                    if (node.url) count++;
                    if (node.children) countBookmarks(node.children);
                  }
                }

                countBookmarks(tree);

                // Update storage with sync results
                chrome.storage.local.set({
                  lastSync: now,
                  lastSyncStatus: 'success',
                  lastChange: now,
                });

                // Log the sync event
                logSyncEvent({
                  time: now,
                  mode: 'auto',
                  status: 'success',
                  bookmarkCount: count,
                });
              });
            } catch (error) {
              console.error('Auto sync failed:', error);
              logSyncEvent({
                time: new Date().toISOString(),
                mode: 'auto',
                status: 'error',
                error: error.message,
              });
            }
          })
          .catch((error) => {
            console.error('Auto sync auth failed:', error);
            logSyncEvent({
              time: new Date().toISOString(),
              mode: 'auto',
              status: 'error',
              error: 'Authentication failed',
            });
          });
      }
    });
  }
});

/**
 * Handle backup error and schedule retry if appropriate
 * @param {Error} error The error that occurred
 * @param {Object} backupMetadata The backup metadata
 * @param {string} scheduleId The schedule ID
 * @param {Function} sendResponse The response function
 */
async function handleBackupError(error, backupMetadata, scheduleId, sendResponse) {
  console.error('Backup failed:', error);

  try {
    // Schedule a retry
    const updatedBackup = await scheduleBackupRetry(backupMetadata.id);

    if (updatedBackup && updatedBackup.status === BACKUP_STATUS.RETRY_PENDING) {
      // If retry was scheduled successfully
      const nextRetryTime = new Date(updatedBackup.nextRetryTime);

      // Log the failure and scheduled retry
      logSyncEvent({
        time: new Date().toISOString(),
        mode: 'scheduled',
        status: 'failed',
        type: 'backup',
        backupId: backupMetadata.id,
        scheduleId: scheduleId,
        attempt: backupMetadata.attempt,
        nextRetry: updatedBackup.nextRetryTime,
      });

      sendResponse({
        status: 'retry_scheduled',
        backupId: backupMetadata.id,
        nextRetry: updatedBackup.nextRetryTime,
        attempt: updatedBackup.attempt,
      });

      // Update progress indicator to show retry status
      updateBackupProgress(
        backupMetadata.id,
        0,
        `Backup failed, retry ${updatedBackup.attempt} of ${updatedBackup.maxAttempts} scheduled for ${nextRetryTime.toLocaleString()}`,
      );

      // Show notification with enhanced details
      const warningMessage = `Backup failed, retry ${updatedBackup.attempt} of ${updatedBackup.maxAttempts} scheduled for ${nextRetryTime.toLocaleString()}`;
      showBackupNotification(updatedBackup, false, warningMessage);
    } else if (updatedBackup && updatedBackup.status === BACKUP_STATUS.FAILED) {
      // If maximum retries reached
      logSyncEvent({
        time: new Date().toISOString(),
        mode: 'scheduled',
        status: 'failed',
        type: 'backup',
        backupId: backupMetadata.id,
        scheduleId: scheduleId,
        attempt: backupMetadata.attempt,
        error: 'Maximum retry attempts reached',
      });

      sendResponse({
        status: 'error',
        error: 'Maximum retry attempts reached',
        backupId: backupMetadata.id,
      });

      // Update progress indicator to show failure
      updateBackupProgress(backupMetadata.id, 100, 'Backup failed after maximum retry attempts');

      // Show notification with enhanced details
      const errorMessage = `Backup failed after ${updatedBackup.maxAttempts} retry attempts`;
      showBackupNotification(updatedBackup, false, errorMessage);
    } else {
      // If retry scheduling failed
      logSyncEvent({
        time: new Date().toISOString(),
        mode: 'scheduled',
        status: 'failed',
        type: 'backup',
        backupId: backupMetadata.id,
        scheduleId: scheduleId,
        error: error.message,
      });

      sendResponse({
        status: 'error',
        error: error.message,
        backupId: backupMetadata.id,
      });

      // Update progress indicator to show failure
      updateBackupProgress(backupMetadata.id, 100, `Backup failed: ${error.message}`);

      // Show notification with enhanced details
      showBackupNotification(backupMetadata, false, `Backup failed: ${error.message}`);
    }
  } catch (retryError) {
    console.error('Failed to schedule retry:', retryError);

    // Log the failure
    logSyncEvent({
      time: new Date().toISOString(),
      mode: 'scheduled',
      status: 'failed',
      type: 'backup',
      backupId: backupMetadata.id,
      scheduleId: scheduleId,
      error: error.message,
      retryError: retryError.message,
    });

    sendResponse({
      status: 'error',
      error: error.message,
      retryError: retryError.message,
      backupId: backupMetadata.id,
    });

    // Update progress indicator to show failure
    updateBackupProgress(backupMetadata.id, 100, `Backup failed: ${error.message}`);

    // Show notification with enhanced details
    showBackupNotification(backupMetadata, false, `Backup failed: ${error.message}`);
  }
}

// Initialize authentication on extension startup
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated, initializing auth...');
  initializeAuth();

  // Initialize backup alarms
  (async () => {
    try {
      const { initializeBackupAlarms } = await import('../lib/scheduling/alarm-manager.js');
      await initializeBackupAlarms();
      console.log('Backup alarms initialized');
    } catch (error) {
      console.error('Failed to initialize backup alarms:', error);
    }
  })();
});
