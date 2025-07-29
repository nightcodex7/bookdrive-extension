// bookmarks.js - Native bookmarks integration for BookDrive

/**
 * Export the full bookmarks tree as JSON.
 * @returns {Promise<Array>}
 */
export async function exportBookmarksTree() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      resolve(tree);
    });
  });
}

/**
 * Export bookmarks as {folders, bookmarks, device, timestamp, hash}.
 * Bookmarks now include parentId for correct import.
 * @returns {Promise<Object>}
 */
export async function exportBookmarksState() {
  const tree = await exportBookmarksTree();
  const { folders, bookmarks } = splitFoldersAndBookmarks(tree);
  return {
    folders,
    bookmarks,
    device: navigator.userAgent + '-' + 'Browser',
    timestamp: new Date().toISOString(),
    hash: hashBookmarks(folders, bookmarks),
  };
}

/**
 * Recursively split tree into folders and bookmarks, bookmarks include parentId.
 * @param {Array} tree
 * @param {Array} folders
 * @param {Array} bookmarks
 * @param {string|null} parentId
 * @returns {Object}
 */
function splitFoldersAndBookmarks(tree, folders = [], bookmarks = [], parentId = null) {
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
        id: node.id || '0',
        title: node.title,
        parentId: parentId || '0',
      });
      if (node.children) {
        splitFoldersAndBookmarks(node.children, folders, bookmarks, node.id || '0');
      }
    }
  }
  return { folders, bookmarks };
}

/**
 * Hash bookmarks and folders for quick comparison.
 * @param {Array} folders
 * @param {Array} bookmarks
 * @returns {number}
 */
