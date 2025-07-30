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

/**
 * Create visual sync preview interface
 * @param {Object} preview - Preview data from generateSyncPreview
 * @returns {HTMLElement} Preview interface element
 */
export function createSyncPreviewInterface(preview) {
  const container = document.createElement('div');
  container.className = 'sync-preview-interface';
  
  if (!preview.success) {
    container.innerHTML = `
      <div class="preview-error">
        <span class="material-icons">error</span>
        <h3>Preview Unavailable</h3>
        <p>${preview.message || 'Failed to generate sync preview'}</p>
      </div>
    `;
    return container;
  }

  const { changes, details } = preview.preview;
  
  container.innerHTML = `
    <div class="preview-header">
      <h2>Sync Preview</h2>
      <p>Review changes before syncing</p>
    </div>
    
    <div class="preview-summary">
      <div class="summary-card">
        <div class="summary-icon add">+</div>
        <div class="summary-content">
          <div class="summary-value">${changes.added}</div>
          <div class="summary-label">New Bookmarks</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon update">↻</div>
        <div class="summary-content">
          <div class="summary-value">${changes.updated}</div>
          <div class="summary-label">Updated</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon remove">−</div>
        <div class="summary-content">
          <div class="summary-value">${changes.removed}</div>
          <div class="summary-label">Removed</div>
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-icon conflict">⚠</div>
        <div class="summary-content">
          <div class="summary-value">${changes.conflicts}</div>
          <div class="summary-label">Conflicts</div>
        </div>
      </div>
    </div>
    
    <div class="preview-details">
      <div class="detail-section">
        <h3>New Bookmarks (${details.newBookmarks.length})</h3>
        <div class="bookmark-list">
          ${details.newBookmarks.map(bookmark => `
            <div class="bookmark-item new">
              <div class="bookmark-info">
                <div class="bookmark-title">${bookmark.title || 'Untitled'}</div>
                <div class="bookmark-url">${bookmark.url || 'No URL'}</div>
              </div>
              <div class="bookmark-action">Will be added</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="detail-section">
        <h3>Updated Bookmarks (${details.updatedBookmarks.length})</h3>
        <div class="bookmark-list">
          ${details.updatedBookmarks.map(update => `
            <div class="bookmark-item updated">
              <div class="bookmark-info">
                <div class="bookmark-title">${update.local.title || 'Untitled'}</div>
                <div class="bookmark-url">${update.local.url || 'No URL'}</div>
              </div>
              <div class="bookmark-changes">
                ${getChangeDescription(update.local, update.remote)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="detail-section">
        <h3>Removed Bookmarks (${details.removedBookmarks.length})</h3>
        <div class="bookmark-list">
          ${details.removedBookmarks.map(bookmark => `
            <div class="bookmark-item removed">
              <div class="bookmark-info">
                <div class="bookmark-title">${bookmark.title || 'Untitled'}</div>
                <div class="bookmark-url">${bookmark.url || 'No URL'}</div>
              </div>
              <div class="bookmark-action">Will be removed</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      ${details.conflicts.length > 0 ? `
        <div class="detail-section">
          <h3>Conflicts (${details.conflicts.length})</h3>
          <div class="bookmark-list">
            ${details.conflicts.map(conflict => `
              <div class="bookmark-item conflict">
                <div class="bookmark-info">
                  <div class="bookmark-title">${conflict.local.title || conflict.remote.title || 'Untitled'}</div>
                  <div class="bookmark-url">${conflict.local.url || conflict.remote.url || 'No URL'}</div>
                </div>
                <div class="bookmark-action">Needs resolution</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
    
    <div class="preview-actions">
      <button class="preview-btn secondary" id="preview-cancel">Cancel</button>
      <button class="preview-btn primary" id="preview-confirm">Confirm Sync</button>
    </div>
  `;
  
  return container;
}

/**
 * Get change description for updated bookmarks
 * @param {Object} local - Local bookmark
 * @param {Object} remote - Remote bookmark
 * @returns {string} Change description
 */
function getChangeDescription(local, remote) {
  const changes = [];
  
  if (local.title !== remote.title) {
    changes.push('Title changed');
  }
  if (local.url !== remote.url) {
    changes.push('URL changed');
  }
  if (local.parentId !== remote.parentId) {
    changes.push('Folder changed');
  }
  
  return changes.length > 0 ? changes.join(', ') : 'Metadata updated';
}

/**
 * Show sync preview modal
 * @param {Object} preview - Preview data
 * @returns {Promise<boolean>} Whether user confirmed sync
 */
export function showSyncPreviewModal(preview) {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'sync-preview-modal';
    
    const previewInterface = createSyncPreviewInterface(preview);
    modal.appendChild(previewInterface);
    
    document.body.appendChild(modal);
    
    // Add event listeners
    const cancelBtn = modal.querySelector('#preview-cancel');
    const confirmBtn = modal.querySelector('#preview-confirm');
    
    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(false);
    });
    
    confirmBtn.addEventListener('click', () => {
      document.body.removeChild(modal);
      resolve(true);
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        resolve(false);
      }
    });
  });
}
