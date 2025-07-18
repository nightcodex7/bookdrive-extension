// Simple options script for BookDrive
console.log('BookDrive options page loaded');

// Import scheduler constants and validation function
import { FREQUENCY_OPTIONS, validateSchedule } from '../lib/index.js';

// Initialize options when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI components
  initializeTimeSelectors();
  initializeDayOfMonthSelector();

  // Load saved settings
  loadSettings();

  // Set up event listeners
  setupEventListeners();

  // Set up message listener for notifications
  setupMessageListener();
});

// Initialize time selectors (hours and minutes)
function initializeTimeSelectors() {
  // Populate hours dropdown (0-23)
  const hourSelect = document.getElementById('backup-hour');
  if (hourSelect) {
    for (let i = 0; i < 24; i++) {
      const option = document.createElement('option');
      option.value = i;
      // Format as 2-digit number (00-23)
      option.textContent = i.toString().padStart(2, '0');
      hourSelect.appendChild(option);
    }
  }

  // Populate minutes dropdown (0-59, increments of 5)
  const minuteSelect = document.getElementById('backup-minute');
  if (minuteSelect) {
    for (let i = 0; i < 60; i += 5) {
      const option = document.createElement('option');
      option.value = i;
      // Format as 2-digit number (00, 05, 10, etc.)
      option.textContent = i.toString().padStart(2, '0');
      minuteSelect.appendChild(option);
    }
  }
}

// Initialize day of month selector (1-31)
function initializeDayOfMonthSelector() {
  const dayOfMonthSelect = document.getElementById('day-of-month');
  if (dayOfMonthSelect) {
    for (let i = 1; i <= 31; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      dayOfMonthSelect.appendChild(option);
    }
  }
}

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(
    {
      // Default values
      mode: 'host',
      autoSync: true,
      syncInterval: 30,
      theme: 'auto',
      notifications: true,
      verboseLogs: false,
      teamMode: false,
      userEmail: '',
      // Default backup schedule settings
      backupSchedule: {
        enabled: false,
        frequency: 'daily',
        dayOfWeek: 0,
        dayOfMonth: 1,
        hour: 3,
        minute: 0,
        retentionCount: 10,
      },
    },
    (settings) => {
      // Update UI with loaded settings
      const modeSelect = document.getElementById('mode-select');
      if (modeSelect) modeSelect.value = settings.mode;

      const autoSyncToggle = document.getElementById('auto-sync-toggle');
      if (autoSyncToggle) autoSyncToggle.checked = settings.autoSync;

      const syncIntervalInput = document.getElementById('sync-interval');
      if (syncIntervalInput) syncIntervalInput.value = settings.syncInterval;

      const themeSelect = document.getElementById('theme-select');
      if (themeSelect) themeSelect.value = settings.theme;

      const notificationsToggle = document.getElementById('notifications-toggle');
      if (notificationsToggle) notificationsToggle.checked = settings.notifications;

      const verboseLogsToggle = document.getElementById('verbose-logs-toggle');
      if (verboseLogsToggle) verboseLogsToggle.checked = settings.verboseLogs;

      const teamModeToggle = document.getElementById('team-mode-toggle');
      if (teamModeToggle) teamModeToggle.checked = settings.teamMode;

      const userEmailInput = document.getElementById('user-email');
      if (userEmailInput) userEmailInput.value = settings.userEmail;

      // Load scheduled backup settings
      loadScheduledBackupSettings(settings.backupSchedule);
    },
  );
}

// Load scheduled backup settings
function loadScheduledBackupSettings(backupSchedule) {
  // Enable/disable toggle
  const scheduledBackupsToggle = document.getElementById('scheduled-backups-toggle');
  if (scheduledBackupsToggle) {
    scheduledBackupsToggle.checked = backupSchedule.enabled;
    toggleScheduledBackupOptions(backupSchedule.enabled);
  }

  // Frequency
  const backupFrequencySelect = document.getElementById('backup-frequency');
  if (backupFrequencySelect) {
    backupFrequencySelect.value = backupSchedule.frequency;
    updateDaySelectors(backupSchedule.frequency);
  }

  // Day of week (for weekly/bi-weekly)
  const daySelector = document.getElementById('day-selector');
  if (daySelector) {
    daySelector.value = backupSchedule.dayOfWeek;
  }

  // Day of month (for monthly)
  const dayOfMonthSelector = document.getElementById('day-of-month');
  if (dayOfMonthSelector) {
    dayOfMonthSelector.value = backupSchedule.dayOfMonth;
  }

  // Time (hour and minute)
  const hourSelect = document.getElementById('backup-hour');
  if (hourSelect) {
    hourSelect.value = backupSchedule.hour;
  }

  const minuteSelect = document.getElementById('backup-minute');
  if (minuteSelect) {
    minuteSelect.value = backupSchedule.minute;
  }

  // Retention policy
  const retentionPolicySelect = document.getElementById('retention-policy');
  if (retentionPolicySelect) {
    retentionPolicySelect.value = backupSchedule.retentionCount;
  }
}

