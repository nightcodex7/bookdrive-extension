/**
 * storage.js - Storage utilities for BookDrive
 *
 * This module provides a unified interface for accessing Chrome storage
 * with additional utilities for managing settings and other data.
 */

/**
 * Get settings from storage
 * @param {Object} defaultSettings - Default settings to use if not found in storage
 * @returns {Promise<Object>} - The settings object
 */
export async function getSettings(defaultSettings = {}) {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ settings: defaultSettings }, (result) => {
      resolve(result.settings);
    });
  });
}

/**
 * Save settings to storage
 * @param {Object} settings - Settings to save
 * @returns {Promise<void>}
 */
export async function setSettings(settings) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ settings }, () => {
      resolve();
    });
  });
}

/**
 * Get data from local storage
 * @param {string|Object} key - Key to get, or object with default values
 * @returns {Promise<any>} - The data
 */
export async function getLocalData(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result);
    });
  });
}

/**
 * Save data to local storage
 * @param {Object} data - Data to save
 * @returns {Promise<void>}
 */
export async function setLocalData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}

/**
 * Clear all data from storage
 * @param {boolean} includeSync - Whether to clear sync storage as well
 * @returns {Promise<void>}
 */
export async function clearStorage(includeSync = false) {
  const promises = [
    new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        resolve();
      });
    }),
  ];

  if (includeSync) {
    promises.push(
      new Promise((resolve) => {
        chrome.storage.sync.clear(() => {
          resolve();
        });
      }),
    );
  }

  return Promise.all(promises);
}

/**
 * Get the storage usage information
 * @returns {Promise<Object>} - Object with used and available bytes
 */
export async function getStorageUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      // Chrome storage has a limit of 5MB for local storage
      const totalBytes = 5 * 1024 * 1024;
      resolve({
        used: bytesInUse,
        available: totalBytes - bytesInUse,
        total: totalBytes,
        percentUsed: Math.round((bytesInUse / totalBytes) * 100),
      });
    });
  });
}
