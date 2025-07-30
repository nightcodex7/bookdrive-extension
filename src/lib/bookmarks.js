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
 * Restore bookmarks from a state object
 * @param {Object} state - Bookmarks state object
 * @returns {Promise<void>}
 */
export async function restoreBookmarksState(state) {
  try {
    if (!state || !state.bookmarks) {
      throw new Error('Invalid bookmarks state');
    }

    await importBookmarksState(state, 'replace');
  } catch (error) {
    console.error('Failed to restore bookmarks state:', error);
    throw error;
  }
}

/**
 * Import bookmarks from a state object
 * @param {Object} state - Bookmarks state object
 * @param {string} mode - Import mode ('replace', 'merge', 'append')
 * @returns {Promise<void>}
 */
export async function importBookmarksState(state, mode = 'replace') {
  try {
    if (!state || !state.bookmarks) {
      throw new Error('Invalid bookmarks state');
    }

    if (mode === 'replace') {
      // Remove all existing bookmarks first
      await removeAllBookmarks();
    }

    // Import the bookmarks
    await importTreeFromState(state.folders || [], state.bookmarks || []);
  } catch (error) {
    console.error('Failed to import bookmarks state:', error);
    throw error;
  }
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
        parentId: node.parentId,
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
    // Import real sync service
    const { performRealSync, SYNC_MODES } = await import('./sync/sync-service.js');

    // Map mode to sync mode constant
    const syncMode = mode === 'global' ? SYNC_MODES.GLOBAL : SYNC_MODES.HOST_TO_MANY;

    // Perform real sync with Google Drive
    const syncResult = await performRealSync(syncMode, {
      autoResolveConflicts: true,
    });

    return {
      success: syncResult.success,
      added: syncResult.localChanges || 0,
      updated: 0, // Will be calculated from delta
      removed: 0, // Will be calculated from delta
      total: syncResult.bookmarkCount || 0,
      conflicts: syncResult.conflicts || 0,
      message: syncResult.message,
    };
  } catch (error) {
    console.error('Sync failed:', error);
    throw error;
  }
}

/**
 * Bookmark organization features
 */

/**
 * Add tags to a bookmark
 * @param {string} bookmarkId - Bookmark ID
 * @param {Array<string>} tags - Array of tags
 * @returns {Promise<boolean>} Success status
 */
export async function addBookmarkTags(bookmarkId, tags) {
  try {
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    if (!bookmark || bookmark.length === 0) {
      throw new Error('Bookmark not found');
    }

    const bookmarkNode = bookmark[0];
    const existingTags = await getBookmarkTags(bookmarkNode);
    const newTags = [...new Set([...existingTags, ...tags])];

    // Store tags in extension storage
    const tagData = {
      bookmarkId,
      tags: newTags,
      updatedAt: new Date().toISOString(),
    };

    await chrome.storage.local.set({
      [`bookmark_tags_${bookmarkId}`]: tagData,
    });

    return true;
  } catch (error) {
    console.error('Failed to add bookmark tags:', error);
    return false;
  }
}

/**
 * Remove tags from a bookmark
 * @param {string} bookmarkId - Bookmark ID
 * @param {Array<string>} tags - Array of tags to remove
 * @returns {Promise<boolean>} Success status
 */
export async function removeBookmarkTags(bookmarkId, tags) {
  try {
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    if (!bookmark || bookmark.length === 0) {
      throw new Error('Bookmark not found');
    }

    const bookmarkNode = bookmark[0];
    const existingTags = await getBookmarkTags(bookmarkNode);
    const newTags = existingTags.filter(tag => !tags.includes(tag));

    const tagData = {
      bookmarkId,
      tags: newTags,
      updatedAt: new Date().toISOString(),
    };

    await chrome.storage.local.set({
      [`bookmark_tags_${bookmarkId}`]: tagData,
    });

    return true;
  } catch (error) {
    console.error('Failed to remove bookmark tags:', error);
    return false;
  }
}

/**
 * Get tags for a bookmark
 * @param {Object} bookmarkNode - Bookmark node
 * @returns {Promise<Array<string>>} Array of tags
 */
export async function getBookmarkTags(bookmarkNode) {
  try {
    const result = await chrome.storage.local.get(`bookmark_tags_${bookmarkNode.id}`);
    return result[`bookmark_tags_${bookmarkNode.id}`]?.tags || [];
  } catch (error) {
    console.error('Failed to get bookmark tags:', error);
    return [];
  }
}

/**
 * Add notes to a bookmark
 * @param {string} bookmarkId - Bookmark ID
 * @param {string} notes - Notes text
 * @returns {Promise<boolean>} Success status
 */
export async function addBookmarkNotes(bookmarkId, notes) {
  try {
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    if (!bookmark || bookmark.length === 0) {
      throw new Error('Bookmark not found');
    }

    const noteData = {
      bookmarkId,
      notes,
      updatedAt: new Date().toISOString(),
    };

    await chrome.storage.local.set({
      [`bookmark_notes_${bookmarkId}`]: noteData,
    });

    return true;
  } catch (error) {
    console.error('Failed to add bookmark notes:', error);
    return false;
  }
}

/**
 * Get notes for a bookmark
 * @param {string} bookmarkId - Bookmark ID
 * @returns {Promise<string>} Notes text
 */
export async function getBookmarkNotes(bookmarkId) {
  try {
    const result = await chrome.storage.local.get(`bookmark_notes_${bookmarkId}`);
    return result[`bookmark_notes_${bookmarkId}`]?.notes || '';
  } catch (error) {
    console.error('Failed to get bookmark notes:', error);
    return '';
  }
}

/**
 * Advanced bookmark organization features
 */

/**
 * Smart folder rule types (enhanced)
 */
export const SMART_FOLDER_RULES = {
  TAG_MATCH: 'tag_match',
  TITLE_CONTAINS: 'title_contains',
  URL_CONTAINS: 'url_contains',
  DATE_ADDED: 'date_added',
  DATE_MODIFIED: 'date_modified',
  FOLDER: 'folder',
  // Advanced rules
  REGEX_MATCH: 'regex_match',
  DOMAIN_MATCH: 'domain_match',
  HAS_NOTES: 'has_notes',
  HAS_TAGS: 'has_tags',
  NO_TAGS: 'no_tags',
  FAVORITE: 'favorite',
  RECENTLY_ADDED: 'recently_added',
  RECENTLY_MODIFIED: 'recently_modified',
  SYNC_STATUS: 'sync_status',
  ENCRYPTION_STATUS: 'encryption_status',
};

/**
 * Smart folder operators
 */
export const SMART_FOLDER_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  BETWEEN: 'between',
  IN: 'in',
  NOT_IN: 'not_in',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
  REGEX: 'regex',
};

/**
 * Create an advanced smart folder
 * @param {string} name - Smart folder name
 * @param {Array<Object>} rules - Array of rules
 * @param {Object} options - Smart folder options
 * @returns {Promise<string>} Smart folder ID
 */