function hashBookmarks(folders, bookmarks) {
  const str = JSON.stringify(folders) + JSON.stringify(bookmarks);
  let hash = 0,
    i,
    chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

/**
 * Deduplicate bookmarks by URL.
 * @param {Array} bookmarks
 * @returns {Array}
 */
function dedupeBookmarks(bookmarks) {
  const seen = new Set();
  return bookmarks.filter((b) => {
    if (!b.url) return true; // If no URL, don't dedupe on it
    if (seen.has(b.url)) return false;
    seen.add(b.url);
    return true;
  });
}

/**
 * Restore bookmarks from exported state (clears and reconstructs tree).
 * @param {Object} state
 * @returns {Promise<void>}
 */
export async function restoreBookmarksState(state) {
  await removeAllBookmarks();
  const bookmarks = dedupeBookmarks(state.bookmarks);
  await importTreeFromState(state.folders, bookmarks);
}

/**
 * Import tree from state (folders/bookmarks arrays with parentId).
 * @param {Array} folders
 * @param {Array} bookmarks
 * @param {string} parentId
 * @returns {Promise<void>}
 */
async function importTreeFromState(folders, bookmarks, parentId = '0') {
  const foldersToProcess = folders.filter((f) => String(f.parentId ?? '0') === String(parentId));

  for (const folder of foldersToProcess) {
    const newFolder = await new Promise((resolve) => {
      chrome.bookmarks.create({ parentId, title: folder.title }, resolve);
    });

    const bookmarksToProcess = bookmarks.filter(
      (b) => String(b.parentId ?? '0') === String(folder.id ?? '0'),
    );

    for (const bm of bookmarksToProcess) {
      await new Promise((resolve) => {
        chrome.bookmarks.create({ parentId: newFolder.id, title: bm.title, url: bm.url }, resolve);
      });
    }

    // Recursively import subfolders
    await importTreeFromState(folders, bookmarks, folder.id);
  }
}

/**
 * Import bookmarks tree: replace or merge based on mode.
 * @param {Array} tree
 * @param {'replace'|'merge'} mode - 'replace' (default, wipes all and imports) or 'merge' (advanced merge)
 * @returns {Promise<void>}
 */
export async function importBookmarksTree(tree, mode = 'replace') {
  if (mode === 'replace') {
    await removeAllBookmarks();
    await importTreeRecursive(tree);
  } else if (mode === 'merge') {
    // Advanced merge: merge local and remote trees
    const localTree = await exportBookmarksTree();
    const diff = diffBookmarks(localTree, tree);

    for (const added of diff.added) {
      const createParams = {
        parentId: added.parentId || '1',
        title: added.title,
      };
      if (added.url) createParams.url = added.url;

      await new Promise((resolve) => {
        chrome.bookmarks.create(createParams, () => resolve());
      });
    }

    for (const { remote } of diff.changed) {
      if (remote.id) {
        await new Promise((resolve) => {
          chrome.bookmarks.update(
            remote.id,
            {
              title: remote.title,
              url: remote.url,
            },
            () => resolve(),
          );
        });
      }
    }
  }
}

/**
 * Remove all bookmarks (except root nodes).
 * @returns {Promise<void>}
 */
export async function removeAllBookmarks() {
  const roots = await new Promise((resolve) => chrome.bookmarks.getTree(resolve));
  for (const root of roots) {
    for (const child of root.children || []) {
      await removeNodeRecursive(child);
    }
  }
}

/**
 * Recursively remove a bookmark node and its children.
 * @param {Object} node
 * @returns {Promise<void>}
 */
async function removeNodeRecursive(node) {
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
 * @param {Array} tree
 * @param {string} parentId
 * @returns {Promise<void>}
 */
async function importTreeRecursive(tree, parentId = '0') {
  for (const node of tree) {
    const createParams = {
      parentId,
      title: node.title,
    };

    if (node.url) {
      createParams.url = node.url;
    }

    const newNode = await new Promise((resolve) => {
      chrome.bookmarks.create(createParams, resolve);
    });

    if (node.children && node.children.length > 0) {
      await importTreeRecursive(node.children, newNode.id);
    }
  }
}

/**
 * Listen for any bookmark changes (created, removed, changed, moved, reordered).
 * @param {Function} callback
 */
export function listenForBookmarkChanges(callback) {
  const events = ['onCreated', 'onRemoved', 'onChanged', 'onMoved', 'onChildrenReordered'];
  for (const evt of events) {
    chrome.bookmarks[evt].addListener(callback);
  }
}

/**
 * Diff two bookmark trees (returns {added, removed, changed}).
 * @param {Array} localTree
 * @param {Array} remoteTree
 * @returns {Object}
 */
export function diffBookmarks(localTree, remoteTree) {
  const localMap = flattenBookmarks(localTree);
  const remoteMap = flattenBookmarks(remoteTree);
  const added = [];
  const removed = [];
  const changed = [];

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
 * @param {Array} tree
 * @param {Object} map
 * @returns {Object}
 */
function flattenBookmarks(tree, map = {}) {
  for (const node of tree) {
    map[node.id] = { title: node.title, url: node.url, id: node.id };
    if (node.children) flattenBookmarks(node.children, map);
  }
  return map;
}

/**
 * Hash a bookmark/folder node using SHA-256.
 * @param {Object} node
 * @returns {Promise<string>}
 */
export async function hashNodeSHA256(node) {
  const str = JSON.stringify({ title: node.title, url: node.url, children: node.children?.length });
  const buf = new TextEncoder().encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Recursively hash all nodes in a bookmark tree.
 * @param {Array} tree
 * @returns {Promise<Array>}
 */
export async function hashBookmarkTree(tree) {
  async function hashNode(node) {
    let children = [];
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

/**
 * Get all bookmarks as a flat array
 * @returns {Promise<Array>}
 */
export async function getBookmarks() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const bookmarks = [];
      flattenBookmarksToArray(tree, bookmarks);
      resolve(bookmarks);
    });
  });
}

/**
 * Flatten bookmark tree to array
 * @param {Array} tree
 * @param {Array} bookmarks
 */
function flattenBookmarksToArray(tree, bookmarks) {
  for (const node of tree) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
        title: node.title,
        url: node.url,
        dateAdded: node.dateAdded,
        parentId: node.parentId
      });
    }
    if (node.children) {
      flattenBookmarksToArray(node.children, bookmarks);
    }
  }
}

/**
 * Sync bookmarks with Google Drive
 * @param {string} mode - 'host-to-many' or 'global'
 * @returns {Promise<Object>}
 */
export async function syncBookmarks(mode = 'host-to-many') {
  try {
    // Export current bookmarks
    const localState = await exportBookmarksState();
    
    // For now, just return basic sync result
    // In a real implementation, this would:
    // 1. Upload to Google Drive
    // 2. Download remote state
    // 3. Compare and merge
    // 4. Apply changes
    
    return {
      added: 0,
      updated: 0,
      removed: 0,
      total: localState.bookmarks.length
    };
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}
