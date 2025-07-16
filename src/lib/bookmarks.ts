// bookmarks.ts - Native bookmarks integration for BookDrive

import type { BookmarkNode, BookmarkState, Folder } from '../types/bookmarks';

/**
 * Export the full bookmarks tree as JSON.
 * @returns Promise<chrome.bookmarks.BookmarkTreeNode[]>
 */
export async function exportBookmarksTree(): Promise<chrome.bookmarks.BookmarkTreeNode[]> {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree: chrome.bookmarks.BookmarkTreeNode[]) => {
      resolve(tree);
    });
  });
}

/**
 * Export bookmarks as {folders, bookmarks, device, timestamp, hash}.
 * Bookmarks now include parentId for correct import.
 */
export async function exportBookmarksState(): Promise<BookmarkState> {
  const tree = await exportBookmarksTree();
  const { folders, bookmarks } = splitFoldersAndBookmarks(tree);
  return {
    folders,
    bookmarks,
    device: navigator.userAgent + '-' + (navigator.platform || 'Unknown'),
    timestamp: new Date().toISOString(),
    hash: hashBookmarks(folders, bookmarks),
  };
}

/**
 * Recursively split tree into folders and bookmarks, bookmarks include parentId.
 */
function splitFoldersAndBookmarks(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  folders: Folder[] = [],
  bookmarks: BookmarkNode[] = [],
  parentId: string | null = null,
): { folders: Folder[]; bookmarks: BookmarkNode[] } {
  for (const node of tree) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title,
        url: node.url,
        parentId: parentId ?? undefined,
      });
    } else {
      folders.push({
        id: (node.id as string) || '0',
        title: node.title,
        parentId: (parentId as string) || '0',
      });
      if (node.children) {
        splitFoldersAndBookmarks(node.children, folders, bookmarks, (node.id as string) || '0');
      }
    }
  }
  return { folders, bookmarks };
}

/**
 * Hash bookmarks and folders for quick comparison.
 */
function hashBookmarks(folders: Folder[], bookmarks: BookmarkNode[]): number {
  const str = JSON.stringify(folders) + JSON.stringify(bookmarks);
  let hash = 0,
    i: number,
    chr: number;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

/**
 * Deduplicate bookmarks by URL.
 */
function dedupeBookmarks(bookmarks: BookmarkNode[]): BookmarkNode[] {
  const seen = new Set<string>();
  return bookmarks.filter((b) => {
    if (!b.url) return true; // If no URL, don't dedupe on it
    if (seen.has(b.url)) return false;
    seen.add(b.url);
    return true;
  });
}

/**
 * Restore bookmarks from exported state (clears and reconstructs tree).
 */
export async function restoreBookmarksState(state: BookmarkState): Promise<void> {
  await removeAllBookmarks();
  const bookmarks = dedupeBookmarks(state.bookmarks);
  await importTreeFromState(state.folders, bookmarks);
}

/**
 * Import tree from state (folders/bookmarks arrays with parentId).
 */
async function importTreeFromState(
  folders: Folder[],
  bookmarks: BookmarkNode[],
  parentId: string = '0',
): Promise<void> {
  const foldersToProcess = folders.filter(f => String(f.parentId ?? '0') === String(parentId));
  
  for (const folder of foldersToProcess) {
    const newFolder = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve) => {
      chrome.bookmarks.create({ parentId, title: folder.title }, resolve);
    });
    
    const bookmarksToProcess = bookmarks.filter(b => String(b.parentId ?? '0') === String(folder.id ?? '0'));
    
    for (const bm of bookmarksToProcess) {
      await new Promise((resolve) => {
        chrome.bookmarks.create(
          { parentId: newFolder.id, title: bm.title, url: bm.url },
          resolve,
        );
      });
    }
    
    // Recursively import subfolders
    await importTreeFromState(folders, bookmarks, folder.id);
  }
}

/**
 * Import bookmarks tree: replace or merge based on mode.
 * mode: 'replace' (default, wipes all and imports) or 'merge' (advanced merge)
 */
export async function importBookmarksTree(
  tree: chrome.bookmarks.BookmarkTreeNode[],
  mode: 'replace' | 'merge' = 'replace',
): Promise<void> {
  if (mode === 'replace') {
    await removeAllBookmarks();
    await importTreeRecursive(tree as BookmarkNode[]);
  } else if (mode === 'merge') {
    // Advanced merge: merge local and remote trees
    const localTree = await exportBookmarksTree();
    const diff = diffBookmarks(localTree as BookmarkNode[], tree as BookmarkNode[]);
    
    for (const added of diff.added) {
      const createParams: { parentId?: string; title: string; url?: string } = {
        parentId: added.parentId || '1',
        title: added.title,
      };
      if (added.url) createParams.url = added.url;
      
      await new Promise<void>((resolve) => {
        chrome.bookmarks.create(createParams, () => resolve());
      });
    }
    
    for (const { remote } of diff.changed) {
      if (remote.id) {
        await new Promise<void>((resolve) => {
          chrome.bookmarks.update(remote.id, {
            title: remote.title,
            url: remote.url
          }, () => resolve());
        });
      }
    }
  }
}

