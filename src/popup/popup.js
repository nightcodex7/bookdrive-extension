/**
 * BookDrive Extension Popup
 * Modern Material Design 3 UI with proper Google OAuth2 flow
 */

// Import lib modules
import { getAuthToken, signOut, ensureBookDriveFolder } from '../lib/auth/drive-auth.js';
import { getBookmarks, syncBookmarks } from '../lib/bookmarks.js';
import { createBackup, getBackupHistory } from '../lib/backup/index.js';

// Constants
const FOLDER_NAME = 'BookDrive';
const STORAGE_KEYS = {
  USER_INFO: 'bookDriveUserInfo',
  SYNC_MODE: 'bookDriveSyncMode',
  AUTO_SYNC: 'bookDriveAutoSync',
  THEME: 'bookDriveTheme',
  NOTIFICATIONS: 'bookDriveNotifications',
  LAST_SYNC: 'bookDriveLastSync',
  SYNC_COUNT: 'bookDriveSyncCount',
  BACKUP_COUNT: 'bookDriveBackupCount'
};

// Global state
let currentUser = null;
let syncMode = 'host-to-many';
let autoSync = false;
let theme = 'auto';
let notifications = true;

// DOM Elements
let syncNowBtn, syncStatus, bookmarkCountEl, syncCountEl, backupCountEl;
let activityList, userInfoContainer;

/**
 * Initialize the popup
 */
async function initializePopup() {
  console.log('Initializing BookDrive popup...');
  
  // Check if user is authenticated
  const isAuthenticated = await checkAuthentication();
  
  if (!isAuthenticated) {
    showOnboarding();
    return;
  }
  
  // Load user data and settings
  await loadUserData();
  await loadSettings();
  
  // Show main popup
  showMainPopup();
  
  // Setup event listeners
  setupEventListeners();
  
  // Load initial data
  await loadInitialData();
  
  console.log('Popup initialized successfully');
}

/**
 * Check if user is authenticated
 */
async function checkAuthentication() {
  try {
    // Try to get auth token
    const token = await getAuthToken(false);
    return !!token;
  } catch (error) {
    console.log('User not authenticated:', error.message);
    return false;
  }
}

/**
 * Show onboarding screen
 */
function showOnboarding() {
  document.getElementById('onboarding').style.display = 'block';
  document.getElementById('welcome-setup').style.display = 'none';
  document.getElementById('popup-root').style.display = 'none';
  
  // Setup onboarding event listeners
  setupOnboardingListeners();
}

/**
 * Show welcome setup screen
 */
function showWelcomeSetup() {
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('welcome-setup').style.display = 'block';
  document.getElementById('popup-root').style.display = 'none';
  
  // Setup welcome event listeners
  setupWelcomeListeners();
}

/**
 * Show main popup
 */
function showMainPopup() {
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('welcome-setup').style.display = 'none';
  document.getElementById('popup-root').style.display = 'flex';
}

/**
 * Setup onboarding event listeners
 */
function setupOnboardingListeners() {
  const signInBtn = document.getElementById('onboarding-signin-btn');
  const setupOAuthBtn = document.getElementById('setup-oauth-btn');
  
  if (signInBtn) {
    signInBtn.addEventListener('click', handleGoogleSignIn);
  }
  
  if (setupOAuthBtn) {
    setupOAuthBtn.addEventListener('click', showOAuthSetupInstructions);
  }
}

/**
 * Setup welcome screen event listeners
 */
function setupWelcomeListeners() {
  const quickSetupBtn = document.getElementById('quick-setup-btn');
  const customSetupBtn = document.getElementById('custom-setup-btn');
  
  if (quickSetupBtn) {
    quickSetupBtn.addEventListener('click', handleQuickSetup);
  }
  
  if (customSetupBtn) {
    customSetupBtn.addEventListener('click', handleCustomSetup);
  }
}

/**
 * Handle Google Sign-in
 */
async function handleGoogleSignIn() {
  const signInBtn = document.getElementById('onboarding-signin-btn');
  
  try {
    // Update button state
    signInBtn.disabled = true;
    signInBtn.innerHTML = `
      <span class="material-icons" style="animation: spin 1s linear infinite;">sync</span>
      <span>Signing in...</span>
    `;
    
    // Get auth token (this will trigger Google OAuth flow)
    const token = await getAuthToken(true);
    
    if (token) {
      // Get user info from token
      const userInfo = await getUserInfoFromToken(token);
      
      // Store user info
      await chrome.storage.local.set({
        [STORAGE_KEYS.USER_INFO]: userInfo
      });
      
      currentUser = userInfo;
      
      // Show success message
      showToast('Successfully signed in!', 'success');
      
      // Show welcome setup
      setTimeout(() => {
        showWelcomeSetup();
      }, 1000);
      
    } else {
      throw new Error('Failed to get authentication token');
    }
    
  } catch (error) {
    console.error('Sign-in failed:', error);
    
    if (error.message.includes('OAuth2')) {
      showToast('OAuth2 not configured. Please run setup first.', 'error');
      showOAuthSetupInstructions();
    } else {
      showToast('Sign-in failed: ' + error.message, 'error');
    }
    
    // Reset button
    signInBtn.disabled = false;
    signInBtn.innerHTML = `
      <svg class="google-icon" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span>Sign in with Google</span>
    `;
  }
}

