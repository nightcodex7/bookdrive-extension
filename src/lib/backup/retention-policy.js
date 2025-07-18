/**
 * retention-policy.js - Backup retention policy management for BookDrive
 * 
 * This module provides functions for managing backup retention policies,
 * including determining which backups to keep and which to remove.
 */

import { getAllBackups, deleteBackup } from './backup-metadata.js';

/**
 * Get backups that should be removed based on retention policy
 * @param {string} scheduleId - ID of the schedule to check
 * @param {number} retentionCount - Number of backups to retain (-1 for unlimited)
 * @returns {Promise<Array<string>>} - Array of backup IDs to remove
 */
export async function getBackupsToRemove(scheduleId, retentionCount) {
  // If retention count is unlimited (-1), don't remove any backups
  if (retentionCount === -1) {
    return [];
  }

  try {
    // Get all backups
    const allBackups = await getAllBackups();
    
    // Filter backups for the specified schedule
    const scheduleBackups = allBackups.filter(backup => backup.scheduleId === scheduleId);
    
    // If we have fewer backups than the retention count, don't remove any
    if (scheduleBackups.length <= retentionCount) {
      return [];
    }
    
    // Sort backups by timestamp (newest first)
    scheduleBackups.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Keep the newest backups up to the retention count
    const backupsToKeep = scheduleBackups.slice(0, retentionCount);
    
    // The rest should be removed
    const backupsToRemove = scheduleBackups.slice(retentionCount);
    
    // Return the IDs of backups to remove
    return backupsToRemove.map(backup => backup.id);
  } catch (error) {
    console.error('Failed to get backups to remove:', error);
    return [];
  }
}

/**
 * Delete multiple backups
 * @param {Array<string>} backupIds - Array of backup IDs to delete
 * @returns {Promise<number>} - Number of backups deleted
 */
export async function deleteBackups(backupIds) {
  if (!backupIds || backupIds.length === 0) {
    return 0;
  }
  
  try {
    let deletedCount = 0;
    
    // Delete each backup
    for (const backupId of backupIds) {
      const deleted = await deleteBackup(backupId);
      if (deleted) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  } catch (error) {
    console.error('Failed to delete backups:', error);
    return 0;
  }
}

/**
 * Enforce retention policy for a schedule
 * @param {string} scheduleId - ID of the schedule
 * @param {number} retentionCount - Number of backups to retain (-1 for unlimited)
 * @returns {Promise<number>} - Number of backups deleted
 */
export async function enforceRetentionPolicy(scheduleId, retentionCount) {
  try {
    // If retention count is unlimited (-1), don't remove any backups
    if (retentionCount === -1) {
      return 0;
    }
    
    // Get backups to remove
    const backupsToRemove = await getBackupsToRemove(scheduleId, retentionCount);
    
    // Delete backups
    return await deleteBackups(backupsToRemove);
  } catch (error) {
    console.error('Failed to enforce retention policy:', error);
    return 0;
  }
}

/**
 * Get retention policy for a schedule
 * @param {string} scheduleId - ID of the schedule
 * @returns {Promise<Object>} - Retention policy information
 */
export async function getRetentionPolicy(scheduleId) {
  try {
    // Get all backups for the schedule
    const allBackups = await getAllBackups();
    const scheduleBackups = allBackups.filter(backup => backup.scheduleId === scheduleId);
    
    // Sort backups by timestamp (newest first)
    scheduleBackups.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    return {
      scheduleId,
      totalBackups: scheduleBackups.length,
      oldestBackup: scheduleBackups.length > 0 ? scheduleBackups[scheduleBackups.length - 1] : null,
      newestBackup: scheduleBackups.length > 0 ? scheduleBackups[0] : null,
    };
  } catch (error) {
    console.error('Failed to get retention policy:', error);
    return {
      scheduleId,
      totalBackups: 0,
      oldestBackup: null,
      newestBackup: null,
    };
  }
}