// Toggle visibility of scheduled backup options
function toggleScheduledBackupOptions(enabled) {
  const optionsContainer = document.getElementById('scheduled-backup-options');
  if (optionsContainer) {
    optionsContainer.style.display = enabled ? 'block' : 'none';
  }
}

// Update day selectors based on frequency
function updateDaySelectors(frequency) {
  const daySelector = document.getElementById('day-selector-container');
  const dayOfMonthSelector = document.getElementById('day-of-month-container');

  if (daySelector && dayOfMonthSelector) {
    // Show/hide day of week selector
    daySelector.style.display =
      frequency === FREQUENCY_OPTIONS.WEEKLY || frequency === FREQUENCY_OPTIONS.BI_WEEKLY
        ? 'block'
        : 'none';

    // Show/hide day of month selector
    dayOfMonthSelector.style.display = frequency === FREQUENCY_OPTIONS.MONTHLY ? 'block' : 'none';
  }
}

// Save scheduled backup settings
async function saveScheduledBackupSettings() {
  const scheduledBackupsToggle = document.getElementById('scheduled-backups-toggle');
  const backupFrequencySelect = document.getElementById('backup-frequency');
  const daySelector = document.getElementById('day-selector');
  const dayOfMonthSelector = document.getElementById('day-of-month');
  const hourSelect = document.getElementById('backup-hour');
  const minuteSelect = document.getElementById('backup-minute');
  const retentionPolicySelect = document.getElementById('retention-policy');

  if (
    !scheduledBackupsToggle ||
    !backupFrequencySelect ||
    !daySelector ||
    !dayOfMonthSelector ||
    !hourSelect ||
    !minuteSelect ||
    !retentionPolicySelect
  ) {
    console.error('Could not find all required elements for scheduled backups');
    return false;
  }

  // Clear any previous validation errors
  clearValidationErrors();

  const frequency = backupFrequencySelect.value;

  // Create schedule config object
  const scheduleConfig = {
    enabled: scheduledBackupsToggle.checked,
    frequency: frequency,
    dayOfWeek: parseInt(daySelector.value, 10),
    dayOfMonth: parseInt(dayOfMonthSelector.value, 10),
    hour: parseInt(hourSelect.value, 10),
    minute: parseInt(minuteSelect.value, 10),
    retentionCount: parseInt(retentionPolicySelect.value, 10),
  };

  // Validate inputs
  const validationResult = validateSchedule(scheduleConfig);

  if (!validationResult.isValid) {
    // Display validation errors on the form
    displayValidationErrors(validationResult);
    showToast('Please correct the validation errors', 5000);
    return false;
  }

  try {
    // Import createOrUpdateSchedule function
    const { createOrUpdateSchedule } = await import('../lib/index.js');

    // Create or update the schedule
    const result = await createOrUpdateSchedule(scheduleConfig);

    if (!result.success) {
      // If there was an error, display it
      if (result.validation && !result.validation.isValid) {
        displayValidationErrors(result.validation);
      }
      showToast(`Failed to save schedule: ${result.error || 'Unknown error'}`, 5000);
      return false;
    }

    // Update alarm if enabled
    if (scheduleConfig.enabled) {
      try {
        const response = await sendMessageAsync({ action: 'updateBackupAlarm' });
        console.log('Backup alarm updated:', response);
        showToast('Settings saved and backup schedule updated', 3000);
      } catch (error) {
        console.error('Error updating backup alarm:', error);
        showToast('Error updating backup alarm. Please try again.', 5000);
      }
    } else {
      try {
        const response = await sendMessageAsync({ action: 'clearBackupAlarms' });
        console.log('Backup alarms cleared:', response);
        showToast('Settings saved and scheduled backups disabled', 3000);
      } catch (error) {
        console.error('Error clearing backup alarms:', error);
        showToast('Error clearing backup alarms. Please try again.', 5000);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to save scheduled backup settings:', error);
    showToast('Failed to save settings. Please try again.', 5000);
    return false;
  }
}

// Helper function to send a message and return a promise
function sendMessageAsync(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// Set up event listeners for settings changes
function setupEventListeners() {
  // Mode select
  const modeSelect = document.getElementById('mode-select');
  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      chrome.storage.sync.set({ mode: modeSelect.value });
    });
  }

  // Auto sync toggle
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  if (autoSyncToggle) {
    autoSyncToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ autoSync: autoSyncToggle.checked });
    });
  }

  // Sync interval
  const syncIntervalInput = document.getElementById('sync-interval');
  if (syncIntervalInput) {
    syncIntervalInput.addEventListener('change', () => {
      const value = parseInt(syncIntervalInput.value, 10);
      if (!isNaN(value) && value >= 5 && value <= 60) {
        chrome.storage.sync.set({ syncInterval: value });
      }
    });
  }

  // Theme select
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      chrome.storage.sync.set({ theme: themeSelect.value });
      applyTheme(themeSelect.value);
    });
  }

  // Notifications toggle
  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ notifications: notificationsToggle.checked });
    });
  }

  // Verbose logs toggle
  const verboseLogsToggle = document.getElementById('verbose-logs-toggle');
  if (verboseLogsToggle) {
    verboseLogsToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ verboseLogs: verboseLogsToggle.checked });
    });
  }

  // Team mode toggle
  const teamModeToggle = document.getElementById('team-mode-toggle');
  if (teamModeToggle) {
    teamModeToggle.addEventListener('change', () => {
      const isEnabled = teamModeToggle.checked;
      chrome.storage.sync.set({ teamMode: isEnabled });
      
      // Show/hide team-related settings based on toggle state
      const teamSettings = document.querySelectorAll('.team-setting');
      teamSettings.forEach(el => {
        el.style.display = isEnabled ? 'flex' : 'none';
      });
      
      // If enabling team mode, validate email
      if (isEnabled) {
        validateTeamSettings();
      }
      
      // Show notification
      showNotification(`Team Mode ${isEnabled ? 'enabled' : 'disabled'}`, isEnabled ? 'info' : 'warning');
      
      // Notify background script about team mode change
      chrome.runtime.sendMessage({ 
        action: 'teamModeChanged',
        enabled: isEnabled
      });
    });
  }

  // User email input
  const userEmailInput = document.getElementById('user-email');
  
  // Team role selection
  const teamRoleSelect = document.getElementById('team-role');
  if (teamRoleSelect) {
    chrome.storage.sync.get({ teamRole: 'member' }, (data) => {
      teamRoleSelect.value = data.teamRole || 'member';
    });
    
    teamRoleSelect.addEventListener('change', () => {
      chrome.storage.sync.set({ teamRole: teamRoleSelect.value });
    });
  }
  
  // Function to validate team settings
  function validateTeamSettings() {
    const userEmailInput = document.getElementById('user-email');
    if (!userEmailInput) return;
    
    const email = userEmailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      showNotification('Please enter a valid email address for team mode', 'error');
      return false;
    }
    
    return true;
  }
  if (userEmailInput) {
    userEmailInput.addEventListener('change', () => {
      chrome.storage.sync.set({ userEmail: userEmailInput.value });
    });
  }

  // Scheduled backups toggle
  const scheduledBackupsToggle = document.getElementById('scheduled-backups-toggle');
  if (scheduledBackupsToggle) {
    scheduledBackupsToggle.addEventListener('change', () => {
      toggleScheduledBackupOptions(scheduledBackupsToggle.checked);
      saveScheduledBackupSettings();
    });
  }

  // Backup frequency
  const backupFrequencySelect = document.getElementById('backup-frequency');
  if (backupFrequencySelect) {
    backupFrequencySelect.addEventListener('change', () => {
      updateDaySelectors(backupFrequencySelect.value);
      saveScheduledBackupSettings();
    });
  }

  // Day selector
  const daySelector = document.getElementById('day-selector');
  if (daySelector) {
    daySelector.addEventListener('change', saveScheduledBackupSettings);
  }

  // Day of month selector
  const dayOfMonthSelector = document.getElementById('day-of-month');
  if (dayOfMonthSelector) {
    dayOfMonthSelector.addEventListener('change', saveScheduledBackupSettings);
  }

  // Hour selector
  const hourSelect = document.getElementById('backup-hour');
  if (hourSelect) {
    hourSelect.addEventListener('change', saveScheduledBackupSettings);
  }

  // Minute selector
  const minuteSelect = document.getElementById('backup-minute');
  if (minuteSelect) {
    minuteSelect.addEventListener('change', saveScheduledBackupSettings);
  }

  // Retention policy selector
  const retentionPolicySelect = document.getElementById('retention-policy');
  if (retentionPolicySelect) {
    retentionPolicySelect.addEventListener('change', saveScheduledBackupSettings);
  }

  // Form submission
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate and save all settings
      await saveAllSettings();
    });
  }
}

