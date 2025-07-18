/**
 * scheduler.js - Backup scheduling for BookDrive
 * 
 * This module provides functions for managing backup schedules,
 * including creating, updating, and checking schedules.
 */

import { getSettings, setSettings } from '../storage.js';

// Default schedule settings
const DEFAULT_SCHEDULE = {
  id: 'default',
  enabled: true,
  frequency: 'daily',
  hour: 3,
  minute: 0,
  lastBackupTime: null,
  nextBackupTime: null,
};

/**
 * Get the current backup schedule
 * @returns {Promise<Object>} The schedule object
 */
export async function getSchedule() {
  const settings = await getSettings();
  return settings.schedule || DEFAULT_SCHEDULE;
}

/**
 * Update the backup schedule
 * @param {Object} scheduleUpdates - Updates to apply to the schedule
 * @returns {Promise<Object>} The updated schedule
 */
export async function updateSchedule(scheduleUpdates) {
  const settings = await getSettings();
  const currentSchedule = settings.schedule || DEFAULT_SCHEDULE;
  
  // Apply updates
  const updatedSchedule = {
    ...currentSchedule,
    ...scheduleUpdates,
  };
  
  // Calculate next backup time if enabled
  if (updatedSchedule.enabled) {
    updatedSchedule.nextBackupTime = calculateNextBackupTime(updatedSchedule);
  }
  
  // Save updated schedule
  await setSettings({
    ...settings,
    schedule: updatedSchedule,
  });
  
  return updatedSchedule;
}

/**
 * Update the last backup time and calculate next backup time
 * @returns {Promise<Object>} The updated schedule
 */
export async function updateBackupTime() {
  const now = new Date();
  const schedule = await getSchedule();
  
  const updates = {
    lastBackupTime: now.toISOString(),
    nextBackupTime: calculateNextBackupTime({
      ...schedule,
      lastBackupTime: now.toISOString(),
    }),
  };
  
  return updateSchedule(updates);
}

/**
 * Calculate the next backup time based on schedule settings
 * @param {Object} schedule - The schedule object
 * @returns {string} ISO date string for next backup time
 */
export function calculateNextBackupTime(schedule) {
  const now = new Date();
  const next = new Date();
  
  // Set time based on schedule
  next.setHours(schedule.hour || 0);
  next.setMinutes(schedule.minute || 0);
  next.setSeconds(0);
  next.setMilliseconds(0);
  
  // Adjust date based on frequency
  switch (schedule.frequency) {
    case 'hourly':
      next.setHours(now.getHours() + 1);
      break;
      
    case 'daily':
      // If today's scheduled time has passed, move to tomorrow
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      break;
      
    case 'weekly':
      // Set to specified day of week (0 = Sunday)
      const dayOfWeek = schedule.dayOfWeek || 0;
      const currentDay = next.getDay();
      const daysToAdd = (dayOfWeek + 7 - currentDay) % 7;
      
      next.setDate(next.getDate() + daysToAdd);
      
      // If today is the target day but time has passed, move to next week
      if (daysToAdd === 0 && next <= now) {
        next.setDate(next.getDate() + 7);
      }
      break;
      
    case 'monthly':
      // Set to specified day of month
      const dayOfMonth = schedule.dayOfMonth || 1;
      next.setDate(Math.min(dayOfMonth, daysInMonth(next.getFullYear(), next.getMonth() + 1)));
      
      // If this month's scheduled time has passed, move to next month
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
        next.setDate(Math.min(dayOfMonth, daysInMonth(next.getFullYear(), next.getMonth() + 1)));
      }
      break;
      
    default:
      // Default to daily
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
  }
  
  return next.toISOString();
}

/**
 * Check if a backup is due based on the schedule
 * @returns {Promise<boolean>} True if backup is due
 */
export async function isBackupDue() {
  const schedule = await getSchedule();
  
  // If scheduling is disabled, no backup is due
  if (!schedule.enabled) {
    return false;
  }
  
  // If no next backup time is set, calculate it
  if (!schedule.nextBackupTime) {
    const updatedSchedule = await updateSchedule({
      nextBackupTime: calculateNextBackupTime(schedule),
    });
    return false; // Just calculated, so not due yet
  }
  
  // Check if next backup time has passed
  const now = new Date();
  const nextBackupTime = new Date(schedule.nextBackupTime);
  
  return nextBackupTime <= now;
}

/**
 * Get the number of backups to retain based on schedule frequency
 * @returns {Promise<number>} Number of backups to retain
 */
export async function getRetentionCount() {
  const schedule = await getSchedule();
  
  // Default retention counts by frequency
  const retentionCounts = {
    hourly: 24,   // Keep 24 hourly backups
    daily: 30,    // Keep 30 daily backups
    weekly: 12,   // Keep 12 weekly backups
    monthly: 12,  // Keep 12 monthly backups
  };
  
  // Use custom retention count if set, otherwise use default
  return schedule.retentionCount || retentionCounts[schedule.frequency] || 30;
}

/**
 * Helper function to get days in a month
 * @param {number} year - Year
 * @param {number} month - Month (1-12)
 * @returns {number} Number of days in the month
 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Validate schedule configuration
 * @param {Object} schedule - Schedule object to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export function validateSchedule(schedule) {
  const errors = [];
  
  if (!schedule || typeof schedule !== 'object') {
    errors.push('Schedule must be an object');
    return { isValid: false, errors };
  }
  
  // Validate frequency
  const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly'];
  if (!validFrequencies.includes(schedule.frequency)) {
    errors.push('Invalid frequency. Must be one of: ' + validFrequencies.join(', '));
  }
  
  // Validate hour (0-23)
  if (typeof schedule.hour !== 'number' || schedule.hour < 0 || schedule.hour > 23) {
    errors.push('Hour must be a number between 0 and 23');
  }
  
  // Validate minute (0-59)
  if (typeof schedule.minute !== 'number' || schedule.minute < 0 || schedule.minute > 59) {
    errors.push('Minute must be a number between 0 and 59');
  }
  
  // Validate weekly schedule
  if (schedule.frequency === 'weekly') {
    if (typeof schedule.dayOfWeek !== 'number' || schedule.dayOfWeek < 0 || schedule.dayOfWeek > 6) {
      errors.push('Day of week must be a number between 0 (Sunday) and 6 (Saturday)');
    }
  }
  
  // Validate monthly schedule
  if (schedule.frequency === 'monthly') {
    if (typeof schedule.dayOfMonth !== 'number' || schedule.dayOfMonth < 1 || schedule.dayOfMonth > 31) {
      errors.push('Day of month must be a number between 1 and 31');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}