/**
 * Remove all bookmarks (except root nodes).
 */
export async function removeAllBookmarks(): Promise<void> {
  const roots = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>((resolve) =>
    chrome.bookmarks.getTree(resolve),
  );
  for (const root of roots) {
    for (const child of root.children || []) {
      await removeNodeRecursive(child);
    }
  }
}

/**
 * Recursively remove a bookmark node and its children.
 */
async function removeNodeRecursive(node: chrome.bookmarks.BookmarkTreeNode): Promise<void> {
  if (node.children) {
    for (const child of node.children) {
      await removeNodeRecursive(child);
    }
  }
  
  // Don't remove root bookmark folders
  const protectedIds = ['0', '1', '2'];
  if (node.id && !protectedIds.includes(node.id)) {
    try {
      chrome.bookmarks.removeTree(node.id);
    } catch (e) {
      console.warn('Failed to remove node', node.id, e);
    }
  }
}

/**
 * Import bookmarks recursively from a tree.
 */
async function importTreeRecursive(tree: BookmarkNode[], parentId: string = '0'): Promise<void> {
  for (const node of tree) {
    const createParams: { parentId?: string; title: string; url?: string } = {
      parentId,
      title: node.title,
    };
    
    if (node.url) {
      createParams.url = node.url;
    }
    
    const newNode = await new Promise<chrome.bookmarks.BookmarkTreeNode>((resolve) => {
      chrome.bookmarks.create(createParams, resolve);
    });
    
    if (node.children && node.children.length > 0) {
      await importTreeRecursive(node.children, newNode.id);
    }
  }
}

/**
 * Listen for any bookmark changes (created, removed, changed, moved, reordered).
 */
export function listenForBookmarkChanges(callback: (...args: any[]) => void): void {
  const events = ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered'] as const;
  for (const evt of events) {
    (chrome.bookmarks[evt] as any).addListener(callback);
  }
}

/**
 * Diff two bookmark trees (returns {added, removed, changed}).
 */
export function diffBookmarks(
  localTree: BookmarkNode[],
  remoteTree: BookmarkNode[],
): {
  added: BookmarkNode[];
  removed: BookmarkNode[];
  changed: { local: BookmarkNode; remote: BookmarkNode }[];
} {
  const localMap = flattenBookmarks(localTree);
  const remoteMap = flattenBookmarks(remoteTree);
  const added: BookmarkNode[] = [];
  const removed: BookmarkNode[] = [];
  const changed: { local: BookmarkNode; remote: BookmarkNode }[] = [];
  
  for (const id in remoteMap) {
    if (!localMap[id]) {
      added.push(remoteMap[id]);
    } else if (JSON.stringify(localMap[id]) !== JSON.stringify(remoteMap[id])) {
      changed.push({ local: localMap[id], remote: remoteMap[id] });
    }
  }
  
  for (const id in localMap) {
    if (!remoteMap[id]) {
      removed.push(localMap[id]);
    }
  }
  
  return { added, removed, changed };
}

/**
 * Flatten a bookmark tree to a map of id -> node.
 */
function flattenBookmarks(
  tree: BookmarkNode[],
  map: Record<string, BookmarkNode> = {},
): Record<string, BookmarkNode> {
  for (const node of tree) {
    map[node.id] = { title: node.title, url: node.url, id: node.id };
    if (node.children) flattenBookmarks(node.children, map);
  }
  return map;
}

/**
 * Hash a bookmark/folder node using SHA-256.
 */
export async function hashNodeSHA256(node: BookmarkNode): Promise<string> {
  const str = JSON.stringify({ title: node.title, url: node.url, children: node.children?.length });
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Recursively hash all nodes in a bookmark tree.
 */
export async function hashBookmarkTree(tree: BookmarkNode[]): Promise<any[]> {
  async function hashNode(node: BookmarkNode): Promise<any> {
    let children: any[] = [];
    if (node.children) {
      children = await Promise.all(node.children.map(hashNode));
    }
    const nodeForHash = { title: node.title, url: node.url, children: children.length };
    const str = JSON.stringify(nodeForHash);
    const buf = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', buf);
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return { ...node, hash, children };
  }
  return Promise.all(tree.map(hashNode));
}