// Show toast message
function showToast(message, duration = 3000) {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  toastContainer.textContent = message;
  toastContainer.style.display = 'block';

  setTimeout(() => {
    toastContainer.style.display = 'none';
  }, duration);
}

// Apply theme
function applyTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Display validation errors on the form
function displayValidationErrors(validationResult) {
  // Clear any existing validation errors
  clearValidationErrors();

  // If validation passed, nothing to do
  if (validationResult.isValid) {
    return;
  }

  // Display each error
  Object.entries(validationResult.errors).forEach(([field, message]) => {
    let element;

    switch (field) {
      case 'frequency':
        element = document.getElementById('backup-frequency');
        break;
      case 'dayOfWeek':
        element = document.getElementById('day-selector');
        break;
      case 'dayOfMonth':
        element = document.getElementById('day-of-month');
        break;
      case 'hour':
      case 'minute':
        element = document.getElementById(field === 'hour' ? 'backup-hour' : 'backup-minute');
        break;
      case 'retentionCount':
        element = document.getElementById('retention-policy');
        break;
      default:
        return;
    }

    if (element) {
      // Add error class to the element
      element.classList.add('validation-error');

      // Create error message element
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.textContent = message;

      // Insert error message after the element
      element.parentNode.insertBefore(errorElement, element.nextSibling);
    }
  });
}

