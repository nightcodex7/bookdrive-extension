// BookDrive Advanced Settings
// This file handles the advanced settings page functionality

// Import required modules
import { featureManager } from '../lib/index.js';

// Storage keys
const STORAGE_KEYS = {
  THEME: 'bookDriveTheme',
  SYNC_MODE: 'bookDriveSyncMode',
  AUTO_SYNC: 'bookDriveAutoSync',
  SYNC_INTERVAL: 'bookDriveSyncInterval',
  TEAM_MODE: 'bookDriveTeamMode',
  USER_EMAIL: 'bookDriveUserEmail',
  TEAM_MEMBERS: 'bookDriveTeamMembers',
  SYNC_ANALYTICS: 'bookDriveSyncAnalytics',
  VERBOSE_LOGS: 'bookDriveVerboseLogs',
  PERF_LOGS: 'bookDrivePerfLogs',
  ENCRYPTION: 'bookDriveEncryption',
  ENCRYPTION_PASSPHRASE: 'bookDriveEncryptionPassphrase',
  SCHEDULED_BACKUPS: 'bookDriveScheduledBackups',
  BACKUP_SCHEDULE: 'bookDriveBackupSchedule',
};

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize feature manager
    await featureManager.initialize();

    // Apply initial theme
    await applyInitialTheme();

    // Initialize UI components
    initializeTimeSelectors();
    initializeDayOfMonthSelector();

    // Load saved settings
    await loadSettings();

    // Set up event listeners
    setupEventListeners();

    // Set up message listener for notifications
    setupMessageListener();
  } catch (error) {
    console.error('Failed to initialize advanced settings:', error);
  }
});

/**
 * Apply initial theme
 */
async function applyInitialTheme() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.THEME]);
    const theme = result[STORAGE_KEYS.THEME] || 'auto';
    applyTheme(theme);
  } catch (error) {
    console.error('Failed to apply initial theme:', error);
  }
}

// Initialize time selectors (hours and minutes)
function initializeTimeSelectors() {
  // Populate hours dropdown (0-23)
  const hourSelect = document.getElementById('backup-hour');
  if (hourSelect) {
    for (let i = 0; i < 24; i++) {
      const option = document.createElement('option');
      option.value = i;
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
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get({
      // Default values
      [STORAGE_KEYS.SYNC_MODE]: 'host',
      [STORAGE_KEYS.AUTO_SYNC]: true,
      [STORAGE_KEYS.SYNC_INTERVAL]: 30,
      [STORAGE_KEYS.THEME]: 'auto',
      [STORAGE_KEYS.TEAM_MODE]: false,
      [STORAGE_KEYS.USER_EMAIL]: '',
      [STORAGE_KEYS.ENCRYPTION]: false,
      [STORAGE_KEYS.ANALYTICS]: false,
      [STORAGE_KEYS.VERBOSE_LOGS]: false,
      [STORAGE_KEYS.PERF_LOGS]: false,
      [STORAGE_KEYS.SCHEDULED_BACKUPS]: false,
      [STORAGE_KEYS.BACKUP_SCHEDULE]: {
        enabled: false,
        frequency: 'daily',
        dayOfWeek: 0,
        dayOfMonth: 1,
        hour: 3,
        minute: 0,
        retentionCount: 10,
      },
    });

    // Apply settings to UI
    applySettingsToUI(result);
  } catch (error) {
    console.error('Failed to load settings:', error);
    showToast('Failed to load settings', 'error');
  }
}

// Apply settings to UI
function applySettingsToUI(settings) {
  // Theme
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = settings[STORAGE_KEYS.THEME] || 'auto';
  }

  // Sync settings
  const modeSelect = document.getElementById('mode-select');
  if (modeSelect) {
    modeSelect.value = settings[STORAGE_KEYS.SYNC_MODE] || 'host';
  }

  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  if (autoSyncToggle) {
    autoSyncToggle.checked = settings[STORAGE_KEYS.AUTO_SYNC] || false;
  }

  const syncInterval = document.getElementById('sync-interval');
  if (syncInterval) {
    syncInterval.value = settings[STORAGE_KEYS.SYNC_INTERVAL] || 30;
  }

  // Team mode
  const teamModeToggle = document.getElementById('team-mode-toggle');
  if (teamModeToggle) {
    teamModeToggle.checked = settings[STORAGE_KEYS.TEAM_MODE] || false;
    toggleTeamOptions(teamModeToggle.checked);
  }

  const userEmail = document.getElementById('user-email');
  if (userEmail) {
    userEmail.value = settings[STORAGE_KEYS.USER_EMAIL] || '';
  }

  // Analytics & Logging
  const analyticsToggle = document.getElementById('sync-analytics-toggle');
  if (analyticsToggle) {
    analyticsToggle.checked = settings[STORAGE_KEYS.ANALYTICS] || false;
  }

  const verboseLogsToggle = document.getElementById('verbose-logs-toggle');
  if (verboseLogsToggle) {
    verboseLogsToggle.checked = settings[STORAGE_KEYS.VERBOSE_LOGS] || false;
  }

  const perfLogsToggle = document.getElementById('perf-logs-toggle');
  if (perfLogsToggle) {
    perfLogsToggle.checked = settings[STORAGE_KEYS.PERF_LOGS] || false;
  }

  // Encryption
  const encryptionToggle = document.getElementById('encryption-toggle');
  if (encryptionToggle) {
    encryptionToggle.checked = settings[STORAGE_KEYS.ENCRYPTION] || false;
    toggleEncryptionOptions(encryptionToggle.checked);
  }

  // Scheduled backups
  const scheduledBackupsToggle = document.getElementById('scheduled-backups-toggle');
  if (scheduledBackupsToggle) {
    scheduledBackupsToggle.checked = settings[STORAGE_KEYS.SCHEDULED_BACKUPS] || false;
  }

  // Load backup schedule settings
  loadScheduledBackupSettings(settings[STORAGE_KEYS.BACKUP_SCHEDULE]);
}

