/**
 * Type definitions for sync-related data structures
 */

/**
 * @typedef {Object} SyncConfig
 * @property {string} mode - Sync mode: 'host-to-many' or 'global'
 * @property {boolean} autoSync - Whether automatic sync is enabled
 * @property {number} syncInterval - Interval between automatic syncs in minutes
 * @property {boolean} syncOnStartup - Whether to sync when browser starts
 * @property {boolean} syncOnBookmarkChange - Whether to sync when bookmarks change
 * @property {boolean} notifyOnSync - Whether to show notifications for sync events
 * @property {string} deviceName - Name of this device for sync identification
 * @property {string} deviceRole - Role of this device: 'host' or 'client'
 * @property {string} lastSyncTime - Timestamp of last successful sync
 */

/**
 * @typedef {Object} SyncState
 * @property {boolean} isInitialized - Whether sync has been initialized
 * @property {boolean} isSyncing - Whether a sync operation is in progress
 * @property {string} lastSyncStatus - Status of last sync: 'success', 'error', 'conflict'
 * @property {string} lastSyncTime - Timestamp of last sync attempt
 * @property {string} lastSuccessfulSyncTime - Timestamp of last successful sync
 * @property {number} pendingChanges - Number of local changes pending upload
 * @property {boolean} isOnline - Whether the device is currently online
 */

/**
 * @typedef {Object} SyncConflict
 * @property {string} id - Unique identifier for the conflict
 * @property {string} bookmarkId - ID of the bookmark with conflict
 * @property {Object} localVersion - Local version of the bookmark
 * @property {Object} remoteVersion - Remote version of the bookmark
 * @property {string} timestamp - When the conflict was detected
 * @property {string} status - Status: 'pending', 'resolved-local', 'resolved-remote', 'resolved-manual'
 */

/**
 * @typedef {Object} DeviceInfo
 * @property {string} id - Unique identifier for the device
 * @property {string} name - User-assigned name for the device
 * @property {string} role - Role in sync: 'host' or 'client'
 * @property {string} lastSyncTime - Last time this device synced
 * @property {string} lastSeen - Last time this device was active
 * @property {string} browserInfo - Browser information
 * @property {string} osInfo - Operating system information
 */

/**
 * @typedef {SyncConfig} SyncConfig
 * @typedef {SyncState} SyncState
 * @typedef {SyncConflict} SyncConflict
 * @typedef {DeviceInfo} DeviceInfo
 */

// Export type definitions for better IDE support
// These are used with JSDoc annotations throughout the codebase
export const SyncConfigType = 'SyncConfig';
export const SyncStateType = 'SyncState';
export const SyncConflictType = 'SyncConflict';
export const DeviceInfoType = 'DeviceInfo';