// Clear all validation error messages
function clearValidationErrors() {
  // Remove error class from all elements
  document.querySelectorAll('.validation-error').forEach((element) => {
    element.classList.remove('validation-error');
  });

  // Remove all error message elements
  document.querySelectorAll('.error-message').forEach((element) => {
    element.remove();
  });
}

// Save all settings
async function saveAllSettings() {
  try {
    // Validate and save general settings
    const generalSettingsValid = validateGeneralSettings();

    // Validate and save scheduled backup settings
    const backupSettingsValid = await saveScheduledBackupSettings();

    if (generalSettingsValid && backupSettingsValid) {
      showToast('All settings saved successfully', 3000);
      return true;
    } else {
      showToast('Some settings could not be saved. Please check for errors.', 5000);
      return false;
    }
  } catch (error) {
    console.error('Failed to save settings:', error);
    showToast('An error occurred while saving settings', 5000);
    return false;
  }
}

// Validate general settings
function validateGeneralSettings() {
  let isValid = true;

  // Validate sync interval
  const syncIntervalInput = document.getElementById('sync-interval');
  if (syncIntervalInput) {
    const value = parseInt(syncIntervalInput.value, 10);
    if (isNaN(value) || value < 5 || value > 60) {
      syncIntervalInput.classList.add('validation-error');
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.textContent = 'Sync interval must be between 5 and 60 minutes';
      syncIntervalInput.parentNode.insertBefore(errorElement, syncIntervalInput.nextSibling);
      isValid = false;
    }
  }

  // Validate email if team mode is enabled
  const teamModeToggle = document.getElementById('team-mode-toggle');
  const userEmailInput = document.getElementById('user-email');
  if (teamModeToggle && userEmailInput && teamModeToggle.checked) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmailInput.value)) {
      userEmailInput.classList.add('validation-error');
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message';
      errorElement.textContent = 'Please enter a valid email address';
      userEmailInput.parentNode.insertBefore(errorElement, userEmailInput.nextSibling);
      isValid = false;
    }
  }

  return isValid;
}

// Set up message listener for notifications
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    // Handle toast notifications
    if (message.action === 'showToast') {
      showToast(message.message, message.duration || 3000);
      return true;
    }

    // Handle backup progress updates
    if (message.action === 'updateBackupProgress') {
      // In the options page, we don't show progress bars but we can update the status
      // in the backup history link with a notification badge
      const backupHistoryLink = document.querySelector('.backup-history-link');
      if (backupHistoryLink && !backupHistoryLink.classList.contains('notification-badge')) {
        backupHistoryLink.classList.add('notification-badge');

        // Remove the badge after a delay
        setTimeout(() => {
          backupHistoryLink.classList.remove('notification-badge');
        }, 5000);
      }
      return true;
    }

    return false;
  });
}