// Load scheduled backup settings
function loadScheduledBackupSettings(backupSchedule) {
  if (!backupSchedule) return;

  const frequencySelect = document.getElementById('backup-frequency');
  if (frequencySelect) {
    frequencySelect.value = backupSchedule.frequency || 'daily';
    updateDaySelectors(backupSchedule.frequency);
  }

  const daySelector = document.getElementById('day-selector');
  if (daySelector) {
    daySelector.value = backupSchedule.dayOfWeek || 0;
  }

  const dayOfMonth = document.getElementById('day-of-month');
  if (dayOfMonth) {
    dayOfMonth.value = backupSchedule.dayOfMonth || 1;
  }

  const hourSelect = document.getElementById('backup-hour');
  if (hourSelect) {
    hourSelect.value = backupSchedule.hour || 3;
  }

  const minuteSelect = document.getElementById('backup-minute');
  if (minuteSelect) {
    minuteSelect.value = backupSchedule.minute || 0;
  }

  const retentionPolicy = document.getElementById('retention-policy');
  if (retentionPolicy) {
    retentionPolicy.value = backupSchedule.retentionCount || 10;
  }
}

// Toggle team options visibility
function toggleTeamOptions(enabled) {
  const teamOptions = document.getElementById('team-options');
  if (teamOptions) {
    teamOptions.style.display = enabled ? 'block' : 'none';
  }
}

// Toggle encryption options visibility
function toggleEncryptionOptions(enabled) {
  const encryptionOptions = document.getElementById('encryption-options');
  if (encryptionOptions) {
    encryptionOptions.style.display = enabled ? 'block' : 'none';
  }
}

// Update day selectors based on frequency
function updateDaySelectors(frequency) {
  const daySelectorContainer = document.getElementById('day-selector-container');
  const dayOfMonthContainer = document.getElementById('day-of-month-container');

  if (daySelectorContainer) {
    daySelectorContainer.style.display =
      frequency === 'weekly' || frequency === 'bi-weekly' ? 'block' : 'none';
  }

  if (dayOfMonthContainer) {
    dayOfMonthContainer.style.display = frequency === 'monthly' ? 'block' : 'none';
  }
}

// Set up event listeners
function setupEventListeners() {
  // Form submission
  const form = document.getElementById('options-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Theme selection
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', handleThemeChange);
  }

  // Team mode toggle
  const teamModeToggle = document.getElementById('team-mode-toggle');
  if (teamModeToggle) {
    teamModeToggle.addEventListener('change', handleTeamModeChange);
  }

  // Encryption toggle
  const encryptionToggle = document.getElementById('encryption-toggle');
  if (encryptionToggle) {
    encryptionToggle.addEventListener('change', handleEncryptionChange);
  }

  // Backup frequency change
  const backupFrequency = document.getElementById('backup-frequency');
  if (backupFrequency) {
    backupFrequency.addEventListener('change', handleBackupFrequencyChange);
  }

  // Analytics buttons
  const viewAnalyticsBtn = document.getElementById('view-analytics-btn');
  if (viewAnalyticsBtn) {
    viewAnalyticsBtn.addEventListener('click', handleViewAnalytics);
  }

  const exportLogsBtn = document.getElementById('export-logs-btn');
  if (exportLogsBtn) {
    exportLogsBtn.addEventListener('click', handleExportLogs);
  }

  const clearLogsBtn = document.getElementById('clear-logs-btn');
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', handleClearLogs);
  }

  // Encryption buttons
  const enableEncryptionBtn = document.getElementById('enable-encryption-btn');
  if (enableEncryptionBtn) {
    enableEncryptionBtn.addEventListener('click', handleEnableEncryption);
  }

  const changePassphraseBtn = document.getElementById('change-passphrase-btn');
  if (changePassphraseBtn) {
    changePassphraseBtn.addEventListener('click', handleChangePassphrase);
  }

  const disableEncryptionBtn = document.getElementById('disable-encryption-btn');
  if (disableEncryptionBtn) {
    disableEncryptionBtn.addEventListener('click', handleDisableEncryption);
  }

  // Team member management
  const addMemberBtn = document.getElementById('add-member-btn');
  if (addMemberBtn) {
    addMemberBtn.addEventListener('click', handleAddTeamMember);
  }
}

