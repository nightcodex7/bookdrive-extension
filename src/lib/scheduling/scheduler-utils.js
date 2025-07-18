/**
 * scheduler-utils.js - Utility functions for scheduling to avoid circular dependencies
 */

// Constants
export const MISSED_BACKUPS_STORAGE_KEY = 'missedBackups';
export const MAX_MISSED_BACKUPS = 5; // Maximum number of missed backups to queue

// Resource check options for different operations
export const BACKUP_RESOURCE_CHECK_OPTIONS = {
  requireOptimal: false,
  allowConstrained: true,
  checkBattery: true,
  checkNetwork: true,
  checkPerformance: true,
};

// More strict resource check options for retries
export const RETRY_RESOURCE_CHECK_OPTIONS = {
  requireOptimal: false,
  allowConstrained: true,
  checkBattery: false, // Allow retries even on low battery
  checkNetwork: true,
  checkPerformance: true,
};

/**
 * Get the queue of missed backups
 * @returns {Promise<Array>} Array of missed backups
 */
export async function getMissedBackups() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ [MISSED_BACKUPS_STORAGE_KEY]: [] }, (result) => {
      resolve(result[MISSED_BACKUPS_STORAGE_KEY] || []);
    });
  });
}

/**
 * Save the queue of missed backups
 * @param {Array} missedBackups Array of missed backups
 * @returns {Promise<void>}
 */
export async function saveMissedBackups(missedBackups) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [MISSED_BACKUPS_STORAGE_KEY]: missedBackups }, () => {
      resolve();
    });
  });
}

/**
 * Calculate priority for a missed backup based on how long ago it was scheduled
 * @param {string} scheduledTime ISO date string of when the backup was originally scheduled
 * @returns {number} Priority value (higher = more important)
 */
export function calculatePriority(scheduledTime) {
  const now = new Date();
  const scheduled = new Date(scheduledTime);

  // Calculate hours since scheduled
  const hoursSinceScheduled = (now - scheduled) / (1000 * 60 * 60);

  // Priority increases with time but plateaus after 24 hours
  // This ensures older backups get higher priority but we don't have extreme values
  return Math.min(hoursSinceScheduled, 24);
}
