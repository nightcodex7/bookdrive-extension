// sync-preview.ts - Preview sync changes before applying them

import type { BookmarkNode } from '../types/bookmarks';
import { diffBookmarks } from './bookmarks';

export interface SyncPreview {
  added: BookmarkNode[];
  removed: BookmarkNode[];
  modified: Array<{
    local: BookmarkNode;
    remote: BookmarkNode;
  }>;
  summary: {
    totalChanges: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
  };
}

/**
 * Generate a preview of sync changes without applying them
 */
export async function generateSyncPreview(
  localTree: BookmarkNode[],
  remoteTree: BookmarkNode[]
): Promise<SyncPreview> {
  const diff = diffBookmarks(localTree, remoteTree);
  
  const preview: SyncPreview = {
    added: diff.added,
    removed: diff.removed,
    modified: diff.changed,
    summary: {
      totalChanges: diff.added.length + diff.removed.length + diff.changed.length,
      addedCount: diff.added.length,
      removedCount: diff.removed.length,
      modifiedCount: diff.changed.length,
    },
  };

  return preview;
}

/**
 * Format sync preview for display
 */
export function formatSyncPreview(preview: SyncPreview): string {
  const lines: string[] = [];
  
  lines.push(`Sync Preview - ${preview.summary.totalChanges} total changes:`);
  lines.push(`  • ${preview.summary.addedCount} bookmarks to be added`);
  lines.push(`  • ${preview.summary.removedCount} bookmarks to be removed`);
  lines.push(`  • ${preview.summary.modifiedCount} bookmarks to be modified`);
  
  if (preview.added.length > 0) {
    lines.push('\nBookmarks to be added:');
    preview.added.forEach(bookmark => {
      lines.push(`  + ${bookmark.title} ${bookmark.url ? `(${bookmark.url})` : ''}`);
    });
  }
  
  if (preview.removed.length > 0) {
    lines.push('\nBookmarks to be removed:');
    preview.removed.forEach(bookmark => {
      lines.push(`  - ${bookmark.title} ${bookmark.url ? `(${bookmark.url})` : ''}`);
    });
  }
  
  if (preview.modified.length > 0) {
    lines.push('\nBookmarks to be modified:');
    preview.modified.forEach(({ local, remote }) => {
      lines.push(`  ~ ${local.title} → ${remote.title}`);
      if (local.url !== remote.url) {
        lines.push(`    URL: ${local.url} → ${remote.url}`);
      }
    });
  }
  
  return lines.join('\n');
}