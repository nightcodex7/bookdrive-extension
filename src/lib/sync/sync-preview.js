// sync-preview.js - Preview sync changes before applying them

import { diffBookmarks } from '../bookmarks.js';
import { calculateDelta } from './sync-optimizer.js';

/**
 * Generate a preview of sync changes without applying them
 * @param {Array} localTree
 * @param {Array} remoteTree
 * @returns {Promise<Object>} Sync preview object
 */
export async function generateSyncPreview(localTree, remoteTree) {
  // Use both the original diffBookmarks and our new calculateDelta for compatibility
  const diff = diffBookmarks(localTree, remoteTree);
  const delta = calculateDelta(localTree, remoteTree);

  // Convert delta format to match the expected preview format
  const deltaAdded = delta.added;
  const deltaRemoved = delta.deleted;
  const deltaModified = delta.modified.map((item) => ({
    local: item.source,
    remote: item.target,
    changes: item.changes,
  }));

  const preview = {
    added: diff.added,
    removed: diff.removed,
    modified: diff.changed,
    // Add the delta information for more detailed analysis
    delta: {
      added: deltaAdded,
      removed: deltaRemoved,
      modified: deltaModified,
      unchanged: delta.unchanged,
    },
    summary: {
      totalChanges: diff.added.length + diff.removed.length + diff.changed.length,
      addedCount: diff.added.length,
      removedCount: diff.removed.length,
      modifiedCount: diff.changed.length,
      // Add more detailed statistics from delta calculation
      unchangedCount: delta.unchanged.length,
      totalBookmarks: delta.total,
      changePercentage: delta.total > 0 ? Math.round((delta.changes / delta.total) * 100) : 0,
    },
  };

  return preview;
}

/**
 * Format sync preview for display
 * @param {Object} preview
 * @returns {string} Formatted preview text
 */
export function formatSyncPreview(preview) {
  const lines = [];

  // Summary section with enhanced statistics
  lines.push(`Sync Preview - ${preview.summary.totalChanges} total changes:`);
  lines.push(`  • ${preview.summary.addedCount} bookmarks to be added`);
  lines.push(`  • ${preview.summary.removedCount} bookmarks to be removed`);
  lines.push(`  • ${preview.summary.modifiedCount} bookmarks to be modified`);

  // Add additional statistics if available from delta calculation
  if (preview.summary.unchangedCount !== undefined) {
    lines.push(`  • ${preview.summary.unchangedCount} bookmarks unchanged`);
  }

  if (preview.summary.totalBookmarks !== undefined) {
    lines.push(`\nTotal bookmarks: ${preview.summary.totalBookmarks}`);
    lines.push(`Change percentage: ${preview.summary.changePercentage}%`);
  }

  // Added bookmarks section
  if (preview.added.length > 0) {
    lines.push('\nBookmarks to be added:');
    preview.added.forEach((bookmark) => {
      lines.push(`  + ${bookmark.title} ${bookmark.url ? `(${bookmark.url})` : ''}`);
    });
  }

  // Removed bookmarks section
  if (preview.removed.length > 0) {
    lines.push('\nBookmarks to be removed:');
    preview.removed.forEach((bookmark) => {
      lines.push(`  - ${bookmark.title} ${bookmark.url ? `(${bookmark.url})` : ''}`);
    });
  }

  // Modified bookmarks section with enhanced change details
  if (preview.modified.length > 0) {
    lines.push('\nBookmarks to be modified:');
    preview.modified.forEach(({ local, remote }) => {
      lines.push(`  ~ ${local.title} → ${remote.title}`);
      if (local.url !== remote.url) {
        lines.push(`    URL: ${local.url} → ${remote.url}`);
      }
    });
  }

  // Add optimization recommendations based on the sync preview
  lines.push('\nSync Optimization Recommendations:');

  if (preview.summary.totalChanges > 100) {
    lines.push('  • Large sync detected - Consider using incremental sync');
  }

  if (preview.summary.changePercentage < 10) {
    lines.push('  • Small change percentage - Delta sync recommended');
  }

  if (preview.summary.addedCount > preview.summary.removedCount + preview.summary.modifiedCount) {
    lines.push('  • Mostly additions - Consider batch processing');
  }

  return lines.join('\n');
}
