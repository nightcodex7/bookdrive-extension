/**
 * Sync Preview Module
 * Shows what changes will be made before syncing
 */

import { exportBookmarksState } from '../bookmarks.js';
import { getAuthToken, ensureBookDriveFolder } from '../auth/drive-auth.js';
import { listFiles, downloadBookmarksFile } from '../drive.js';

/**
 * Generate sync preview
 * @param {string} mode - Sync mode
 * @returns {Promise<Object>} Preview data
 */
export async function generateSyncPreview(mode = 'host-to-many') {
  try {
    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Export current local bookmarks
    const localState = await exportBookmarksState();

    // Get remote state
    let remoteState = null;
    try {
      const folderId = await ensureBookDriveFolder(false);
      if (folderId) {
        const files = await listFiles(
          folderId,
          token,
          `name contains 'bookmarks_sync' and mimeType='application/json'`,
        );
        if (files.length > 0) {
          const latestFile = files.sort(
            (a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime),
          )[0];
          remoteState = await downloadBookmarksFile(latestFile.id, token);
        }
      }
    } catch (error) {
      console.log('No remote state found for preview');
    }

    // Generate preview
    const preview = await analyzeChanges(localState, remoteState, mode);

    return {
      success: true,
      preview,
      localBookmarkCount: localState.bookmarks.length,
      remoteBookmarkCount: remoteState ? remoteState.bookmarks.length : 0,
    };
  } catch (error) {
    console.error('Failed to generate sync preview:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Analyze changes between local and remote states
 * @param {Object} localState - Local bookmark state
 * @param {Object} remoteState - Remote bookmark state
 * @param {string} mode - Sync mode
 * @returns {Object} Change analysis
 */
async function analyzeChanges(localState, remoteState, mode) {
  if (!remoteState) {
    return {
      type: 'initial_sync',
      changes: {
        added: localState.bookmarks.length,
        updated: 0,
        removed: 0,
        conflicts: 0,
      },
      details: {
        newBookmarks: localState.bookmarks,
        updatedBookmarks: [],
        removedBookmarks: [],
        conflicts: [],
      },
    };
  }

  const changes = {
    added: 0,
    updated: 0,
    removed: 0,
    conflicts: 0,
  };

  const details = {
    newBookmarks: [],
    updatedBookmarks: [],
    removedBookmarks: [],
    conflicts: [],
  };

  // Create maps for efficient lookup
  const localBookmarks = new Map(localState.bookmarks.map((b) => [b.id, b]));
  const remoteBookmarks = new Map(remoteState.bookmarks.map((b) => [b.id, b]));

  // Find new bookmarks (in local but not in remote)
  for (const [id, localBookmark] of localBookmarks) {
    if (!remoteBookmarks.has(id)) {
      changes.added++;
      details.newBookmarks.push(localBookmark);
    }
  }

  // Find updated bookmarks and conflicts
  for (const [id, localBookmark] of localBookmarks) {
    const remoteBookmark = remoteBookmarks.get(id);
    if (remoteBookmark) {
      if (localBookmark.dateModified !== remoteBookmark.dateModified) {
        if (mode === 'global') {
          // In global mode, this is a conflict
          changes.conflicts++;
          details.conflicts.push({
            id,
            local: localBookmark,
            remote: remoteBookmark,
          });
        } else {
          // In host-to-many mode, local wins
          changes.updated++;
          details.updatedBookmarks.push({
            id,
            local: localBookmark,
            remote: remoteBookmark,
          });
        }
      }
    }
  }

  // Find removed bookmarks (in remote but not in local)
  for (const [id, remoteBookmark] of remoteBookmarks) {
    if (!localBookmarks.has(id)) {
      changes.removed++;
      details.removedBookmarks.push(remoteBookmark);
    }
  }

  return {
    type: 'sync_preview',
    changes,
    details,
  };
}

/**
 * Get sync preview summary
 * @param {Object} preview - Preview data
 * @returns {Object} Summary
 */
export function getPreviewSummary(preview) {
  const { changes } = preview;
  const totalChanges = changes.added + changes.updated + changes.removed + changes.conflicts;

  let summary = '';
  if (totalChanges === 0) {
    summary = 'No changes detected';
  } else {
    const parts = [];
    if (changes.added > 0) parts.push(`${changes.added} new`);
    if (changes.updated > 0) parts.push(`${changes.updated} updated`);
    if (changes.removed > 0) parts.push(`${changes.removed} removed`);
    if (changes.conflicts > 0) parts.push(`${changes.conflicts} conflicts`);
    summary = parts.join(', ');
  }

  return {
    totalChanges,
    summary,
    hasConflicts: changes.conflicts > 0,
    requiresAttention: changes.conflicts > 0,
  };
}
