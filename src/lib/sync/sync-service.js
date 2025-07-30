/**
 * Real Google Drive Sync Service
 *
 * This module implements actual Google Drive API operations for bookmark synchronization,
 * replacing all simulated operations with real API calls.
 */

import { getAuthToken, ensureBookDriveFolder } from '../auth/drive-auth.js';
import {
  uploadFile,
  downloadFile,
  listFiles,
  // deleteFile, // Removed unused import
  uploadBookmarksFile,
  downloadBookmarksFile,
} from '../drive.js';
import { exportBookmarksState, importBookmarksState } from '../bookmarks.js';
import { recordEvent, ANALYTICS_EVENTS } from '../analytics/sync-analytics.js';

// Sync configuration
const SYNC_CONFIG = {
  BOOKMARKS_FILE: 'bookmarks_sync.json',
  BACKUP_FILE_PREFIX: 'bookmarks_backup_',
  METADATA_FILE: 'sync_metadata.json',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
};

// Sync modes
export const SYNC_MODES = {
  HOST_TO_MANY: 'host-to-many',
  GLOBAL: 'global',
};

/**
 * Perform real sync with Google Drive
 * @param {string} mode - Sync mode
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
export async function performRealSync(mode = SYNC_MODES.HOST_TO_MANY, options = {}) {
  const { autoResolveConflicts = true, progressCallback } = options;

  try {
    // Record sync start
    await recordEvent(ANALYTICS_EVENTS.SYNC_STARTED, { mode, autoResolveConflicts });

    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    if (progressCallback) progressCallback(10, 'Starting sync...');

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(true);
    if (!folderId) {
      throw new Error('Failed to create BookDrive folder');
    }

    if (progressCallback) progressCallback(20, 'Exported local bookmarks...');

    // Export current local bookmarks
    const localState = await exportBookmarksState();

    // Upload local state to Google Drive
    // const syncFileName = `${SYNC_CONFIG.BOOKMARKS_FILE}_${mode}_${Date.now()}.json`; // Removed unused variable
    await uploadBookmarksFile(localState, folderId, token);
    if (progressCallback) progressCallback(40, 'Uploaded to Google Drive...');

    // Download remote state (if exists)
    let remoteState = null;
    try {
      const files = await listFiles(
        folderId,
        token,
        `name contains '${SYNC_CONFIG.BOOKMARKS_FILE}' and mimeType='application/json'`,
      );
      if (files.length > 0) {
        // Get the most recent sync file
        const latestFile = files.sort(
          (a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime),
        )[0];
        remoteState = await downloadBookmarksFile(latestFile.id, token);
      }
    } catch (error) {
      console.log('No remote state found, creating initial sync');
    }

    if (progressCallback) progressCallback(60, 'Downloaded remote state...');

    // Compare and merge states
    const syncResult = await mergeBookmarkStates(
      localState,
      remoteState,
      mode,
      autoResolveConflicts,
    );
    if (progressCallback) progressCallback(80, 'Merged bookmark states...');

    // Apply merged state if there are changes
    if (syncResult.hasChanges) {
      await importBookmarksState(syncResult.mergedState, 'merge');
      if (progressCallback) progressCallback(90, 'Applied merged state...');
    }

    // Update sync metadata
    await updateSyncMetadata(folderId, token, {
      lastSync: new Date().toISOString(),
      mode,
      bookmarkCount: syncResult.mergedState.bookmarks.length,
      changes: syncResult.changes,
    });

    if (progressCallback) progressCallback(100, 'Sync completed successfully');

    // Record sync completion
    await recordEvent(ANALYTICS_EVENTS.SYNC_COMPLETED, {
      mode,
      bookmarkCount: syncResult.mergedState.bookmarks.length,
      changes: syncResult.changes,
      conflicts: syncResult.conflicts,
    });

    return {
      success: true,
      bookmarkCount: syncResult.mergedState.bookmarks.length,
      localChanges:
        syncResult.changes.added + syncResult.changes.updated + syncResult.changes.removed,
      conflicts: syncResult.conflicts,
      message: `Sync completed: ${syncResult.changes.added} added, ${syncResult.changes.updated} updated, ${syncResult.changes.removed} removed`,
    };
  } catch (error) {
    console.error('Real sync failed:', error);

    // Record sync failure
    await recordEvent(ANALYTICS_EVENTS.SYNC_FAILED, {
      mode,
      error: error.message,
      errorType: error.name,
    });

    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Create real backup with Google Drive
 * @param {Object} options - Backup options
 * @returns {Promise<Object>} Backup result
 */
