// storage.js - chrome.storage.sync helpers for Bookmark Sync Drive

/**
 * Default settings for BookDrive.
 */
const DEFAULTS = {
  deviceId: null, // will be generated
  mode: 'host', // 'host' or 'global'
  autoSync: true,
  syncInterval: 10, // minutes
  theme: 'auto', // 'auto', 'light', 'dark'
  notifications: true,
  verboseLogs: false,
};

/**
 * Generate a unique device ID based on browser info and randomness.
 * @returns {string}
 */
function generateDeviceId() {
  return (
    (navigator.userAgent.match(/(Chrome|Vivaldi|Brave|Edge|Opera)/) || ['Chromium'])[0] +
    '-' +
    'Browser' +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Log and optionally notify errors from storage operations.
 * @param {string} context
 * @param {unknown} error
 */
function handleStorageError(context, error) {
  let msg = `[Storage] ${context}: `;
  if (error && typeof error === 'object' && 'message' in error) {
    msg += error.message;
  } else {
    msg += String(error);
  }
  if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'storageError', error: msg });
  }
  if (typeof console !== 'undefined') console.error(msg);
}

/**
 * Get all settings from chrome.storage.sync, generating deviceId if missing.
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  try {
    return await new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULTS, (items) => {
        if (!items.deviceId || typeof items.deviceId !== 'string') {
          items.deviceId = generateDeviceId();
          chrome.storage.sync.set({ deviceId: items.deviceId });
        }
        resolve(items);
      });
    });
  } catch (e) {
    handleStorageError('getSettings', e);
    throw e;
  }
}

/**
 * Update settings in chrome.storage.sync.
 * @param {Object} updates
 * @returns {Promise<void>}
 */
export async function setSettings(updates) {
  try {
    return await new Promise((resolve) => {
      chrome.storage.sync.set(updates, () => resolve());
    });
  } catch (e) {
    handleStorageError('setSettings', e);
    throw e;
  }
}

/**
 * Get the device ID from settings.
 * @returns {Promise<string>}
 */
export async function getDeviceId() {
  try {
    const settings = await getSettings();
    return settings.deviceId;
  } catch (e) {
    handleStorageError('getDeviceId', e);
    throw e;
  }
}

/**
 * Get the sync mode from settings.
 * @returns {Promise<string>}
 */
export async function getMode() {
  try {
    const settings = await getSettings();
    return settings.mode;
  } catch (e) {
    handleStorageError('getMode', e);
    throw e;
  }
}

/**
 * Set the sync mode in settings.
 * @param {string} mode
 * @returns {Promise<void>}
 */
export async function setMode(mode) {
  try {
    return await setSettings({ mode });
  } catch (e) {
    handleStorageError('setMode', e);
    throw e;
  }
}

/**
 * Get the theme from settings.
 * @returns {Promise<string>}
 */
export async function getTheme() {
  try {
    const settings = await getSettings();
    return settings.theme;
  } catch (e) {
    handleStorageError('getTheme', e);
    throw e;
  }
}

/**
 * Set the theme in settings.
 * @param {string} theme
 * @returns {Promise<void>}
 */
export async function setTheme(theme) {
  try {
    return await setSettings({ theme });
  } catch (e) {
    handleStorageError('setTheme', e);
    throw e;
  }
}

/**
 * Get the verbose logs setting.
 * @returns {Promise<boolean>}
 */
export async function getVerboseLogs() {
  try {
    const settings = await getSettings();
    return settings.verboseLogs;
  } catch (e) {
    handleStorageError('getVerboseLogs', e);
    throw e;
  }
}

/**
 * Set the verbose logs setting.
 * @param {boolean} val
 * @returns {Promise<void>}
 */
export async function setVerboseLogs(val) {
  try {
    return await setSettings({ verboseLogs: val });
  } catch (e) {
    handleStorageError('setVerboseLogs', e);
    throw e;
  }
}