/**
 * Get user info from Google ID token
 */
async function getUserInfoFromToken(token) {
  try {
    // Decode the ID token to get user info
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const data = await response.json();
    
    return {
      id: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
      emailVerified: data.email_verified
    };
  } catch (error) {
    console.error('Failed to get user info:', error);
    // Fallback to basic info
    return {
      id: 'unknown',
      email: 'user@example.com',
      name: 'User',
      picture: null,
      emailVerified: false
    };
  }
}

/**
 * Show OAuth2 setup instructions
 */
function showOAuthSetupInstructions() {
  const instructions = `
    <div style="text-align: left; padding: 1rem;">
      <h3>OAuth2 Setup Required</h3>
      <p>To use BookDrive, you need to set up Google OAuth2 credentials:</p>
      <ol>
        <li>Run the setup script: <code>npm run setup:oauth2</code></li>
        <li>Follow the interactive prompts</li>
        <li>Create a Google Cloud project</li>
        <li>Enable Google Drive API</li>
        <li>Create OAuth2 credentials</li>
        <li>Update the extension with your client ID</li>
      </ol>
      <p><strong>Note:</strong> This is a one-time setup required for security.</p>
    </div>
  `;
  
  showModal('OAuth2 Setup Instructions', instructions);
}

/**
 * Handle quick setup
 */
async function handleQuickSetup() {
  try {
    // Set default settings
    await chrome.storage.local.set({
      [STORAGE_KEYS.SYNC_MODE]: 'host-to-many',
      [STORAGE_KEYS.AUTO_SYNC]: true,
      [STORAGE_KEYS.THEME]: 'auto',
      [STORAGE_KEYS.NOTIFICATIONS]: true
    });
    
    // Ensure BookDrive folder exists
    await ensureBookDriveFolder();
    
    showToast('Quick setup completed!', 'success');
    
    // Show main popup
    setTimeout(() => {
      showMainPopup();
    }, 1000);
    
  } catch (error) {
    console.error('Quick setup failed:', error);
    showToast('Setup failed: ' + error.message, 'error');
  }
}

/**
 * Handle custom setup
 */
function handleCustomSetup() {
  // Switch to settings tab in main popup
  showMainPopup();
  switchTab('settings');
}

/**
 * Setup main popup event listeners
 */
function setupEventListeners() {
  // Navigation tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
  
  // Sync button
  const syncBtn = document.getElementById('sync-now-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', handleSync);
  }
  
  // Quick backup button
  const backupBtn = document.getElementById('quick-backup-btn');
  if (backupBtn) {
    backupBtn.addEventListener('click', handleQuickBackup);
  }
  
  // Sync tab button
  const syncTabBtn = document.getElementById('sync-tab-btn');
  if (syncTabBtn) {
    syncTabBtn.addEventListener('click', handleSync);
  }
  
  // Create backup button
  const createBackupBtn = document.getElementById('create-backup-btn');
  if (createBackupBtn) {
    createBackupBtn.addEventListener('click', handleCreateBackup);
  }
  
  // View backups button
  const viewBackupsBtn = document.getElementById('view-backups-btn');
  if (viewBackupsBtn) {
    viewBackupsBtn.addEventListener('click', handleViewBackups);
  }
  
  // Sign out button
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }
  
  // Settings controls
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.addEventListener('change', handleThemeChange);
  }
  
  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    notificationsToggle.addEventListener('change', handleNotificationsChange);
  }
  
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  if (autoSyncToggle) {
    autoSyncToggle.addEventListener('change', handleAutoSyncChange);
  }
  
  // Header buttons
  const headerSettingsBtn = document.getElementById('header-settings-btn');
  if (headerSettingsBtn) {
    headerSettingsBtn.addEventListener('click', () => switchTab('settings'));
  }
  
  const headerMenuBtn = document.getElementById('header-menu-btn');
  if (headerMenuBtn) {
    headerMenuBtn.addEventListener('click', showHeaderMenu);
  }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-tab') === tabName) {
      tab.classList.add('active');
    }
  });
  
  // Update tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(content => {
    content.classList.remove('active');
    if (content.id === `${tabName}-tab`) {
      content.classList.add('active');
    }
  });
}

