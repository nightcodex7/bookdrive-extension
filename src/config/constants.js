/**
 * Application constants
 */

// Storage keys
export const STORAGE_KEYS = {
  SYNC_CONFIG: 'syncConfig',
  DEVICE_INFO: 'deviceInfo',
  LAST_SYNC_STATE: 'lastSyncState',
  ENCRYPTION_CONFIG: 'encryptionConfig',
  TEAM_CONFIG: 'teamConfig',
  BACKUP_CONFIG: 'backupConfig',
  UI_PREFERENCES: 'uiPreferences',
};

// Google Drive folder and file names
export const DRIVE = {
  ROOT_FOLDER_NAME: 'BookDrive',
  BOOKMARKS_FILE_NAME: 'bookmarks.json',
  METADATA_FILE_NAME: 'metadata.json',
  BACKUP_FOLDER_NAME: 'Backups',
  TEAM_FOLDER_NAME: 'Team',
};

// Default configuration values
export const DEFAULTS = {
  SYNC_INTERVAL: 60, // minutes
  AUTO_SYNC: true,
  SYNC_ON_STARTUP: true,
  SYNC_ON_CHANGE: true,
  NOTIFY_ON_SYNC: true,
  SYNC_MODE: 'host-to-many',
  DEVICE_ROLE: 'client',
  BACKUP_RETENTION: 10, // number of backups to keep
  BACKUP_INTERVAL: 24 * 60, // daily in minutes
};

// Event names
export const EVENTS = {
  SYNC_STARTED: 'sync-started',
  SYNC_COMPLETED: 'sync-completed',
  SYNC_FAILED: 'sync-failed',
  BOOKMARK_CHANGED: 'bookmark-changed',
  CONFLICT_DETECTED: 'conflict-detected',
  BACKUP_CREATED: 'backup-created',
  SETTINGS_CHANGED: 'settings-changed',
};

// Error codes
export const ERROR_CODES = {
  DRIVE_AUTH_FAILED: 'drive-auth-failed',
  DRIVE_API_ERROR: 'drive-api-error',
  SYNC_CONFLICT: 'sync-conflict',
  NETWORK_ERROR: 'network-error',
  STORAGE_ERROR: 'storage-error',
  ENCRYPTION_ERROR: 'encryption-error',
};

// UI theme options
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

// Feature flags
export const FEATURES = {
  ENCRYPTION: true,
  TEAM_MODE: true,
  ADAPTIVE_SYNC: true,
  BACKUP_VERSIONING: true,
};

export default {
  STORAGE_KEYS,
  DRIVE,
  DEFAULTS,
  EVENTS,
  ERROR_CODES,
  THEMES,
  FEATURES,
};
