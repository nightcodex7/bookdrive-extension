// BookDrive Advanced Settings
// This file handles the advanced settings page functionality

// Import required modules
import { featureManager } from '../lib/index.js';
import { getTeamMembers, addTeamMember, removeTeamMember, updateMemberRole } from '../lib/team/team-manager.js';
import { getEnhancedTeamConfig, setUserPermission, getUserPermissions, logDetailedActivity } from '../lib/team/enhanced-team-manager.js';
import { getTeamDashboard, recordTeamActivity, exportTeamAnalytics } from '../lib/team/team-analytics.js';
import { createPublicCollection, getPublicCollection, searchPublicCollections } from '../lib/public-collections.js';
import { createAdvancedSmartFolder, getSmartFolders, bulkAddTags, bulkRemoveTags, advancedSearch } from '../lib/bookmarks.js';
import { resolveConflictsAdvanced, CONFLICT_STRATEGIES } from '../lib/sync/conflict-resolver.js';
import { AdvancedEncryptionManager, ENCRYPTION_ALGORITHMS, getRecommendedConfig } from '../lib/encryption/advanced-encryption.js';

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
  ENCRYPTION_ALGORITHM: 'bookDriveEncryptionAlgorithm',
  SCHEDULED_BACKUPS: 'bookDriveScheduledBackups',
  BACKUP_SCHEDULE: 'bookDriveBackupSchedule',
  CONFLICT_STRATEGY: 'bookDriveConflictStrategy',
  SMART_FOLDERS: 'bookDriveSmartFolders',
  PUBLIC_COLLECTIONS: 'bookDrivePublicCollections',
  TEAM_PERMISSIONS: 'bookDriveTeamPermissions',
  TEAM_ACTIVITY_LOGS: 'bookDriveTeamActivityLogs',
};

// Global variables
let encryptionManager = null;
let currentTeamMembers = [];
let currentSmartFolders = [];
let currentPublicCollections = [];

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Initialize feature manager
    await featureManager.initialize();

    // Initialize encryption manager
    await initializeEncryptionManager();

    // Apply initial theme
    await applyInitialTheme();

    // Initialize UI components
    initializeTimeSelectors();
    initializeDayOfMonthSelector();
    initializeConflictStrategySelector();
    initializeEncryptionAlgorithmSelector();

    // Load saved settings
    await loadSettings();

    // Load team data
    await loadTeamData();

    // Load smart folders
    await loadSmartFolders();

    // Load public collections
    await loadPublicCollections();

    // Set up event listeners
    setupEventListeners();

    // Set up message listener for notifications
    setupMessageListener();

    console.log('Advanced settings initialized successfully');
  } catch (error) {
    console.error('Failed to initialize advanced settings:', error);
    showToast('Failed to initialize settings: ' + error.message, 'error');
  }
});

/**
 * Initialize encryption manager
 */
async function initializeEncryptionManager() {
  try {
    const config = getRecommendedConfig('high');
    encryptionManager = new AdvancedEncryptionManager(config);
  } catch (error) {
    console.error('Failed to initialize encryption manager:', error);
  }
}

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

// Initialize conflict strategy selector
function initializeConflictStrategySelector() {
  const strategySelect = document.getElementById('conflict-strategy');
  if (strategySelect) {
    Object.entries(CONFLICT_STRATEGIES).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      strategySelect.appendChild(option);
    });
  }
}