export async function createRealBackup(options = {}) {
  const { type = 'manual', description = '', progressCallback } = options;

  try {
    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    if (progressCallback) progressCallback(10, 'Starting backup...');

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(true);
    if (!folderId) {
      throw new Error('Failed to create BookDrive folder');
    }

    if (progressCallback) progressCallback(30, 'Exported bookmarks...');

    // Export current bookmarks
    const bookmarkState = await exportBookmarksState();

    // Create backup metadata
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const backupFileName = `${SYNC_CONFIG.BACKUP_FILE_PREFIX}${backupId}.json`;

    const backupData = {
      id: backupId,
      type,
      description,
      timestamp: new Date().toISOString(),
      bookmarkCount: bookmarkState.bookmarks.length,
      folderCount: bookmarkState.folders.length,
      data: bookmarkState,
    };

    if (progressCallback) progressCallback(50, 'Preparing backup data...');

    // Upload backup to Google Drive
    await uploadFile(backupFileName, backupData, folderId, token);
    if (progressCallback) progressCallback(80, 'Uploaded to Google Drive...');

    // Update backup metadata
    await updateBackupMetadata(folderId, token, backupData);
    if (progressCallback) progressCallback(100, 'Backup completed successfully');

    // Record backup creation
    await recordEvent(ANALYTICS_EVENTS.BACKUP_CREATED, {
      type,
      description,
      backupId,
      bookmarkCount: bookmarkState.bookmarks.length,
    });

    return {
      success: true,
      backupId,
      bookmarkCount: bookmarkState.bookmarks.length,
      message: `Backup created successfully with ${bookmarkState.bookmarks.length} bookmarks`,
    };
  } catch (error) {
    console.error('Real backup failed:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Restore real backup from Google Drive
 * @param {string} backupId - Backup ID to restore
 * @param {Object} options - Restore options
 * @returns {Promise<Object>} Restore result
 */
export async function restoreRealBackup(backupId, options = {}) {
  const { mode = 'replace', progressCallback } = options;

  try {
    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    if (progressCallback) progressCallback(10, 'Starting restore...');

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(false);
    if (!folderId) {
      throw new Error('BookDrive folder not found');
    }

    if (progressCallback) progressCallback(30, 'Found backup file...');

    // Find backup file
    const files = await listFiles(
      folderId,
      token,
      `name contains '${backupId}' and mimeType='application/json'`,
    );
    if (files.length === 0) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Download backup data
    const backupData = await downloadFile(files[0].id, token);
    if (progressCallback) progressCallback(50, 'Downloaded backup data...');

    // Validate backup data
    if (!backupData.data || !backupData.data.bookmarks) {
      throw new Error('Invalid backup data format');
    }

    if (progressCallback) progressCallback(70, 'Validating backup data...');

    // Restore bookmarks
    await importBookmarksState(backupData.data, mode);
    if (progressCallback) progressCallback(100, 'Restore completed successfully');

    return {
      success: true,
      backupId,
      bookmarkCount: backupData.bookmarkCount,
      message: `Restore completed: ${backupData.bookmarkCount} bookmarks restored`,
    };
  } catch (error) {
    console.error('Real restore failed:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Merge bookmark states
 * @param {Object} localState - Local bookmark state
 * @param {Object} remoteState - Remote bookmark state
 * @param {string} mode - Sync mode
 * @param {boolean} autoResolveConflicts - Auto resolve conflicts
 * @returns {Promise<Object>} Merge result
 */
async function mergeBookmarkStates(localState, remoteState, mode, autoResolveConflicts) {
  if (!remoteState) {
    return {
      mergedState: localState,
      hasChanges: false,
      changes: { added: 0, updated: 0, removed: 0 },
      conflicts: 0,
    };
  }

  const changes = { added: 0, updated: 0, removed: 0 };
  let conflicts = 0;

  // Create maps for efficient lookup
  const localBookmarks = new Map(localState.bookmarks.map((b) => [b.id, b]));
  const remoteBookmarks = new Map(remoteState.bookmarks.map((b) => [b.id, b]));

  const mergedBookmarks = [];
  const processedIds = new Set();

  // Process all bookmarks
  for (const [id, localBookmark] of localBookmarks) {
    const remoteBookmark = remoteBookmarks.get(id);

    if (remoteBookmark) {
      // Bookmark exists in both - check for conflicts
      if (localBookmark.dateModified !== remoteBookmark.dateModified) {
        conflicts++;
        if (autoResolveConflicts) {
          // Prefer the newer version
          const localTime = new Date(localBookmark.dateModified || 0).getTime();
          const remoteTime = new Date(remoteBookmark.dateModified || 0).getTime();
          const chosenBookmark = localTime > remoteTime ? localBookmark : remoteBookmark;
          mergedBookmarks.push(chosenBookmark);
          changes.updated++;
        }
      } else {
        mergedBookmarks.push(localBookmark);
      }
    } else {
      // Only in local - add
      mergedBookmarks.push(localBookmark);
      changes.added++;
    }
    processedIds.add(id);
  }

  // Add bookmarks only in remote
  for (const [id, remoteBookmark] of remoteBookmarks) {
    if (!processedIds.has(id)) {
      mergedBookmarks.push(remoteBookmark);
      changes.added++;
    }
  }

  const mergedState = {
    ...localState,
    bookmarks: mergedBookmarks,
    lastSync: new Date().toISOString(),
  };

  return {
    mergedState,
    hasChanges: changes.added > 0 || changes.updated > 0 || changes.removed > 0,
    changes,
    conflicts,
  };
}

/**
 * Update sync metadata
 * @param {string} folderId - Google Drive folder ID
 * @param {string} token - Auth token
 * @param {Object} metadata - Metadata to update
 */
async function updateSyncMetadata(folderId, token, metadata) {
  try {
    const metadataFile = SYNC_CONFIG.METADATA_FILE;
    let existingMetadata = {};

    // Try to download existing metadata
    try {
      const files = await listFiles(
        folderId,
        token,
        `name='${metadataFile}' and mimeType='application/json'`,
      );
      if (files.length > 0) {
        existingMetadata = await downloadFile(files[0].id, token);
      }
    } catch (error) {
      console.log('No existing metadata found');
    }

    // Update metadata
    const updatedMetadata = {
      ...existingMetadata,
      ...metadata,
      updatedAt: new Date().toISOString(),
    };

    // Upload updated metadata
    await uploadFile(metadataFile, updatedMetadata, folderId, token);
  } catch (error) {
    console.error('Failed to update sync metadata:', error);
  }
}

/**
 * Update backup metadata
 * @param {string} folderId - Google Drive folder ID
 * @param {string} token - Auth token
 * @param {Object} backupData - Backup data
 */
async function updateBackupMetadata(folderId, token, backupData) {
  try {
    const backupMetadataFile = 'backup_metadata.json';
    let existingMetadata = { backups: [] };

    // Try to download existing metadata
    try {
      const files = await listFiles(
        folderId,
        token,
        `name='${backupMetadataFile}' and mimeType='application/json'`,
      );
      if (files.length > 0) {
        existingMetadata = await downloadFile(files[0].id, token);
      }
    } catch (error) {
      console.log('No existing backup metadata found');
    }

    // Add new backup to metadata
    existingMetadata.backups.push({
      id: backupData.id,
      type: backupData.type,
      description: backupData.description,
      timestamp: backupData.timestamp,
      bookmarkCount: backupData.bookmarkCount,
    });

    // Keep only last 50 backups
    if (existingMetadata.backups.length > 50) {
      existingMetadata.backups = existingMetadata.backups.slice(-50);
    }

    // Upload updated metadata
    await uploadFile(backupMetadataFile, existingMetadata, folderId, token);
  } catch (error) {
    console.error('Failed to update backup metadata:', error);
  }
}
