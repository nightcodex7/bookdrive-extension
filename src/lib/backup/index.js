/**
 * Backup module exports
 */

export * from './backup-metadata.js';

/**
 * Create a new backup
 * @param {string} description Backup description
 * @returns {Promise<Object>} Created backup metadata
 */
export async function createBackup(description = 'Manual backup') {
  try {
    // Import bookmarks state
    const { exportBookmarksState } = await import('../bookmarks.js');
    const bookmarksState = await exportBookmarksState();
    
    // Create backup metadata
    const backup = {
      id: `backup_${Date.now()}`,
      type: 'manual',
      status: 'completed',
      timestamp: new Date().toISOString(),
      description,
      bookmarksCount: bookmarksState.bookmarks.length,
      foldersCount: bookmarksState.folders.length,
      data: bookmarksState
    };
    
    // Save to storage
    const backups = await getAllBackups();
    backups.push(backup);
    await new Promise((resolve) => {
      chrome.storage.local.set({ backups }, resolve);
    });
    
    return backup;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}

/**
 * Get backup history
 * @returns {Promise<Array>} Array of backup metadata
 */
export async function getBackupHistory() {
  return getAllBackups();
}

/**
 * Initialize backup alarms for backup module
 * @returns {Promise<void>}
 */
export async function initializeBackupModuleAlarms() {
  try {
    // Clear existing backup alarms
    await chrome.alarms.clearAll();
    
    // Create daily backup alarm at 3 AM
    await chrome.alarms.create('daily-backup', {
      when: getNextBackupTime(),
      periodInMinutes: 24 * 60 // 24 hours
    });
    
    console.log('Backup module alarms initialized');
  } catch (error) {
    console.error('Failed to initialize backup module alarms:', error);
  }
}

/**
 * Handle backup alarm events
 * @param {Object} alarm Chrome alarm object
 * @returns {Promise<void>}
 */
export async function handleBackupAlarm(alarm) {
  if (alarm.name === 'daily-backup') {
    try {
      await createBackup('Scheduled daily backup');
      console.log('Daily backup completed');
    } catch (error) {
      console.error('Daily backup failed:', error);
    }
  }
}

/**
 * Get next backup time (3 AM)
 * @returns {number} Timestamp for next backup
 */
function getNextBackupTime() {
  const now = new Date();
  const nextBackup = new Date(now);
  nextBackup.setHours(3, 0, 0, 0);
  
  // If it's already past 3 AM today, schedule for tomorrow
  if (now.getHours() >= 3) {
    nextBackup.setDate(nextBackup.getDate() + 1);
  }
  
  return nextBackup.getTime();
}
