/**
 * Type definitions for bookmark-related data structures
 */

/**
 * @typedef {Object} BookmarkNode
 * @property {string} id - Unique identifier for the bookmark
 * @property {string} [parentId] - ID of the parent folder
 * @property {number} [index] - Position within parent folder
 * @property {string} [url] - URL of the bookmark (undefined for folders)
 * @property {string} title - Display title of the bookmark
 * @property {string} [dateAdded] - Creation timestamp
 * @property {string} [dateGroupModified] - Last modification timestamp for folders
 * @property {BookmarkNode[]} [children] - Child bookmarks for folders
 */

/**
 * @typedef {Object} BookmarkTree
 * @property {BookmarkNode[]} roots - Root level bookmark folders
 */

/**
 * @typedef {Object} BookmarkChange
 * @property {string} type - Type of change: 'create', 'update', 'remove', 'move'
 * @property {BookmarkNode} node - The affected bookmark node
 * @property {string} [oldParentId] - Previous parent ID for move operations
 * @property {number} [oldIndex] - Previous index for move operations
 * @property {string} [oldUrl] - Previous URL for update operations
 * @property {string} [oldTitle] - Previous title for update operations
 * @property {string} timestamp - When the change occurred
 */

/**
 * @typedef {Object} SyncResult
 * @property {boolean} success - Whether the sync operation succeeded
 * @property {number} added - Number of bookmarks added
 * @property {number} updated - Number of bookmarks updated
 * @property {number} deleted - Number of bookmarks deleted
 * @property {number} moved - Number of bookmarks moved
 * @property {number} conflicts - Number of conflicts detected
 * @property {Error} [error] - Error object if sync failed
 */

/**
 * @typedef {BookmarkNode} BookmarkNode
 * @typedef {BookmarkTree} BookmarkTree
 * @typedef {BookmarkChange} BookmarkChange
 * @typedef {SyncResult} SyncResult
 */

export // Explicitly export the type definitions for better IDE support
// These are used with JSDoc annotations throughout the codebase
 {};