/**
 * Load user data from storage
 */
async function loadUserData() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.USER_INFO]);
    currentUser = result[STORAGE_KEYS.USER_INFO] || null;
    
    if (currentUser) {
      updateUserDisplay();
    }
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.SYNC_MODE,
      STORAGE_KEYS.AUTO_SYNC,
      STORAGE_KEYS.THEME,
      STORAGE_KEYS.NOTIFICATIONS
    ]);
    
    syncMode = result[STORAGE_KEYS.SYNC_MODE] || 'host-to-many';
    autoSync = result[STORAGE_KEYS.AUTO_SYNC] || false;
    theme = result[STORAGE_KEYS.THEME] || 'auto';
    notifications = result[STORAGE_KEYS.NOTIFICATIONS] !== false;
    
    updateSettingsDisplay();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

/**
 * Load initial data
 */
async function loadInitialData() {
  try {
    // Load bookmark count
    const bookmarks = await getBookmarks();
    updateBookmarkCount(bookmarks.length);
    
    // Load sync count
    const result = await chrome.storage.local.get([STORAGE_KEYS.SYNC_COUNT]);
    const syncCount = result[STORAGE_KEYS.SYNC_COUNT] || 0;
    updateSyncCount(syncCount);
    
    // Load backup count
    const backupHistory = await getBackupHistory();
    updateBackupCount(backupHistory.length);
    
    // Load recent activity
    loadRecentActivity();
    
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
}

/**
 * Update user display
 */
function updateUserDisplay() {
  if (!currentUser) return;
  
  const userNameEl = document.getElementById('user-name');
  const userEmailEl = document.getElementById('user-email');
  
  if (userNameEl) {
    userNameEl.textContent = currentUser.name || 'User';
  }
  
  if (userEmailEl) {
    userEmailEl.textContent = currentUser.email || 'user@example.com';
  }
}

/**
 * Update settings display
 */
function updateSettingsDisplay() {
  const themeSelect = document.getElementById('theme-select');
  const notificationsToggle = document.getElementById('notifications-toggle');
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  
  if (themeSelect) {
    themeSelect.value = theme;
  }
  
  if (notificationsToggle) {
    notificationsToggle.checked = notifications;
  }
  
  if (autoSyncToggle) {
    autoSyncToggle.checked = autoSync;
  }
  
  // Apply theme
  applyTheme(theme);
}

/**
 * Update bookmark count
 */
function updateBookmarkCount(count) {
  const bookmarkCountEl = document.getElementById('bookmark-count');
  if (bookmarkCountEl) {
    bookmarkCountEl.textContent = count.toLocaleString();
  }
}

/**
 * Update sync count
 */
function updateSyncCount(count) {
  const syncCountEl = document.getElementById('sync-count');
  if (syncCountEl) {
    syncCountEl.textContent = count.toLocaleString();
  }
}

/**
 * Update backup count
 */
function updateBackupCount(count) {
  const backupCountEl = document.getElementById('backup-count');
  if (backupCountEl) {
    backupCountEl.textContent = count.toLocaleString();
  }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  try {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    // Get last sync time
    const result = await chrome.storage.local.get([STORAGE_KEYS.LAST_SYNC]);
    const lastSync = result[STORAGE_KEYS.LAST_SYNC];
    
    if (lastSync) {
      const timeAgo = getTimeAgo(new Date(lastSync));
      activityList.innerHTML = `
        <div class="activity-item">
          <span class="material-icons activity-icon">sync</span>
          <div class="activity-content">
            <div class="activity-title">Last sync completed</div>
            <div class="activity-time">${timeAgo}</div>
          </div>
        </div>
      `;
    } else {
      activityList.innerHTML = `
        <div class="activity-item">
          <span class="material-icons activity-icon">info</span>
          <div class="activity-content">
            <div class="activity-title">No recent activity</div>
            <div class="activity-time">Start by syncing your bookmarks</div>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load recent activity:', error);
  }
}

/**
 * Handle sync
 */
async function handleSync() {
  const syncBtn = document.querySelector('#sync-now-btn, #sync-tab-btn');
  
  try {
    // Update button state
    if (syncBtn) {
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<span class="material-icons" style="animation: spin 1s linear infinite;">sync</span> Syncing...';
    }
    
    // Update status
    updateSyncStatus('Syncing...');
    
    // Ensure authenticated
    await getAuthToken(true);
    
    // Ensure folder exists
    await ensureBookDriveFolder();
    
    // Perform sync
    const result = await syncBookmarks();
    
    // Update sync count
    const currentCount = await chrome.storage.local.get([STORAGE_KEYS.SYNC_COUNT]);
    const newCount = (currentCount[STORAGE_KEYS.SYNC_COUNT] || 0) + 1;
    await chrome.storage.local.set({
      [STORAGE_KEYS.SYNC_COUNT]: newCount,
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString()
    });
    
    // Update displays
    updateSyncCount(newCount);
    loadRecentActivity();
    updateSyncStatus('Last sync: ' + getTimeAgo(new Date()));
    
    showToast(`Sync completed! ${result.added || 0} added, ${result.updated || 0} updated`, 'success');
    
  } catch (error) {
    console.error('Sync failed:', error);
    updateSyncStatus('Sync failed');
    showToast('Sync failed: ' + error.message, 'error');
  } finally {
    // Reset button
    if (syncBtn) {
      syncBtn.disabled = false;
      syncBtn.innerHTML = '<span class="material-icons">sync</span> Sync Now';
    }
  }
}

/**
 * Handle quick backup
 */
async function handleQuickBackup() {
  try {
    const backupBtn = document.getElementById('quick-backup-btn');
    if (backupBtn) {
      backupBtn.disabled = true;
      backupBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Creating...';
    }
    
    const result = await createBackup('Quick backup');
    
    // Update backup count
    const backupHistory = await getBackupHistory();
    updateBackupCount(backupHistory.length);
    
    showToast('Backup created successfully!', 'success');
    
  } catch (error) {
    console.error('Backup failed:', error);
    showToast('Backup failed: ' + error.message, 'error');
  } finally {
    const backupBtn = document.getElementById('quick-backup-btn');
    if (backupBtn) {
      backupBtn.disabled = false;
      backupBtn.innerHTML = '<span class="material-icons">backup</span> Quick Backup';
    }
  }
}

/**
 * Handle create backup
 */
async function handleCreateBackup() {
  try {
    const result = await createBackup('Manual backup');
    showToast('Backup created successfully!', 'success');
  } catch (error) {
    console.error('Backup failed:', error);
    showToast('Backup failed: ' + error.message, 'error');
  }
}

/**
 * Handle view backups
 */
function handleViewBackups() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('backup-history/backup-history.html')
  });
}

/**
 * Handle sign out
 */
async function handleSignOut() {
  try {
    await signOut();
    
    // Clear stored data
    await chrome.storage.local.clear();
    
    showToast('Signed out successfully', 'success');
    
    // Show onboarding
    setTimeout(() => {
      showOnboarding();
    }, 1000);
    
  } catch (error) {
    console.error('Sign out failed:', error);
    showToast('Sign out failed: ' + error.message, 'error');
  }
}

/**
 * Handle theme change
 */
async function handleThemeChange(event) {
  const newTheme = event.target.value;
  theme = newTheme;
  
  await chrome.storage.local.set({ [STORAGE_KEYS.THEME]: newTheme });
  applyTheme(newTheme);
  
  showToast('Theme updated', 'info');
}

/**
 * Handle notifications change
 */
async function handleNotificationsChange(event) {
  notifications = event.target.checked;
  await chrome.storage.local.set({ [STORAGE_KEYS.NOTIFICATIONS]: notifications });
  showToast('Notifications ' + (notifications ? 'enabled' : 'disabled'), 'info');
}

/**
 * Handle auto sync change
 */
async function handleAutoSyncChange(event) {
  autoSync = event.target.checked;
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_SYNC]: autoSync });
  showToast('Auto sync ' + (autoSync ? 'enabled' : 'disabled'), 'info');
}

/**
 * Apply theme
 */
function applyTheme(themeName) {
  const root = document.documentElement;
  
  if (themeName === 'dark' || (themeName === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }
}

/**
 * Update sync status
 */
function updateSyncStatus(status) {
  const statusText = document.querySelector('.status-text');
  if (statusText) {
    statusText.textContent = status;
  }
}

/**
 * Show header menu
 */
function showHeaderMenu() {
  // Simple menu for now - could be expanded
  showToast('Menu coming soon!', 'info');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 3000);
}

/**
 * Show modal
 */
function showModal(title, content) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>${title}</h2>
      <div class="modal-body">${content}</div>
      <div class="modal-actions">
        <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Close</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

/**
 * Get time ago string
 */
function getTimeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Add CSS for spinning animation
 */
function addSpinningAnimation() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  addSpinningAnimation();
  initializePopup();
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Reload data if relevant keys changed
    const relevantKeys = Object.values(STORAGE_KEYS);
    const hasRelevantChanges = Object.keys(changes).some(key => relevantKeys.includes(key));
    
    if (hasRelevantChanges) {
      loadInitialData();
    }
  }
});