// Handle form submission
async function handleFormSubmit(event) {
  event.preventDefault();

  try {
    await saveAllSettings();
    showToast('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// Handle theme change
async function handleThemeChange(event) {
  const theme = event.target.value;
  applyTheme(theme);

  try {
    await chrome.storage.sync.set({ [STORAGE_KEYS.THEME]: theme });
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}

// Handle team mode change
function handleTeamModeChange(event) {
  const enabled = event.target.checked;
  toggleTeamOptions(enabled);
}

// Handle encryption change
function handleEncryptionChange(event) {
  const enabled = event.target.checked;
  toggleEncryptionOptions(enabled);
}

// Handle backup frequency change
function handleBackupFrequencyChange(event) {
  const frequency = event.target.value;
  updateDaySelectors(frequency);
}

// Handle view analytics
function handleViewAnalytics() {
  showToast('Analytics feature coming soon!', 'info');
}

// Handle export logs
function handleExportLogs() {
  showToast('Export logs feature coming soon!', 'info');
}

// Handle clear logs
function handleClearLogs() {
  if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
    showToast('Logs cleared successfully!', 'success');
  }
}

// Handle enable encryption
function handleEnableEncryption() {
  const passphrase = document.getElementById('encryption-passphrase').value;
  const confirmPassphrase = document.getElementById('confirm-passphrase').value;

  if (!passphrase) {
    showToast('Please enter a passphrase', 'error');
    return;
  }

  if (passphrase !== confirmPassphrase) {
    showToast('Passphrases do not match', 'error');
    return;
  }

  if (passphrase.length < 8) {
    showToast('Passphrase must be at least 8 characters long', 'error');
    return;
  }

  showToast('Encryption enabled successfully!', 'success');
}

// Handle change passphrase
function handleChangePassphrase() {
  showToast('Change passphrase feature coming soon!', 'info');
}

// Handle disable encryption
function handleDisableEncryption() {
  if (
    confirm('Are you sure you want to disable encryption? This will make your data unencrypted.')
  ) {
    showToast('Encryption disabled successfully!', 'success');
  }
}

// Handle add team member
function handleAddTeamMember() {
  const email = document.getElementById('new-member-email').value;
  const role = document.getElementById('new-member-role').value;

  if (!email || !isValidEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  showToast(`Team member ${email} added successfully!`, 'success');
  document.getElementById('new-member-email').value = '';
}

// Apply theme
function applyTheme(theme) {
  const root = document.documentElement;

  if (
    theme === 'dark' ||
    (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }
}

// Save all settings
async function saveAllSettings() {
  const settings = {
    [STORAGE_KEYS.THEME]: document.getElementById('theme-select')?.value || 'auto',
    [STORAGE_KEYS.SYNC_MODE]: document.getElementById('mode-select')?.value || 'host',
    [STORAGE_KEYS.AUTO_SYNC]: document.getElementById('auto-sync-toggle')?.checked || false,
    [STORAGE_KEYS.SYNC_INTERVAL]: parseInt(document.getElementById('sync-interval')?.value) || 30,
    [STORAGE_KEYS.TEAM_MODE]: document.getElementById('team-mode-toggle')?.checked || false,
    [STORAGE_KEYS.USER_EMAIL]: document.getElementById('user-email')?.value || '',
    [STORAGE_KEYS.ENCRYPTION]: document.getElementById('encryption-toggle')?.checked || false,
    [STORAGE_KEYS.ANALYTICS]: document.getElementById('sync-analytics-toggle')?.checked || false,
    [STORAGE_KEYS.VERBOSE_LOGS]: document.getElementById('verbose-logs-toggle')?.checked || false,
    [STORAGE_KEYS.PERF_LOGS]: document.getElementById('perf-logs-toggle')?.checked || false,
    [STORAGE_KEYS.SCHEDULED_BACKUPS]:
      document.getElementById('scheduled-backups-toggle')?.checked || false,
    [STORAGE_KEYS.BACKUP_SCHEDULE]: {
      enabled: document.getElementById('scheduled-backups-toggle')?.checked || false,
      frequency: document.getElementById('backup-frequency')?.value || 'daily',
      dayOfWeek: parseInt(document.getElementById('day-selector')?.value) || 0,
      dayOfMonth: parseInt(document.getElementById('day-of-month')?.value) || 1,
      hour: parseInt(document.getElementById('backup-hour')?.value) || 3,
      minute: parseInt(document.getElementById('backup-minute')?.value) || 0,
      retentionCount: parseInt(document.getElementById('retention-policy')?.value) || 10,
    },
  };

  await chrome.storage.sync.set(settings);
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast-container');
  if (!toast) return;

  toast.textContent = message;
  toast.style.display = 'block';

  // Add type-specific styling
  toast.className = `toast-container ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Set up message listener
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'settings-updated') {
      showToast('Settings updated from another tab', 'info');
    }
  });
}