// Initialize encryption algorithm selector
function initializeEncryptionAlgorithmSelector() {
  const algorithmSelect = document.getElementById('encryption-algorithm');
  if (algorithmSelect) {
    Object.entries(ENCRYPTION_ALGORITHMS).forEach(([key, value]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      algorithmSelect.appendChild(option);
    });
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
      [STORAGE_KEYS.ENCRYPTION_ALGORITHM]: ENCRYPTION_ALGORITHMS.AES_GCM,
      [STORAGE_KEYS.SYNC_ANALYTICS]: false,
      [STORAGE_KEYS.VERBOSE_LOGS]: false,
      [STORAGE_KEYS.PERF_LOGS]: false,
      [STORAGE_KEYS.SCHEDULED_BACKUPS]: false,
      [STORAGE_KEYS.CONFLICT_STRATEGY]: CONFLICT_STRATEGIES.INTELLIGENT_MERGE,
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

// Load team data
async function loadTeamData() {
  try {
    currentTeamMembers = await getTeamMembers();
    updateTeamMembersList();
  } catch (error) {
    console.error('Failed to load team data:', error);
  }
}

// Load smart folders
async function loadSmartFolders() {
  try {
    currentSmartFolders = await getSmartFolders();
    updateSmartFoldersList();
  } catch (error) {
    console.error('Failed to load smart folders:', error);
  }
}

// Load public collections
async function loadPublicCollections() {
  try {
    const collections = await searchPublicCollections({});
    currentPublicCollections = collections;
    updatePublicCollectionsList();
  } catch (error) {
    console.error('Failed to load public collections:', error);
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
    analyticsToggle.checked = settings[STORAGE_KEYS.SYNC_ANALYTICS] || false;
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

  const encryptionAlgorithm = document.getElementById('encryption-algorithm');
  if (encryptionAlgorithm) {
    encryptionAlgorithm.value = settings[STORAGE_KEYS.ENCRYPTION_ALGORITHM] || ENCRYPTION_ALGORITHMS.AES_GCM;
  }

  // Conflict strategy
  const conflictStrategy = document.getElementById('conflict-strategy');
  if (conflictStrategy) {
    conflictStrategy.value = settings[STORAGE_KEYS.CONFLICT_STRATEGY] || CONFLICT_STRATEGIES.INTELLIGENT_MERGE;
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

// Update team members list
function updateTeamMembersList() {
  const teamMembersList = document.getElementById('team-members-list');
  if (!teamMembersList) return;

  if (currentTeamMembers.length === 0) {
    teamMembersList.innerHTML = '<div class="help-text">No team members added yet</div>';
    return;
  }

  const membersHtml = currentTeamMembers.map(member => `
    <div class="team-member-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--md-spacing-sm); border: 1px solid var(--md-outline); border-radius: var(--md-radius-sm); margin-bottom: var(--md-spacing-sm);">
      <div>
        <strong>${member.email}</strong>
        <span class="status-badge ${member.role === 'admin' ? 'enabled' : 'disabled'}">${member.role}</span>
      </div>
      <button type="button" class="btn btn-danger" onclick="removeTeamMember('${member.email}')" style="padding: var(--md-spacing-xs) var(--md-spacing-sm); font-size: var(--md-font-size-small);">
        <span class="material-icons">delete</span>
      </button>
    </div>
  `).join('');

  teamMembersList.innerHTML = membersHtml;
}

// Update smart folders list
function updateSmartFoldersList() {
  const smartFoldersList = document.getElementById('smart-folders-list');
  if (!smartFoldersList) return;

  if (currentSmartFolders.length === 0) {
    smartFoldersList.innerHTML = '<div class="help-text">No smart folders created yet</div>';
    return;
  }

  const foldersHtml = currentSmartFolders.map(folder => `
    <div class="smart-folder-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--md-spacing-sm); border: 1px solid var(--md-outline); border-radius: var(--md-radius-sm); margin-bottom: var(--md-spacing-sm);">
      <div>
        <strong>${folder.name}</strong>
        <span class="help-text">${folder.bookmarkCount || 0} bookmarks</span>
      </div>
      <button type="button" class="btn btn-secondary" onclick="editSmartFolder('${folder.id}')" style="padding: var(--md-spacing-xs) var(--md-spacing-sm); font-size: var(--md-font-size-small);">
        <span class="material-icons">edit</span>
      </button>
    </div>
  `).join('');

  smartFoldersList.innerHTML = foldersHtml;
}

// Update public collections list
function updatePublicCollectionsList() {
  const collectionsList = document.getElementById('public-collections-list');
  if (!collectionsList) return;

  if (currentPublicCollections.length === 0) {
    collectionsList.innerHTML = '<div class="help-text">No public collections created yet</div>';
    return;
  }

  const collectionsHtml = currentPublicCollections.map(collection => `
    <div class="collection-item" style="display: flex; justify-content: space-between; align-items: center; padding: var(--md-spacing-sm); border: 1px solid var(--md-outline); border-radius: var(--md-radius-sm); margin-bottom: var(--md-spacing-sm);">
      <div>
        <strong>${collection.name}</strong>
        <span class="status-badge ${collection.visibility === 'public' ? 'enabled' : 'disabled'}">${collection.visibility}</span>
        <span class="help-text">${collection.bookmarkCount || 0} bookmarks</span>
      </div>
      <button type="button" class="btn btn-secondary" onclick="editPublicCollection('${collection.id}')" style="padding: var(--md-spacing-xs) var(--md-spacing-sm); font-size: var(--md-font-size-small);">
        <span class="material-icons">edit</span>
      </button>
    </div>
  `).join('');

  collectionsList.innerHTML = collectionsHtml;
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

  // Smart folder management
  const createSmartFolderBtn = document.getElementById('create-smart-folder-btn');
  if (createSmartFolderBtn) {
    createSmartFolderBtn.addEventListener('click', handleCreateSmartFolder);
  }

  // Public collection management
  const createCollectionBtn = document.getElementById('create-collection-btn');
  if (createCollectionBtn) {
    createCollectionBtn.addEventListener('click', handleCreatePublicCollection);
  }

  // Conflict resolution
  const resolveConflictsBtn = document.getElementById('resolve-conflicts-btn');
  if (resolveConflictsBtn) {
    resolveConflictsBtn.addEventListener('click', handleResolveConflicts);
  }

  // Passphrase strength indicator
  const passphraseInput = document.getElementById('encryption-passphrase');
  if (passphraseInput) {
    passphraseInput.addEventListener('input', handlePassphraseInput);
  }

  // Confirm passphrase
  const confirmPassphraseInput = document.getElementById('confirm-passphrase');
  if (confirmPassphraseInput) {
    confirmPassphraseInput.addEventListener('input', handleConfirmPassphraseInput);
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
    showToast('Failed to save settings: ' + error.message, 'error');
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
async function handleViewAnalytics() {
  try {
    const dashboard = await getTeamDashboard();
    showToast('Analytics dashboard loaded successfully!', 'success');
    
    // Open analytics page
    window.open('../analytics/analytics.html', '_blank');
  } catch (error) {
    console.error('Failed to load analytics:', error);
    showToast('Failed to load analytics: ' + error.message, 'error');
  }
}

// Handle export logs
async function handleExportLogs() {
  try {
    const analytics = await exportTeamAnalytics({ format: 'csv' });
    
    // Create and download file
    const blob = new Blob([analytics], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookdrive-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Analytics exported successfully!', 'success');
  } catch (error) {
    console.error('Failed to export logs:', error);
    showToast('Failed to export logs: ' + error.message, 'error');
  }
}

// Handle clear logs
async function handleClearLogs() {
  if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
    try {
      // Clear logs from storage
      await chrome.storage.local.remove([
        'bookDriveSyncLogs',
        'bookDriveErrorLogs',
        'bookDrivePerformanceLogs'
      ]);
      
      showToast('Logs cleared successfully!', 'success');
    } catch (error) {
      console.error('Failed to clear logs:', error);
      showToast('Failed to clear logs: ' + error.message, 'error');
    }
  }
}

// Handle enable encryption
async function handleEnableEncryption() {
  const passphrase = document.getElementById('encryption-passphrase').value;
  const confirmPassphrase = document.getElementById('confirm-passphrase').value;
  const algorithm = document.getElementById('encryption-algorithm').value;

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

  try {
    // Test encryption
    const testData = 'test';
    const encrypted = await encryptionManager.encrypt(testData, passphrase, { algorithm });
    const decrypted = await encryptionManager.decrypt(encrypted, passphrase);
    
    if (decrypted === testData) {
      // Save encryption settings
      await chrome.storage.sync.set({
        [STORAGE_KEYS.ENCRYPTION]: true,
        [STORAGE_KEYS.ENCRYPTION_PASSPHRASE]: passphrase,
        [STORAGE_KEYS.ENCRYPTION_ALGORITHM]: algorithm
      });
      
      showToast('Encryption enabled successfully!', 'success');
      updateEncryptionStatus(true);
    } else {
      showToast('Encryption test failed', 'error');
    }
  } catch (error) {
    console.error('Failed to enable encryption:', error);
    showToast('Failed to enable encryption: ' + error.message, 'error');
  }
}

// Handle change passphrase
async function handleChangePassphrase() {
  const currentPassphrase = prompt('Enter current passphrase:');
  if (!currentPassphrase) return;

  const newPassphrase = prompt('Enter new passphrase:');
  if (!newPassphrase || newPassphrase.length < 8) {
    showToast('New passphrase must be at least 8 characters long', 'error');
    return;
  }

  const confirmPassphrase = prompt('Confirm new passphrase:');
  if (newPassphrase !== confirmPassphrase) {
    showToast('Passphrases do not match', 'error');
    return;
  }

  try {
    // Test current passphrase
    const testData = 'test';
    const encrypted = await encryptionManager.encrypt(testData, currentPassphrase);
    const decrypted = await encryptionManager.decrypt(encrypted, currentPassphrase);
    
    if (decrypted === testData) {
      // Test new passphrase
      const newEncrypted = await encryptionManager.encrypt(testData, newPassphrase);
      const newDecrypted = await encryptionManager.decrypt(newEncrypted, newPassphrase);
      
      if (newDecrypted === testData) {
        await chrome.storage.sync.set({
          [STORAGE_KEYS.ENCRYPTION_PASSPHRASE]: newPassphrase
        });
        
        showToast('Passphrase changed successfully!', 'success');
      } else {
        showToast('New passphrase test failed', 'error');
      }
    } else {
      showToast('Current passphrase is incorrect', 'error');
    }
  } catch (error) {
    console.error('Failed to change passphrase:', error);
    showToast('Failed to change passphrase: ' + error.message, 'error');
  }
}

// Handle disable encryption
async function handleDisableEncryption() {
  const passphrase = prompt('Enter current passphrase to disable encryption:');
  if (!passphrase) return;

  try {
    // Test passphrase
    const testData = 'test';
    const encrypted = await encryptionManager.encrypt(testData, passphrase);
    const decrypted = await encryptionManager.decrypt(encrypted, passphrase);
    
    if (decrypted === testData) {
      await chrome.storage.sync.set({
        [STORAGE_KEYS.ENCRYPTION]: false,
        [STORAGE_KEYS.ENCRYPTION_PASSPHRASE]: ''
      });
      
      showToast('Encryption disabled successfully!', 'success');
      updateEncryptionStatus(false);
    } else {
      showToast('Passphrase is incorrect', 'error');
    }
  } catch (error) {
    console.error('Failed to disable encryption:', error);
    showToast('Failed to disable encryption: ' + error.message, 'error');
  }
}

// Handle add team member
async function handleAddTeamMember() {
  const email = document.getElementById('new-member-email').value;
  const role = document.getElementById('new-member-role').value;

  if (!email || !isValidEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  try {
    await addTeamMember(email, role);
    await loadTeamData(); // Reload team data
    document.getElementById('new-member-email').value = '';
    showToast(`Team member ${email} added successfully!`, 'success');
  } catch (error) {
    console.error('Failed to add team member:', error);
    showToast('Failed to add team member: ' + error.message, 'error');
  }
}

// Handle create smart folder
async function handleCreateSmartFolder() {
  const name = document.getElementById('smart-folder-name').value;
  const rules = document.getElementById('smart-folder-rules').value;

  if (!name) {
    showToast('Please enter a folder name', 'error');
    return;
  }

  try {
    const parsedRules = JSON.parse(rules);
    await createAdvancedSmartFolder(name, parsedRules);
    await loadSmartFolders(); // Reload smart folders
    document.getElementById('smart-folder-name').value = '';
    document.getElementById('smart-folder-rules').value = '';
    showToast(`Smart folder "${name}" created successfully!`, 'success');
  } catch (error) {
    console.error('Failed to create smart folder:', error);
    showToast('Failed to create smart folder: ' + error.message, 'error');
  }
}

// Handle create public collection
async function handleCreatePublicCollection() {
  const name = document.getElementById('collection-name').value;
  const description = document.getElementById('collection-description').value;
  const visibility = document.getElementById('collection-visibility').value;

  if (!name) {
    showToast('Please enter a collection name', 'error');
    return;
  }

  try {
    const collectionData = {
      name,
      description,
      visibility,
      tags: [],
      category: 'general'
    };
    
    await createPublicCollection(collectionData);
    await loadPublicCollections(); // Reload collections
    document.getElementById('collection-name').value = '';
    document.getElementById('collection-description').value = '';
    showToast(`Public collection "${name}" created successfully!`, 'success');
  } catch (error) {
    console.error('Failed to create public collection:', error);
    showToast('Failed to create public collection: ' + error.message, 'error');
  }
}

// Handle resolve conflicts
async function handleResolveConflicts() {
  try {
    // Get conflicts from storage or API
    const conflicts = []; // This would be populated with actual conflicts
    
    if (conflicts.length === 0) {
      showToast('No conflicts found to resolve', 'info');
      return;
    }

    const strategy = document.getElementById('conflict-strategy').value;
    const resolved = await resolveConflictsAdvanced(conflicts, strategy);
    
    showToast(`Resolved ${resolved.length} conflicts successfully!`, 'success');
  } catch (error) {
    console.error('Failed to resolve conflicts:', error);
    showToast('Failed to resolve conflicts: ' + error.message, 'error');
  }
}

// Handle passphrase input
function handlePassphraseInput(event) {
  const passphrase = event.target.value;
  const strengthIndicator = document.getElementById('passphrase-strength');
  const confirmSection = document.getElementById('confirm-passphrase-section');
  
  if (passphrase.length > 0) {
    const strength = calculatePassphraseStrength(passphrase);
    updatePassphraseStrengthIndicator(strength);
    confirmSection.style.display = 'block';
  } else {
    strengthIndicator.style.display = 'none';
    confirmSection.style.display = 'none';
  }
}

// Handle confirm passphrase input
function handleConfirmPassphraseInput(event) {
  const passphrase = document.getElementById('encryption-passphrase').value;
  const confirmPassphrase = event.target.value;
  
  if (confirmPassphrase.length > 0) {
    if (passphrase === confirmPassphrase) {
      event.target.classList.remove('validation-error');
      event.target.classList.add('validation-success');
    } else {
      event.target.classList.remove('validation-success');
      event.target.classList.add('validation-error');
    }
  } else {
    event.target.classList.remove('validation-error', 'validation-success');
  }
}

// Calculate passphrase strength
function calculatePassphraseStrength(passphrase) {
  let score = 0;
  
  if (passphrase.length >= 8) score += 1;
  if (passphrase.length >= 12) score += 1;
  if (/[a-z]/.test(passphrase)) score += 1;
  if (/[A-Z]/.test(passphrase)) score += 1;
  if (/[0-9]/.test(passphrase)) score += 1;
  if (/[^A-Za-z0-9]/.test(passphrase)) score += 1;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  if (score <= 5) return 'strong';
  return 'very-strong';
}

// Update passphrase strength indicator
function updatePassphraseStrengthIndicator(strength) {
  const strengthIndicator = document.getElementById('passphrase-strength');
  if (!strengthIndicator) return;
  
  const strengthText = {
    'weak': 'Weak',
    'medium': 'Medium',
    'strong': 'Strong',
    'very-strong': 'Very Strong'
  };
  
  const strengthColor = {
    'weak': 'var(--md-error)',
    'medium': 'var(--md-secondary)',
    'strong': 'var(--md-tertiary)',
    'very-strong': 'var(--md-primary)'
  };
  
  strengthIndicator.innerHTML = `
    <div style="display: flex; align-items: center; gap: var(--md-spacing-sm); margin-top: var(--md-spacing-xs);">
      <span style="color: ${strengthColor[strength]}; font-weight: 500;">${strengthText[strength]}</span>
      <div style="display: flex; gap: 2px;">
        ${[1, 2, 3, 4, 5].map(i => `
          <div style="width: 20px; height: 4px; background: ${i <= (strength === 'weak' ? 1 : strength === 'medium' ? 2 : strength === 'strong' ? 4 : 5) ? strengthColor[strength] : 'var(--md-outline)'}; border-radius: 2px;"></div>
        `).join('')}
      </div>
    </div>
  `;
  strengthIndicator.style.display = 'block';
}

// Update encryption status
function updateEncryptionStatus(enabled) {
  const statusBadge = document.getElementById('encryption-status');
  if (!statusBadge) return;
  
  if (enabled) {
    statusBadge.className = 'status-badge enabled';
    statusBadge.innerHTML = '<span class="material-icons">lock</span> Encryption Enabled';
  } else {
    statusBadge.className = 'status-badge disabled';
    statusBadge.innerHTML = '<span class="material-icons">lock_open</span> Encryption Disabled';
  }
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
    [STORAGE_KEYS.ENCRYPTION_ALGORITHM]: document.getElementById('encryption-algorithm')?.value || ENCRYPTION_ALGORITHMS.AES_GCM,
    [STORAGE_KEYS.SYNC_ANALYTICS]: document.getElementById('sync-analytics-toggle')?.checked || false,
    [STORAGE_KEYS.VERBOSE_LOGS]: document.getElementById('verbose-logs-toggle')?.checked || false,
    [STORAGE_KEYS.PERF_LOGS]: document.getElementById('perf-logs-toggle')?.checked || false,
    [STORAGE_KEYS.CONFLICT_STRATEGY]: document.getElementById('conflict-strategy')?.value || CONFLICT_STRATEGIES.INTELLIGENT_MERGE,
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

// Global functions for HTML onclick handlers
window.removeTeamMember = async function(email) {
  try {
    await removeTeamMember(email);
    await loadTeamData();
    showToast(`Team member ${email} removed successfully!`, 'success');
  } catch (error) {
    console.error('Failed to remove team member:', error);
    showToast('Failed to remove team member: ' + error.message, 'error');
  }
};

window.editSmartFolder = function(folderId) {
  showToast('Smart folder editor coming soon!', 'info');
};

window.editPublicCollection = function(collectionId) {
  showToast('Public collection editor coming soon!', 'info');
};