export async function createAdvancedSmartFolder(name, rules, options = {}) {
  try {
    const smartFolder = {
      id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      rules,
      options: {
        autoUpdate: options.autoUpdate !== false,
        updateInterval: options.updateInterval || 300000, // 5 minutes
        maxResults: options.maxResults || 1000,
        sortBy: options.sortBy || 'dateAdded',
        sortOrder: options.sortOrder || 'desc',
        ...options,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastUpdate: null,
      bookmarkCount: 0,
    };

    const result = await chrome.storage.local.get('smart_folders');
    const smartFolders = result.smart_folders || [];
    smartFolders.push(smartFolder);

    await chrome.storage.local.set({ smart_folders: smartFolders });

    // Set up auto-update if enabled
    if (smartFolder.options.autoUpdate) {
      await scheduleSmartFolderUpdate(smartFolder.id);
    }

    return smartFolder.id;
  } catch (error) {
    console.error('Failed to create advanced smart folder:', error);
    throw error;
  }
}

/**
 * Update smart folder with new rules
 * @param {string} folderId - Smart folder ID
 * @param {Array<Object>} rules - New rules
 * @param {Object} options - Updated options
 * @returns {Promise<Object>} Update result
 */
export async function updateSmartFolder(folderId, rules, options = {}) {
  try {
    const result = await chrome.storage.local.get('smart_folders');
    const smartFolders = result.smart_folders || [];
    
    const folderIndex = smartFolders.findIndex(folder => folder.id === folderId);
    if (folderIndex === -1) {
      throw new Error('Smart folder not found');
    }

    const updatedFolder = {
      ...smartFolders[folderIndex],
      rules,
      options: {
        ...smartFolders[folderIndex].options,
        ...options,
      },
      updatedAt: new Date().toISOString(),
    };

    smartFolders[folderIndex] = updatedFolder;
    await chrome.storage.local.set({ smart_folders: smartFolders });

    // Update bookmark count
    const bookmarks = await getSmartFolderBookmarks(rules);
    updatedFolder.bookmarkCount = bookmarks.length;
    updatedFolder.lastUpdate = new Date().toISOString();

    smartFolders[folderIndex] = updatedFolder;
    await chrome.storage.local.set({ smart_folders: smartFolders });

    return {
      success: true,
      folder: updatedFolder,
      bookmarkCount: bookmarks.length,
    };
  } catch (error) {
    console.error('Failed to update smart folder:', error);
    throw error;
  }
}

/**
 * Get bookmarks that match smart folder rules (enhanced)
 * @param {Array<Object>} rules - Smart folder rules
 * @param {Object} options - Query options
 * @returns {Promise<Array<Object>>} Array of matching bookmarks
 */
export async function getSmartFolderBookmarks(rules, options = {}) {
  try {
    const allBookmarks = await chrome.bookmarks.getTree();
    const flatBookmarks = flattenBookmarksToArray(allBookmarks, []);
    
    const matchingBookmarks = [];
    for (const bookmark of flatBookmarks) {
      const matches = await Promise.all(rules.map(rule => matchesAdvancedRule(bookmark, rule)));
      
      // Apply logical operators (AND by default)
      const shouldInclude = options.logicalOperator === 'OR' ? 
        matches.some(match => match) : 
        matches.every(match => match);
      
      if (shouldInclude) {
        matchingBookmarks.push(bookmark);
      }
    }
    
    // Apply sorting
    if (options.sortBy) {
      matchingBookmarks.sort((a, b) => {
        const aValue = getBookmarkValue(a, options.sortBy);
        const bValue = getBookmarkValue(b, options.sortBy);
        
        if (options.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }
    
    // Apply limit
    if (options.limit) {
      return matchingBookmarks.slice(0, options.limit);
    }
    
    return matchingBookmarks;
  } catch (error) {
    console.error('Failed to get smart folder bookmarks:', error);
    return [];
  }
}

/**
 * Check if a bookmark matches an advanced rule
 * @param {Object} bookmark - Bookmark object
 * @param {Object} rule - Rule object
 * @returns {Promise<boolean>} Whether bookmark matches rule
 */
async function matchesAdvancedRule(bookmark, rule) {
  const { type, operator, value, field } = rule;
  
  try {
    switch (type) {
      case SMART_FOLDER_RULES.TAG_MATCH:
        const bookmarkTags = await getBookmarkTags(bookmark.id);
        return applyOperator(bookmarkTags, operator, value);
        
      case SMART_FOLDER_RULES.TITLE_CONTAINS:
        return applyOperator(bookmark.title, operator, value);
        
      case SMART_FOLDER_RULES.URL_CONTAINS:
        return applyOperator(bookmark.url, operator, value);
        
      case SMART_FOLDER_RULES.DATE_ADDED:
        const addedDate = new Date(bookmark.dateAdded);
        return applyDateOperator(addedDate, operator, value);
        
      case SMART_FOLDER_RULES.DATE_MODIFIED:
        const modifiedDate = new Date(bookmark.dateGroupModified || bookmark.dateAdded);
        return applyDateOperator(modifiedDate, operator, value);
        
      case SMART_FOLDER_RULES.FOLDER:
        return applyOperator(bookmark.parentId, operator, value);
        
      case SMART_FOLDER_RULES.REGEX_MATCH:
        const regex = new RegExp(value, 'i');
        return regex.test(bookmark[field] || '');
        
      case SMART_FOLDER_RULES.DOMAIN_MATCH:
        const domain = extractDomain(bookmark.url);
        return applyOperator(domain, operator, value);
        
      case SMART_FOLDER_RULES.HAS_NOTES:
        const notes = await getBookmarkNotes(bookmark.id);
        return operator === SMART_FOLDER_OPERATORS.IS_NOT_EMPTY ? 
          notes && notes.trim() !== '' : 
          !notes || notes.trim() === '';
        
      case SMART_FOLDER_RULES.HAS_TAGS:
        const tags = await getBookmarkTags(bookmark.id);
        return operator === SMART_FOLDER_OPERATORS.IS_NOT_EMPTY ? 
          tags && tags.length > 0 : 
          !tags || tags.length === 0;
        
      case SMART_FOLDER_RULES.NO_TAGS:
        const bookmarkTags2 = await getBookmarkTags(bookmark.id);
        return !bookmarkTags2 || bookmarkTags2.length === 0;
        
      case SMART_FOLDER_RULES.FAVORITE:
        return bookmark.url && bookmark.url.startsWith('chrome://bookmarks/');
        
      case SMART_FOLDER_RULES.RECENTLY_ADDED:
        const daysAgo = parseInt(value) || 7;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        return new Date(bookmark.dateAdded) >= cutoffDate;
        
      case SMART_FOLDER_RULES.RECENTLY_MODIFIED:
        const daysAgo2 = parseInt(value) || 7;
        const cutoffDate2 = new Date();
        cutoffDate2.setDate(cutoffDate2.getDate() - daysAgo2);
        return new Date(bookmark.dateGroupModified || bookmark.dateAdded) >= cutoffDate2;
        
      case SMART_FOLDER_RULES.SYNC_STATUS:
        // This would need to be implemented based on sync state
        return true; // Placeholder
        
      case SMART_FOLDER_RULES.ENCRYPTION_STATUS:
        // This would need to be implemented based on encryption state
        return true; // Placeholder
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Error matching rule:', error);
    return false;
  }
}

/**
 * Apply operator to values
 * @param {any} actual - Actual value
 * @param {string} operator - Operator
 * @param {any} expected - Expected value
 * @returns {boolean} Whether condition is met
 */
function applyOperator(actual, operator, expected) {
  if (Array.isArray(actual)) {
    return applyArrayOperator(actual, operator, expected);
  }
  
  const actualStr = String(actual || '').toLowerCase();
  const expectedStr = String(expected || '').toLowerCase();
  
  switch (operator) {
    case SMART_FOLDER_OPERATORS.EQUALS:
      return actualStr === expectedStr;
      
    case SMART_FOLDER_OPERATORS.NOT_EQUALS:
      return actualStr !== expectedStr;
      
    case SMART_FOLDER_OPERATORS.CONTAINS:
      return actualStr.includes(expectedStr);
      
    case SMART_FOLDER_OPERATORS.NOT_CONTAINS:
      return !actualStr.includes(expectedStr);
      
    case SMART_FOLDER_OPERATORS.STARTS_WITH:
      return actualStr.startsWith(expectedStr);
      
    case SMART_FOLDER_OPERATORS.ENDS_WITH:
      return actualStr.endsWith(expectedStr);
      
    case SMART_FOLDER_OPERATORS.IS_EMPTY:
      return !actualStr || actualStr.trim() === '';
      
    case SMART_FOLDER_OPERATORS.IS_NOT_EMPTY:
      return actualStr && actualStr.trim() !== '';
      
    default:
      return false;
  }
}

/**
 * Apply operator to arrays
 * @param {Array} actual - Actual array
 * @param {string} operator - Operator
 * @param {any} expected - Expected value
 * @returns {boolean} Whether condition is met
 */
function applyArrayOperator(actual, operator, expected) {
  const expectedArray = Array.isArray(expected) ? expected : [expected];
  
  switch (operator) {
    case SMART_FOLDER_OPERATORS.IN:
      return expectedArray.some(item => 
        actual.some(actualItem => 
          String(actualItem).toLowerCase() === String(item).toLowerCase()
        )
      );
      
    case SMART_FOLDER_OPERATORS.NOT_IN:
      return !expectedArray.some(item => 
        actual.some(actualItem => 
          String(actualItem).toLowerCase() === String(item).toLowerCase()
        )
      );
      
    case SMART_FOLDER_OPERATORS.IS_EMPTY:
      return !actual || actual.length === 0;
      
    case SMART_FOLDER_OPERATORS.IS_NOT_EMPTY:
      return actual && actual.length > 0;
      
    default:
      return applyOperator(actual.join(', '), operator, expected);
  }
}

/**
 * Apply date operator
 * @param {Date} actual - Actual date
 * @param {string} operator - Operator
 * @param {any} expected - Expected value
 * @returns {boolean} Whether condition is met
 */
function applyDateOperator(actual, operator, expected) {
  const expectedDate = new Date(expected);
  
  switch (operator) {
    case SMART_FOLDER_OPERATORS.EQUALS:
      return actual.getTime() === expectedDate.getTime();
      
    case SMART_FOLDER_OPERATORS.GREATER_THAN:
      return actual > expectedDate;
      
    case SMART_FOLDER_OPERATORS.LESS_THAN:
      return actual < expectedDate;
      
    case SMART_FOLDER_OPERATORS.BETWEEN:
      if (Array.isArray(expected) && expected.length === 2) {
        const startDate = new Date(expected[0]);
        const endDate = new Date(expected[1]);
        return actual >= startDate && actual <= endDate;
      }
      return false;
      
    default:
      return false;
  }
}

/**
 * Get bookmark value for sorting
 * @param {Object} bookmark - Bookmark object
 * @param {string} field - Field name
 * @returns {any} Field value
 */
function getBookmarkValue(bookmark, field) {
  switch (field) {
    case 'title':
      return bookmark.title || '';
    case 'url':
      return bookmark.url || '';
    case 'dateAdded':
      return bookmark.dateAdded || 0;
    case 'dateModified':
      return bookmark.dateGroupModified || bookmark.dateAdded || 0;
    case 'parentId':
      return bookmark.parentId || '';
    default:
      return bookmark[field] || '';
  }
}

/**
 * Extract domain from URL
 * @param {string} url - URL
 * @returns {string} Domain
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Schedule smart folder update
 * @param {string} folderId - Smart folder ID
 * @returns {Promise<void>}
 */
async function scheduleSmartFolderUpdate(folderId) {
  try {
    const result = await chrome.storage.local.get('smart_folder_updates');
    const updates = result.smart_folder_updates || {};
    
    updates[folderId] = {
      lastUpdate: Date.now(),
      nextUpdate: Date.now() + 300000, // 5 minutes
    };
    
    await chrome.storage.local.set({ smart_folder_updates: updates });
  } catch (error) {
    console.error('Failed to schedule smart folder update:', error);
  }
}

/**
 * Bulk operations for bookmarks
 */

/**
 * Bulk add tags to bookmarks
 * @param {Array<string>} bookmarkIds - Array of bookmark IDs
 * @param {Array<string>} tags - Tags to add
 * @returns {Promise<Object>} Result
 */
export async function bulkAddTags(bookmarkIds, tags) {
  try {
    const results = await Promise.allSettled(
      bookmarkIds.map(id => addBookmarkTags(id, tags))
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    return {
      success: true,
      successful,
      failed,
      total: bookmarkIds.length,
    };
  } catch (error) {
    console.error('Failed to bulk add tags:', error);
    throw error;
  }
}

/**
 * Bulk remove tags from bookmarks
 * @param {Array<string>} bookmarkIds - Array of bookmark IDs
 * @param {Array<string>} tags - Tags to remove
 * @returns {Promise<Object>} Result
 */
export async function bulkRemoveTags(bookmarkIds, tags) {
  try {
    const results = await Promise.allSettled(
      bookmarkIds.map(id => removeBookmarkTags(id, tags))
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    return {
      success: true,
      successful,
      failed,
      total: bookmarkIds.length,
    };
  } catch (error) {
    console.error('Failed to bulk remove tags:', error);
    throw error;
  }
}

/**
 * Bulk move bookmarks to folder
 * @param {Array<string>} bookmarkIds - Array of bookmark IDs
 * @param {string} targetFolderId - Target folder ID
 * @returns {Promise<Object>} Result
 */
export async function bulkMoveBookmarks(bookmarkIds, targetFolderId) {
  try {
    const results = await Promise.allSettled(
      bookmarkIds.map(id => chrome.bookmarks.move(id, { parentId: targetFolderId }))
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    return {
      success: true,
      successful,
      failed,
      total: bookmarkIds.length,
    };
  } catch (error) {
    console.error('Failed to bulk move bookmarks:', error);
    throw error;
  }
}

/**
 * Bulk delete bookmarks
 * @param {Array<string>} bookmarkIds - Array of bookmark IDs
 * @returns {Promise<Object>} Result
 */
export async function bulkDeleteBookmarks(bookmarkIds) {
  try {
    const results = await Promise.allSettled(
      bookmarkIds.map(id => chrome.bookmarks.remove(id))
    );
    
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;
    
    return {
      success: true,
      successful,
      failed,
      total: bookmarkIds.length,
    };
  } catch (error) {
    console.error('Failed to bulk delete bookmarks:', error);
    throw error;
  }
}

/**
 * Advanced search functionality
 */

/**
 * Advanced search with multiple criteria
 * @param {Object} criteria - Search criteria
 * @param {Object} options - Search options
 * @returns {Promise<Array<Object>>} Search results
 */
export async function advancedSearch(criteria, options = {}) {
  try {
    const allBookmarks = await chrome.bookmarks.getTree();
    const flatBookmarks = flattenBookmarksToArray(allBookmarks, []);
    
    const matchingBookmarks = [];
    
    for (const bookmark of flatBookmarks) {
      if (await matchesSearchCriteria(bookmark, criteria)) {
        matchingBookmarks.push(bookmark);
      }
    }
    
    // Apply sorting
    if (options.sortBy) {
      matchingBookmarks.sort((a, b) => {
        const aValue = getBookmarkValue(a, options.sortBy);
        const bValue = getBookmarkValue(b, options.sortBy);
        
        if (options.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }
    
    // Apply pagination
    if (options.limit) {
      const start = options.offset || 0;
      return matchingBookmarks.slice(start, start + options.limit);
    }
    
    return matchingBookmarks;
  } catch (error) {
    console.error('Advanced search failed:', error);
    return [];
  }
}

/**
 * Check if bookmark matches search criteria
 * @param {Object} bookmark - Bookmark object
 * @param {Object} criteria - Search criteria
 * @returns {Promise<boolean>} Whether bookmark matches
 */
async function matchesSearchCriteria(bookmark, criteria) {
  const conditions = [];
  
  // Text search
  if (criteria.text) {
    const text = criteria.text.toLowerCase();
    const titleMatch = bookmark.title && bookmark.title.toLowerCase().includes(text);
    const urlMatch = bookmark.url && bookmark.url.toLowerCase().includes(text);
    const notes = await getBookmarkNotes(bookmark.id);
    const notesMatch = notes && notes.toLowerCase().includes(text);
    
    conditions.push(titleMatch || urlMatch || notesMatch);
  }
  
  // Tag search
  if (criteria.tags && criteria.tags.length > 0) {
    const bookmarkTags = await getBookmarkTags(bookmark.id);
    const tagMatch = criteria.tags.some(tag => 
      bookmarkTags.some(bookmarkTag => 
        bookmarkTag.toLowerCase().includes(tag.toLowerCase())
      )
    );
    conditions.push(tagMatch);
  }
  
  // Date range search
  if (criteria.dateRange) {
    const { start, end, field = 'dateAdded' } = criteria.dateRange;
    const bookmarkDate = new Date(bookmark[field] || 0);
    const startDate = start ? new Date(start) : new Date(0);
    const endDate = end ? new Date(end) : new Date();
    
    conditions.push(bookmarkDate >= startDate && bookmarkDate <= endDate);
  }
  
  // Folder search
  if (criteria.folderId) {
    conditions.push(bookmark.parentId === criteria.folderId);
  }
  
  // URL pattern search
  if (criteria.urlPattern) {
    const regex = new RegExp(criteria.urlPattern, 'i');
    conditions.push(regex.test(bookmark.url || ''));
  }
  
  // Has notes
  if (criteria.hasNotes !== undefined) {
    const notes = await getBookmarkNotes(bookmark.id);
    conditions.push(criteria.hasNotes ? (notes && notes.trim() !== '') : (!notes || notes.trim() === ''));
  }
  
  // Has tags
  if (criteria.hasTags !== undefined) {
    const tags = await getBookmarkTags(bookmark.id);
    conditions.push(criteria.hasTags ? (tags && tags.length > 0) : (!tags || tags.length === 0));
  }
  
  // Apply logical operator
  const operator = criteria.operator || 'AND';
  return operator === 'OR' ? 
    conditions.some(condition => condition) : 
    conditions.every(condition => condition);
}

/**
 * Get all unique tags from bookmarks
 * @returns {Promise<Array<string>>} Array of unique tags
 */
export async function getAllTags() {
  try {
    const allBookmarks = await chrome.bookmarks.getTree();
    const flatBookmarks = flattenBookmarksToArray(allBookmarks, []);
    const allTags = new Set();

    for (const bookmark of flatBookmarks) {
      const tags = await getBookmarkTags(bookmark);
      tags.forEach(tag => allTags.add(tag));
    }

    return Array.from(allTags).sort();
  } catch (error) {
    console.error('Failed to get all tags:', error);
    return [];
  }
}

/**
 * Get bookmark statistics
 * @returns {Promise<Object>} Statistics object
 */
export async function getBookmarkStats() {
  try {
    const allBookmarks = await chrome.bookmarks.getTree();
    const flatBookmarks = flattenBookmarksToArray(allBookmarks, []);
    
    const stats = {
      total: flatBookmarks.length,
      byFolder: {},
      byTag: {},
      recentlyAdded: [],
      recentlyModified: [],
    };

    // Group by folder
    for (const bookmark of flatBookmarks) {
      const folderId = bookmark.parentId || '0';
      if (!stats.byFolder[folderId]) {
        stats.byFolder[folderId] = 0;
      }
      stats.byFolder[folderId]++;
    }

    // Group by tag
    for (const bookmark of flatBookmarks) {
      const tags = await getBookmarkTags(bookmark);
      for (const tag of tags) {
        if (!stats.byTag[tag]) {
          stats.byTag[tag] = 0;
        }
        stats.byTag[tag]++;
      }
    }

    // Recently added (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    stats.recentlyAdded = flatBookmarks
      .filter(bookmark => new Date(bookmark.dateAdded) > weekAgo)
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
      .slice(0, 10);

    // Recently modified (last 7 days)
    stats.recentlyModified = flatBookmarks
      .filter(bookmark => {
        const modifiedDate = new Date(bookmark.dateGroupModified || bookmark.dateAdded);
        return modifiedDate > weekAgo;
      })
      .sort((a, b) => {
        const aDate = new Date(a.dateGroupModified || a.dateAdded);
        const bDate = new Date(b.dateGroupModified || b.dateAdded);
        return bDate - aDate;
      })
      .slice(0, 10);

    return stats;
  } catch (error) {
    console.error('Failed to get bookmark stats:', error);
    return {
      total: 0,
      byFolder: {},
      byTag: {},
      recentlyAdded: [],
      recentlyModified: [],
    };
  }
}

/**
 * Import/Export functionality
 */

/**
 * Supported import/export formats
 */
export const IMPORT_EXPORT_FORMATS = {
  HTML: 'html',
  JSON: 'json',
  CSV: 'csv',
  POCKET: 'pocket',
  RAINDROP: 'raindrop',
  PINBOARD: 'pinboard',
};

/**
 * Export bookmarks in various formats
 * @param {string} format - Export format
 * @param {Object} options - Export options
 * @returns {Promise<string>} Exported data
 */
export async function exportBookmarks(format, options = {}) {
  try {
    const allBookmarks = await chrome.bookmarks.getTree();
    const flatBookmarks = flattenBookmarksToArray(allBookmarks, []);

    switch (format) {
      case IMPORT_EXPORT_FORMATS.HTML:
        return exportToHTML(flatBookmarks, options);
      case IMPORT_EXPORT_FORMATS.JSON:
        return exportToJSON(flatBookmarks, options);
      case IMPORT_EXPORT_FORMATS.CSV:
        return exportToCSV(flatBookmarks, options);
      case IMPORT_EXPORT_FORMATS.POCKET:
        return exportToPocket(flatBookmarks, options);
      case IMPORT_EXPORT_FORMATS.RAINDROP:
        return exportToRaindrop(flatBookmarks, options);
      case IMPORT_EXPORT_FORMATS.PINBOARD:
        return exportToPinboard(flatBookmarks, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Failed to export bookmarks:', error);
    throw error;
  }
}

/**
 * Export to HTML format
 * @param {Array} bookmarks - Array of bookmarks
 * @param {Object} options - Export options
 * @returns {string} HTML content
 */
function exportToHTML(bookmarks, options) {
  const title = options.title || 'Bookmarks';
  const date = new Date().toLocaleDateString();
  
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>${title}</TITLE>
<H1>${title}</H1>
<DL><p>
    <DT><H3 ADD_DATE="${Math.floor(Date.now() / 1000)}" LAST_MODIFIED="${Math.floor(Date.now() / 1000)}">Bookmarks</H3>
    <DL><p>`;

  for (const bookmark of bookmarks) {
    if (bookmark.url) {
      const addDate = Math.floor(new Date(bookmark.dateAdded).getTime() / 1000);
      html += `\n        <DT><A HREF="${bookmark.url}" ADD_DATE="${addDate}">${bookmark.title}</A>`;
    }
  }

  html += `\n    </DL><p>
</DL><p>`;

  return html;
}

/**
 * Export to JSON format
 * @param {Array} bookmarks - Array of bookmarks
 * @param {Object} options - Export options
 * @returns {string} JSON content
 */
function exportToJSON(bookmarks, options) {
  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    title: options.title || 'Bookmarks Export',
    bookmarks: bookmarks.map(bookmark => ({
      id: bookmark.id,
      title: bookmark.title,
      url: bookmark.url,
      dateAdded: bookmark.dateAdded,
      dateModified: bookmark.dateGroupModified,
      parentId: bookmark.parentId,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export to CSV format
 * @param {Array} bookmarks - Array of bookmarks
 * @param {Object} options - Export options
 * @returns {string} CSV content
 */
function exportToCSV(bookmarks, options) {
  const headers = ['Title', 'URL', 'Date Added', 'Folder'];
  let csv = headers.join(',') + '\n';

  for (const bookmark of bookmarks) {
    if (bookmark.url) {
      const title = `"${bookmark.title.replace(/"/g, '""')}"`;
      const url = `"${bookmark.url}"`;
      const dateAdded = new Date(bookmark.dateAdded).toLocaleDateString();
      const folder = `"${getFolderPath(bookmark.parentId)}"`;
      
      csv += `${title},${url},${dateAdded},${folder}\n`;
    }
  }

  return csv;
}

/**
 * Export to Pocket format
 * @param {Array} bookmarks - Array of bookmarks
 * @param {Object} options - Export options
 * @returns {string} Pocket JSON content
 */
function exportToPocket(bookmarks, options) {
  const pocketData = {
    list: {},
  };

  bookmarks.forEach((bookmark, index) => {
    if (bookmark.url) {
      pocketData.list[`item_${index}`] = {
        given_url: bookmark.url,
        given_title: bookmark.title,
        resolved_title: bookmark.title,
        resolved_url: bookmark.url,
        time_added: Math.floor(new Date(bookmark.dateAdded).getTime() / 1000).toString(),
        status: '0',
      };
    }
  });

  return JSON.stringify(pocketData, null, 2);
}

/**
 * Export to Raindrop format
 * @param {Array} bookmarks - Array of bookmarks
 * @param {Object} options - Export options
 * @returns {string} Raindrop JSON content
 */
function exportToRaindrop(bookmarks, options) {
  const raindropData = {
    items: bookmarks
      .filter(bookmark => bookmark.url)
      .map(bookmark => ({
        title: bookmark.title,
        link: bookmark.url,
        created: new Date(bookmark.dateAdded).toISOString(),
        tags: [], // Would need to get tags from our system
        type: 'link',
      })),
  };

  return JSON.stringify(raindropData, null, 2);
}

/**
 * Export to Pinboard format
 * @param {Array} bookmarks - Array of bookmarks
 * @param {Object} options - Export options
 * @returns {string} Pinboard JSON content
 */
function exportToPinboard(bookmarks, options) {
  const pinboardData = bookmarks
    .filter(bookmark => bookmark.url)
    .map(bookmark => ({
      href: bookmark.url,
      description: bookmark.title,
      extended: '',
      tags: '',
      time: new Date(bookmark.dateAdded).toISOString(),
      shared: 'no',
      toread: 'no',
    }));

  return JSON.stringify(pinboardData, null, 2);
}

/**
 * Import bookmarks from various formats
 * @param {string} data - Import data
 * @param {string} format - Import format
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import result
 */
export async function importBookmarks(data, format, options = {}) {
  try {
    let bookmarks = [];

    switch (format) {
      case IMPORT_EXPORT_FORMATS.HTML:
        bookmarks = parseHTMLImport(data);
        break;
      case IMPORT_EXPORT_FORMATS.JSON:
        bookmarks = parseJSONImport(data);
        break;
      case IMPORT_EXPORT_FORMATS.CSV:
        bookmarks = parseCSVImport(data);
        break;
      case IMPORT_EXPORT_FORMATS.POCKET:
        bookmarks = parsePocketImport(data);
        break;
      case IMPORT_EXPORT_FORMATS.RAINDROP:
        bookmarks = parseRaindropImport(data);
        break;
      case IMPORT_EXPORT_FORMATS.PINBOARD:
        bookmarks = parsePinboardImport(data);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }

    // Apply import options
    if (options.deduplicate) {
      bookmarks = deduplicateBookmarks(bookmarks);
    }

    if (options.folderId) {
      bookmarks = bookmarks.map(bookmark => ({
        ...bookmark,
        parentId: options.folderId,
      }));
    }

    // Import bookmarks
    const results = await Promise.allSettled(
      bookmarks.map(bookmark => chrome.bookmarks.create(bookmark))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    return {
      success: true,
      imported: successful,
      failed,
      total: bookmarks.length,
    };
  } catch (error) {
    console.error('Failed to import bookmarks:', error);
    throw error;
  }
}

/**
 * Parse HTML import
 * @param {string} html - HTML content
 * @returns {Array} Array of bookmarks
 */
function parseHTMLImport(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const links = doc.querySelectorAll('a[href]');
  
  return Array.from(links).map(link => ({
    title: link.textContent.trim() || link.href,
    url: link.href,
    dateAdded: Date.now(),
  }));
}

/**
 * Parse JSON import
 * @param {string} json - JSON content
 * @returns {Array} Array of bookmarks
 */
function parseJSONImport(json) {
  const data = JSON.parse(json);
  
  if (data.bookmarks) {
    return data.bookmarks.map(bookmark => ({
      title: bookmark.title,
      url: bookmark.url,
      dateAdded: bookmark.dateAdded || Date.now(),
    }));
  }
  
  return [];
}

/**
 * Parse CSV import
 * @param {string} csv - CSV content
 * @returns {Array} Array of bookmarks
 */
function parseCSVImport(csv) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const bookmarks = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map(v => v.replace(/^"|"$/g, ''));
    const bookmark = {};

    headers.forEach((header, index) => {
      bookmark[header.toLowerCase()] = values[index];
    });

    if (bookmark.url) {
      bookmarks.push({
        title: bookmark.title || bookmark.url,
        url: bookmark.url,
        dateAdded: Date.now(),
      });
    }
  }

  return bookmarks;
}

/**
 * Parse Pocket import
 * @param {string} json - Pocket JSON content
 * @returns {Array} Array of bookmarks
 */
function parsePocketImport(json) {
  const data = JSON.parse(json);
  const bookmarks = [];

  if (data.list) {
    Object.values(data.list).forEach(item => {
      if (item.given_url) {
        bookmarks.push({
          title: item.given_title || item.resolved_title || item.given_url,
          url: item.given_url,
          dateAdded: item.time_added ? parseInt(item.time_added) * 1000 : Date.now(),
        });
      }
    });
  }

  return bookmarks;
}

/**
 * Parse Raindrop import
 * @param {string} json - Raindrop JSON content
 * @returns {Array} Array of bookmarks
 */
function parseRaindropImport(json) {
  const data = JSON.parse(json);
  const bookmarks = [];

  if (data.items) {
    data.items.forEach(item => {
      if (item.link) {
        bookmarks.push({
          title: item.title || item.link,
          url: item.link,
          dateAdded: item.created ? new Date(item.created).getTime() : Date.now(),
        });
      }
    });
  }

  return bookmarks;
}

/**
 * Parse Pinboard import
 * @param {string} json - Pinboard JSON content
 * @returns {Array} Array of bookmarks
 */
function parsePinboardImport(json) {
  const data = JSON.parse(json);
  const bookmarks = [];

  data.forEach(item => {
    if (item.href) {
      bookmarks.push({
        title: item.description || item.href,
        url: item.href,
        dateAdded: item.time ? new Date(item.time).getTime() : Date.now(),
      });
    }
  });

  return bookmarks;
}

/**
 * Deduplicate bookmarks by URL
 * @param {Array} bookmarks - Array of bookmarks
 * @returns {Array} Deduplicated bookmarks
 */
function deduplicateBookmarks(bookmarks) {
  const seen = new Set();
  return bookmarks.filter(bookmark => {
    if (seen.has(bookmark.url)) {
      return false;
    }
    seen.add(bookmark.url);
    return true;
  });
}

/**
 * Get folder path by ID
 * @param {string} folderId - Folder ID
 * @returns {string} Folder path
 */
function getFolderPath(folderId) {
  // This would need to be implemented to get the actual folder path
  // For now, return a placeholder
  return folderId === '0' ? 'Bookmarks Bar' : `Folder ${folderId}`;
}

/**
 * Read-It-Later functionality
 */

/**
 * Save a page for later reading
 * @param {string} url - Page URL
 * @param {Object} options - Save options
 * @returns {Promise<Object>} Save result
 */
export async function saveForLater(url, options = {}) {
  try {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      throw new Error('No active tab found');
    }

    const pageData = {
      id: `readlater_${Date.now()}`,
      url: url || tab.url,
      title: options.title || tab.title,
      originalUrl: tab.url,
      savedAt: new Date().toISOString(),
      status: 'unread',
      tags: options.tags || [],
      notes: options.notes || '',
      readingTime: options.readingTime || null,
      wordCount: options.wordCount || null,
      excerpt: options.excerpt || '',
      favicon: tab.favIconUrl || '',
    };

    // Store in extension storage
    const result = await chrome.storage.local.get('read_later_items');
    const items = result.read_later_items || [];
    items.push(pageData);

    await chrome.storage.local.set({ read_later_items: items });

    return {
      success: true,
      item: pageData,
      message: 'Page saved for later reading',
    };
  } catch (error) {
    console.error('Failed to save page for later:', error);
    throw error;
  }
}

/**
 * Get all saved pages
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of saved pages
 */
export async function getSavedPages(filters = {}) {
  try {
    const result = await chrome.storage.local.get('read_later_items');
    let items = result.read_later_items || [];

    // Apply filters
    if (filters.status) {
      items = items.filter(item => item.status === filters.status);
    }

    if (filters.tags && filters.tags.length > 0) {
      items = items.filter(item => 
        filters.tags.some(tag => item.tags.includes(tag))
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      items = items.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        item.excerpt.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by saved date (newest first)
    items.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    return items;
  } catch (error) {
    console.error('Failed to get saved pages:', error);
    return [];
  }
}

/**
 * Update saved page status
 * @param {string} itemId - Item ID
 * @param {string} status - New status (read, unread, archived)
 * @returns {Promise<boolean>} Success status
 */
export async function updateSavedPageStatus(itemId, status) {
  try {
    const result = await chrome.storage.local.get('read_later_items');
    const items = result.read_later_items || [];
    
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    items[itemIndex].status = status;
    items[itemIndex].updatedAt = new Date().toISOString();

    await chrome.storage.local.set({ read_later_items: items });
    return true;
  } catch (error) {
    console.error('Failed to update saved page status:', error);
    return false;
  }
}

/**
 * Delete saved page
 * @param {string} itemId - Item ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteSavedPage(itemId) {
  try {
    const result = await chrome.storage.local.get('read_later_items');
    const items = result.read_later_items || [];
    
    const filteredItems = items.filter(item => item.id !== itemId);
    await chrome.storage.local.set({ read_later_items: filteredItems });
    
    return true;
  } catch (error) {
    console.error('Failed to delete saved page:', error);
    return false;
  }
}

/**
 * Add tags to saved page
 * @param {string} itemId - Item ID
 * @param {Array<string>} tags - Tags to add
 * @returns {Promise<boolean>} Success status
 */
export async function addTagsToSavedPage(itemId, tags) {
  try {
    const result = await chrome.storage.local.get('read_later_items');
    const items = result.read_later_items || [];
    
    const itemIndex = items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Item not found');
    }

    const existingTags = items[itemIndex].tags || [];
    const newTags = [...new Set([...existingTags, ...tags])];
    items[itemIndex].tags = newTags;
    items[itemIndex].updatedAt = new Date().toISOString();

    await chrome.storage.local.set({ read_later_items: items });
    return true;
  } catch (error) {
    console.error('Failed to add tags to saved page:', error);
    return false;
  }
}

/**
 * Get reading statistics
 * @returns {Promise<Object>} Reading statistics
 */
export async function getReadingStats() {
  try {
    const result = await chrome.storage.local.get('read_later_items');
    const items = result.read_later_items || [];
    
    const stats = {
      total: items.length,
      unread: items.filter(item => item.status === 'unread').length,
      read: items.filter(item => item.status === 'read').length,
      archived: items.filter(item => item.status === 'archived').length,
      totalReadingTime: items.reduce((sum, item) => sum + (item.readingTime || 0), 0),
      totalWordCount: items.reduce((sum, item) => sum + (item.wordCount || 0), 0),
      byTag: {},
    };

    // Group by tags
    items.forEach(item => {
      item.tags.forEach(tag => {
        if (!stats.byTag[tag]) {
          stats.byTag[tag] = 0;
        }
        stats.byTag[tag]++;
      });
    });

    return stats;
  } catch (error) {
    console.error('Failed to get reading stats:', error);
    return {
      total: 0,
      unread: 0,
      read: 0,
      archived: 0,
      totalReadingTime: 0,
      totalWordCount: 0,
      byTag: {},
    };
  }
}

/**
 * Annotations & Highlighting functionality
 */

/**
 * Save annotation for a bookmark
 * @param {string} bookmarkId - Bookmark ID
 * @param {Object} annotation - Annotation data
 * @returns {Promise<boolean>} Success status
 */
export async function saveAnnotation(bookmarkId, annotation) {
  try {
    const annotationData = {
      id: `annotation_${Date.now()}`,
      bookmarkId,
      type: annotation.type, // 'highlight', 'note', 'underline'
      text: annotation.text,
      selection: annotation.selection,
      position: annotation.position,
      color: annotation.color || '#ffeb3b',
      notes: annotation.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await chrome.storage.local.get('bookmark_annotations');
    const annotations = result.bookmark_annotations || [];
    annotations.push(annotationData);

    await chrome.storage.local.set({ bookmark_annotations: annotations });

    return true;
  } catch (error) {
    console.error('Failed to save annotation:', error);
    return false;
  }
}

/**
 * Get annotations for a bookmark
 * @param {string} bookmarkId - Bookmark ID
 * @returns {Promise<Array>} Array of annotations
 */
export async function getAnnotations(bookmarkId) {
  try {
    const result = await chrome.storage.local.get('bookmark_annotations');
    const annotations = result.bookmark_annotations || [];
    
    return annotations.filter(annotation => annotation.bookmarkId === bookmarkId);
  } catch (error) {
    console.error('Failed to get annotations:', error);
    return [];
  }
}

/**
 * Update annotation
 * @param {string} annotationId - Annotation ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<boolean>} Success status
 */
export async function updateAnnotation(annotationId, updates) {
  try {
    const result = await chrome.storage.local.get('bookmark_annotations');
    const annotations = result.bookmark_annotations || [];
    
    const annotationIndex = annotations.findIndex(a => a.id === annotationId);
    if (annotationIndex === -1) {
      throw new Error('Annotation not found');
    }

    annotations[annotationIndex] = {
      ...annotations[annotationIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await chrome.storage.local.set({ bookmark_annotations: annotations });
    return true;
  } catch (error) {
    console.error('Failed to update annotation:', error);
    return false;
  }
}

/**
 * Delete annotation
 * @param {string} annotationId - Annotation ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteAnnotation(annotationId) {
  try {
    const result = await chrome.storage.local.get('bookmark_annotations');
    const annotations = result.bookmark_annotations || [];
    
    const filteredAnnotations = annotations.filter(a => a.id !== annotationId);
    await chrome.storage.local.set({ bookmark_annotations: filteredAnnotations });
    
    return true;
  } catch (error) {
    console.error('Failed to delete annotation:', error);
    return false;
  }
}

/**
 * Get all annotations across all bookmarks
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of annotations
 */
export async function getAllAnnotations(filters = {}) {
  try {
    const result = await chrome.storage.local.get('bookmark_annotations');
    let annotations = result.bookmark_annotations || [];

    // Apply filters
    if (filters.type) {
      annotations = annotations.filter(a => a.type === filters.type);
    }

    if (filters.bookmarkId) {
      annotations = annotations.filter(a => a.bookmarkId === filters.bookmarkId);
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      annotations = annotations.filter(a => 
        a.text.toLowerCase().includes(searchTerm) ||
        a.notes.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by creation date (newest first)
    annotations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return annotations;
  } catch (error) {
    console.error('Failed to get all annotations:', error);
    return [];
  }
}

/**
 * Export annotations for a bookmark
 * @param {string} bookmarkId - Bookmark ID
 * @param {string} format - Export format ('json', 'html', 'text')
 * @returns {Promise<string>} Exported annotations
 */
export async function exportAnnotations(bookmarkId, format = 'json') {
  try {
    const annotations = await getAnnotations(bookmarkId);
    const bookmark = await chrome.bookmarks.get(bookmarkId);
    
    if (!bookmark || bookmark.length === 0) {
      throw new Error('Bookmark not found');
    }

    const bookmarkData = bookmark[0];

    switch (format) {
      case 'json':
        return JSON.stringify({
          bookmark: {
            title: bookmarkData.title,
            url: bookmarkData.url,
          },
          annotations,
          exportedAt: new Date().toISOString(),
        }, null, 2);

      case 'html':
        return generateAnnotationsHTML(bookmarkData, annotations);

      case 'text':
        return generateAnnotationsText(bookmarkData, annotations);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Failed to export annotations:', error);
    throw error;
  }
}

/**
 * Generate HTML export of annotations
 * @param {Object} bookmark - Bookmark data
 * @param {Array} annotations - Annotations array
 * @returns {string} HTML content
 */
function generateAnnotationsHTML(bookmark, annotations) {
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Annotations - ${bookmark.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .annotation { margin: 20px 0; padding: 15px; border-left: 4px solid #ffeb3b; background: #f9f9f9; }
    .annotation.highlight { border-left-color: #ffeb3b; }
    .annotation.note { border-left-color: #2196f3; }
    .annotation.underline { border-left-color: #4caf50; }
    .annotation-text { font-weight: bold; margin-bottom: 10px; }
    .annotation-notes { color: #666; }
    .annotation-meta { font-size: 12px; color: #999; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>Annotations for: ${bookmark.title}</h1>
  <p><a href="${bookmark.url}" target="_blank">${bookmark.url}</a></p>
  <hr>
`;

  if (annotations.length === 0) {
    html += '<p><em>No annotations found for this bookmark.</em></p>';
  } else {
    annotations.forEach(annotation => {
      html += `
  <div class="annotation ${annotation.type}">
    <div class="annotation-text">${escapeHtml(annotation.text)}</div>
    ${annotation.notes ? `<div class="annotation-notes">${escapeHtml(annotation.notes)}</div>` : ''}
    <div class="annotation-meta">
      Type: ${annotation.type} | Created: ${new Date(annotation.createdAt).toLocaleString()}
    </div>
  </div>
`;
    });
  }

  html += `
</body>
</html>`;

  return html;
}

/**
 * Generate text export of annotations
 * @param {Object} bookmark - Bookmark data
 * @param {Array} annotations - Annotations array
 * @returns {string} Text content
 */
function generateAnnotationsText(bookmark, annotations) {
  let text = `Annotations for: ${bookmark.title}\n`;
  text += `URL: ${bookmark.url}\n`;
  text += `Exported: ${new Date().toLocaleString()}\n`;
  text += '='.repeat(50) + '\n\n';

  if (annotations.length === 0) {
    text += 'No annotations found for this bookmark.\n';
  } else {
    annotations.forEach((annotation, index) => {
      text += `${index + 1}. [${annotation.type.toUpperCase()}]\n`;
      text += `Text: ${annotation.text}\n`;
      if (annotation.notes) {
        text += `Notes: ${annotation.notes}\n`;
      }
      text += `Created: ${new Date(annotation.createdAt).toLocaleString()}\n`;
      text += '\n';
    });
  }

  return text;
}

/**
 * Get annotation statistics
 * @returns {Promise<Object>} Annotation statistics
 */
export async function getAnnotationStats() {
  try {
    const result = await chrome.storage.local.get('bookmark_annotations');
    const annotations = result.bookmark_annotations || [];
    
    const stats = {
      total: annotations.length,
      byType: {
        highlight: 0,
        note: 0,
        underline: 0,
      },
      byBookmark: {},
      recent: [],
    };

    // Count by type
    annotations.forEach(annotation => {
      stats.byType[annotation.type] = (stats.byType[annotation.type] || 0) + 1;
    });

    // Count by bookmark
    annotations.forEach(annotation => {
      if (!stats.byBookmark[annotation.bookmarkId]) {
        stats.byBookmark[annotation.bookmarkId] = 0;
      }
      stats.byBookmark[annotation.bookmarkId]++;
    });

    // Recent annotations (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    stats.recent = annotations
      .filter(annotation => new Date(annotation.createdAt) > weekAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    return stats;
  } catch (error) {
    console.error('Failed to get annotation stats:', error);
    return {
      total: 0,
      byType: { highlight: 0, note: 0, underline: 0 },
      byBookmark: {},
      recent: [],
    };
  }
}

/**
 * Search annotations
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching annotations
 */
export async function searchAnnotations(query) {
  try {
    const result = await chrome.storage.local.get('bookmark_annotations');
    const annotations = result.bookmark_annotations || [];
    
    const searchTerm = query.toLowerCase();
    return annotations.filter(annotation => 
      annotation.text.toLowerCase().includes(searchTerm) ||
      annotation.notes.toLowerCase().includes(searchTerm)
    );
  } catch (error) {
    console.error('Failed to search annotations:', error);
    return [];
  }
}

/**
 * Get all smart folders
 * @returns {Promise<Array<Object>>} Array of smart folders
 */
export async function getSmartFolders() {
  try {
    const result = await chrome.storage.local.get('smart_folders');
    return result.smart_folders || [];
  } catch (error) {
    console.error('Failed to get smart folders:', error);
    return [];
  }
}

/**
 * Delete smart folder
 * @param {string} folderId - Smart folder ID
 * @returns {Promise<Object>} Result
 */
export async function deleteSmartFolder(folderId) {
  try {
    const result = await chrome.storage.local.get('smart_folders');
    const smartFolders = result.smart_folders || [];
    
    const filteredFolders = smartFolders.filter(folder => folder.id !== folderId);
    
    await chrome.storage.local.set({ smart_folders: filteredFolders });
    
    return {
      success: true,
      message: 'Smart folder deleted successfully',
    };
  } catch (error) {
    console.error('Failed to delete smart folder:', error);
    throw error;
  }
}

/**
 * Get smart folder by ID
 * @param {string} folderId - Smart folder ID
 * @returns {Promise<Object|null>} Smart folder or null
 */
export async function getSmartFolderById(folderId) {
  try {
    const result = await chrome.storage.local.get('smart_folders');
    const smartFolders = result.smart_folders || [];
    
    return smartFolders.find(folder => folder.id === folderId) || null;
  } catch (error) {
    console.error('Failed to get smart folder by ID:', error);
    return null;
  }
}

/**
 * Update smart folder bookmark count
 * @param {string} folderId - Smart folder ID
 * @returns {Promise<number>} Updated bookmark count
 */
export async function updateSmartFolderCount(folderId) {
  try {
    const folder = await getSmartFolderById(folderId);
    if (!folder) {
      throw new Error('Smart folder not found');
    }
    
    const bookmarks = await getSmartFolderBookmarks(folder.rules);
    const count = bookmarks.length;
    
    await updateSmartFolder(folderId, folder.rules, {
      ...folder.options,
      bookmarkCount: count,
    });
    
    return count;
  } catch (error) {
    console.error('Failed to update smart folder count:', error);
    return 0;
  }
}

/**
 * Search bookmarks with advanced filters (legacy function for backward compatibility)
 * @param {Object} filters - Search filters
 * @returns {Promise<Array<Object>>} Array of matching bookmarks
 */
export async function searchBookmarks(filters) {
  try {
    const criteria = {
      text: filters.text,
      tags: filters.tags,
      dateRange: filters.dateFrom || filters.dateTo ? {
        start: filters.dateFrom,
        end: filters.dateTo,
      } : undefined,
      folderId: filters.folderId,
    };
    
    return await advancedSearch(criteria);
  } catch (error) {
    console.error('Failed to search bookmarks:', error);
    return [];
  }
}
