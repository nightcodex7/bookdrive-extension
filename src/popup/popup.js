/**
 * BookDrive Extension Popup
 * Simplified and Robust UI with Enhanced Error Handling
 */

// Import lib modules
import {
  signIn,
  signOut,
  // isAuthenticated, // Removed unused import
  getStoredUserInfo,
  ensureBookDriveFolder,
  getBrowserCompatibility,
} from '../lib/auth/drive-auth.js';

// Import real sync service
// import { performRealSync, createRealBackup, SYNC_MODES } from '../lib/sync/sync-service.js'; // Removed unused imports
// Import feature management
import { featureManager, isFeatureEnabled } from '../config/features.js';

// Constants
const STORAGE_KEYS = {
  SYNC_MODE: 'bookDriveSyncMode',
  AUTO_SYNC: 'bookDriveAutoSync',
  THEME: 'bookDriveTheme',
  NOTIFICATIONS: 'bookDriveNotifications',
  LAST_SYNC: 'bookDriveLastSync',
  SYNC_COUNT: 'bookDriveSyncCount',
  BACKUP_COUNT: 'bookDriveBackupCount',
  LAST_COUNT_RESET: 'bookDriveLastCountReset',
};

// Global state
let currentUser = null;
let autoSync = false;
let theme = 'auto';
let notifications = true;

/**
 * Initialize the popup
 */
async function initializePopup() {
  try {
    // Initialize feature manager
    await featureManager.initialize();

    // Apply initial theme
    await applyInitialTheme();

    // Load initial data
    await loadInitialData();

    // Set up event listeners
    setupEventListeners();

    // Apply feature states to UI
    applyFeatureStates();

    // Show main popup
    showMainPopup();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showError('Failed to initialize popup. Please try again.');
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

// Removed unused function refreshCounts

/**
 * Show onboarding screen
 */
function showOnboarding() {
  document.getElementById('onboarding').style.display = 'block';
  document.getElementById('welcome-setup').style.display = 'none';
  document.getElementById('popup-root').style.display = 'none';

  // Check browser compatibility and update UI
  updateBrowserCompatibility();

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
  if (signInBtn) {
    signInBtn.addEventListener('click', handleGoogleSignIn);
  }
}

/**
 * Update browser compatibility information
 */
function updateBrowserCompatibility() {
  const browserInfo = getBrowserCompatibility();
  const browserInfoEl = document.getElementById('browser-info');

  if (browserInfoEl) {
    const compatibilityClass = browserInfo.chromeIdentitySupported ? 'supported' : 'unsupported';
    const icon = browserInfo.chromeIdentitySupported ? 'check_circle' : 'info';

    browserInfoEl.innerHTML = `
      <div class="browser-compatibility ${compatibilityClass}">
        <span class="material-icons">${icon}</span>
        <span>${browserInfo.message}</span>
      </div>
    `;
  }
}

/**
 * Setup welcome event listeners
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
 * Handle Google Sign-In
 */
async function handleGoogleSignIn() {
  try {
    // Start Google Sign-In process
    const userInfo = await signIn();

    // Set up BookDrive folder
    try {
      await ensureBookDriveFolder(true);
    } catch (folderError) {
      // Log folder setup warning but don't fail the sign-in
      console.warn('Folder setup failed:', folderError);
    }

    // Show welcome setup screen
    showWelcomeSetup();
  } catch (error) {
    console.error('Sign-In failed:', error);
    showError('Sign-In failed. Please try again.');
  }
}

/**
 * Handle quick setup
 */
async function handleQuickSetup() {
  try {
    // Perform quick setup
    await featureManager.performQuickSetup();

    // Show main popup
    showMainPopup();
  } catch (error) {
    console.error('Quick setup failed:', error);
    showError('Quick setup failed. Please try again.');
  }
}

/**
 * Handle custom setup
 */
function handleCustomSetup() {
  // For now, just show the main popup
  // In the future, this could open a detailed setup wizard
  showMainPopup();
}

/**
 * Handle theme toggle
 */
async function handleThemeToggle() {
  try {
    // Get current theme
    const result = await chrome.storage.local.get([STORAGE_KEYS.THEME]);
    const currentTheme = result[STORAGE_KEYS.THEME] || 'auto';

    // Cycle through themes: auto -> light -> dark -> auto
    let newTheme;
    if (currentTheme === 'auto') {
      newTheme = 'light';
    } else if (currentTheme === 'light') {
      newTheme = 'dark';
    } else {
      newTheme = 'auto';
    }

    // Save and apply new theme
    await chrome.storage.local.set({ [STORAGE_KEYS.THEME]: newTheme });
    applyTheme(newTheme);

    // Show feedback
    const themeNames = { auto: 'Auto', light: 'Light', dark: 'Dark' };
    showToast(`Theme changed to ${themeNames[newTheme]}`, 'success');
  } catch (error) {
    console.error('Failed to toggle theme:', error);
    showToast('Failed to change theme', 'error');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Onboarding listeners
  setupOnboardingListeners();

  // Welcome setup listeners
  setupWelcomeListeners();

  // Main popup listeners
  const syncNowBtn = document.getElementById('sync-now-btn');
  const quickBackupBtn = document.getElementById('quick-backup-btn');
  const syncTabBtn = document.getElementById('sync-tab-btn');
  const createBackupBtn = document.getElementById('create-backup-btn');
  const viewBackupsBtn = document.getElementById('view-backups-btn');
  const headerMenuBtn = document.getElementById('header-menu-btn');
  const autoSyncToggle = document.getElementById('auto-sync-toggle');

  // Navigation tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // Sync buttons
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', handleSync);
  }
  if (syncTabBtn) {
    syncTabBtn.addEventListener('click', handleSync);
  }

  // Backup buttons
  if (quickBackupBtn) {
    quickBackupBtn.addEventListener('click', handleQuickBackup);
  }
  if (createBackupBtn) {
    createBackupBtn.addEventListener('click', handleCreateBackup);
  }
  if (viewBackupsBtn) {
    viewBackupsBtn.addEventListener('click', handleViewBackups);
  }

  // Header menu
  if (headerMenuBtn) {
    headerMenuBtn.addEventListener('click', toggleDropdownMenu);
  }

  // Dropdown menu items
  const menuSettings = document.getElementById('menu-settings');
  const menuThemeToggle = document.getElementById('menu-theme-toggle');
  const menuAccount = document.getElementById('menu-account');
  const menuSignOut = document.getElementById('menu-sign-out');

  if (menuSettings) {
    menuSettings.addEventListener('click', handleOpenOptions);
  }
  if (menuThemeToggle) {
    menuThemeToggle.addEventListener('click', handleThemeToggle);
  }
  if (menuAccount) {
    menuAccount.addEventListener('click', showAccountInfo);
  }
  if (menuSignOut) {
    menuSignOut.addEventListener('click', handleSignOut);
  }

  // Settings toggles
  if (autoSyncToggle) {
    autoSyncToggle.addEventListener('change', handleAutoSyncChange);
  }

  // Organize tab listeners
  const manageTagsBtn = document.getElementById('manage-tags-btn');
  const bulkEditBtn = document.getElementById('bulk-edit-btn');
  const createSmartFolderBtn = document.getElementById('create-smart-folder-btn');
  const advancedSearchBtn = document.getElementById('advanced-search-btn');
  const advancedSearchInput = document.getElementById('advanced-search-input');

  if (manageTagsBtn) {
    manageTagsBtn.addEventListener('click', handleManageTags);
  }
  if (bulkEditBtn) {
    bulkEditBtn.addEventListener('click', handleBulkEdit);
  }
  if (createSmartFolderBtn) {
    createSmartFolderBtn.addEventListener('click', handleCreateSmartFolder);
  }
  if (advancedSearchBtn) {
    advancedSearchBtn.addEventListener('click', handleAdvancedSearch);
  }
  if (advancedSearchInput) {
    advancedSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleAdvancedSearch();
      }
    });
  }

  // Tools tab listeners
  const importBtn = document.getElementById('import-btn');
  const exportBtn = document.getElementById('export-btn');
  const readLaterBtn = document.getElementById('read-later-btn');
  const annotationsBtn = document.getElementById('annotations-btn');
  const publicCollectionsBtn = document.getElementById('public-collections-btn');
  const shareLinkBtn = document.getElementById('share-link-btn');
  const viewAnalyticsBtn = document.getElementById('view-analytics-btn');
  const teamDashboardBtn = document.getElementById('team-dashboard-btn');

  if (importBtn) {
    importBtn.addEventListener('click', handleImportBookmarks);
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', handleExportBookmarks);
  }
  if (readLaterBtn) {
    readLaterBtn.addEventListener('click', handleReadLater);
  }
  if (annotationsBtn) {
    annotationsBtn.addEventListener('click', handleAnnotations);
  }
  if (publicCollectionsBtn) {
    publicCollectionsBtn.addEventListener('click', handlePublicCollections);
  }
  if (shareLinkBtn) {
    shareLinkBtn.addEventListener('click', handleShareLink);
  }
  if (viewAnalyticsBtn) {
    viewAnalyticsBtn.addEventListener('click', handleViewAnalytics);
  }
  if (teamDashboardBtn) {
    teamDashboardBtn.addEventListener('click', handleTeamDashboard);
  }

  // Close dropdown when clicking outside
  document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('dropdown-menu');
    const headerMenuBtn = document.getElementById('header-menu-btn');

    if (dropdown && !dropdown.contains(event.target) && !headerMenuBtn.contains(event.target)) {
      hideDropdownMenu();
    }
  });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
  // Update tab buttons
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach((tab) => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-tab') === tabName) {
      tab.classList.add('active');
    }
  });

  // Update tab content
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach((content) => {
    content.classList.remove('active');
  });

  const activeTab = document.getElementById(`${tabName}-tab`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
}

/**
 * Load user data
 */
// Removed unused function loadUserData

/**
 * Load settings
 */
// Removed unused function loadSettings

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
 * Update sync count display
 */
function updateSyncCount(count) {
  const syncCountElement = document.getElementById('sync-count');
  if (syncCountElement) {
    syncCountElement.textContent = count.toLocaleString();
  }
}

/**
 * Update backup count display
 */
function updateBackupCount(count) {
  const backupCountElement = document.getElementById('backup-count');
  if (backupCountElement) {
    backupCountElement.textContent = count.toLocaleString();
  }
}

/**
 * Check and reset daily counts if needed
 */
async function checkDailyCountReset() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.LAST_COUNT_RESET]);
    const lastReset = result[STORAGE_KEYS.LAST_COUNT_RESET];
    const today = new Date().toDateString();

    if (lastReset !== today) {
      // Reset daily counts
      await chrome.storage.local.set({
        [STORAGE_KEYS.SYNC_COUNT]: 0,
        [STORAGE_KEYS.BACKUP_COUNT]: 0,
        [STORAGE_KEYS.LAST_COUNT_RESET]: today,
      });

      // Update UI
      updateSyncCount(0);
      updateBackupCount(0);
    }
  } catch (error) {
    console.error('Failed to check daily count reset:', error);
  }
}

/**
 * Load initial data
 */
async function loadInitialData() {
  try {
    // Check for daily count reset first
    await checkDailyCountReset();

    // Load bookmark count
    const bookmarks = await chrome.bookmarks.getTree();
    const bookmarkCount = countBookmarks(bookmarks);
    updateBookmarkCount(bookmarkCount);

    // Load sync and backup counts with proper initialization
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.SYNC_COUNT,
      STORAGE_KEYS.BACKUP_COUNT,
      STORAGE_KEYS.LAST_SYNC,
    ]);

    // Initialize counts if they don't exist
    const syncCount = result[STORAGE_KEYS.SYNC_COUNT] || 0;
    const backupCount = result[STORAGE_KEYS.BACKUP_COUNT] || 0;

    // Ensure counts are stored (in case they were missing)
    await chrome.storage.local.set({
      [STORAGE_KEYS.SYNC_COUNT]: syncCount,
      [STORAGE_KEYS.BACKUP_COUNT]: backupCount,
    });

    updateSyncCount(syncCount);
    updateBackupCount(backupCount);

    // Load recent activity
    await loadRecentActivity();

    console.log('Initial data loaded:', { syncCount, backupCount, bookmarkCount });
  } catch (error) {
    console.error('Failed to load initial data:', error);
  }
}

/**
 * Count bookmarks recursively
 */
function countBookmarks(bookmarkItems) {
  let count = 0;
  for (const item of bookmarkItems) {
    if (item.url) {
      count++;
    } else if (item.children) {
      count += countBookmarks(item.children);
    }
  }
  return count;
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  try {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    // For now, show a simple activity item
    activityList.innerHTML = `
      <div class="activity-item">
        <span class="material-icons activity-icon">check_circle</span>
        <div class="activity-content">
          <div class="activity-title">Extension loaded successfully</div>
          <div class="activity-time">Just now</div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to load recent activity:', error);
  }
}

/**
 * Handle sync action
 */
async function handleSync() {
  try {
    // Send message to background script to start sync
    const response = await chrome.runtime.sendMessage({
      action: 'syncNow',
    });

    if (response && response.status === 'ok') {
      showToast('Sync started successfully', 'success');

      // Update sync count
      const result = await chrome.storage.local.get([STORAGE_KEYS.SYNC_COUNT]);
      const currentCount = result[STORAGE_KEYS.SYNC_COUNT] || 0;
      const newCount = currentCount + 1;
      await chrome.storage.local.set({ [STORAGE_KEYS.SYNC_COUNT]: newCount });
      updateSyncCount(newCount);
    } else {
      showToast(response?.error || 'Sync failed', 'error');
    }
  } catch (error) {
    console.error('Sync failed:', error);
    showToast('Sync failed. Please try again.', 'error');
  }
}

/**
 * Handle quick backup action
 */
async function handleQuickBackup() {
  try {
    // Send message to background script to start quick backup
    const response = await chrome.runtime.sendMessage({
      action: 'manualBackup',
    });

    if (response && response.status === 'ok') {
      showToast('Quick backup started successfully', 'success');

      // Update backup count
      const result = await chrome.storage.local.get([STORAGE_KEYS.BACKUP_COUNT]);
      const currentCount = result[STORAGE_KEYS.BACKUP_COUNT] || 0;
      const newCount = currentCount + 1;
      await chrome.storage.local.set({ [STORAGE_KEYS.BACKUP_COUNT]: newCount });
      updateBackupCount(newCount);
    } else {
      showToast(response?.error || 'Quick backup failed', 'error');
    }
  } catch (error) {
    console.error('Quick backup failed:', error);
    showToast('Quick backup failed. Please try again.', 'error');
  }
}

/**
 * Handle create backup action
 */
async function handleCreateBackup() {
  try {
    // Send message to background script to start backup
    const response = await chrome.runtime.sendMessage({
      action: 'manualBackup',
    });

    if (response && response.status === 'ok') {
      showToast('Backup started successfully', 'success');

      // Update backup count
      const result = await chrome.storage.local.get([STORAGE_KEYS.BACKUP_COUNT]);
      const currentCount = result[STORAGE_KEYS.BACKUP_COUNT] || 0;
      const newCount = currentCount + 1;
      await chrome.storage.local.set({ [STORAGE_KEYS.BACKUP_COUNT]: newCount });
      updateBackupCount(newCount);
    } else {
      showToast(response?.error || 'Backup failed', 'error');
    }
  } catch (error) {
    console.error('Backup failed:', error);
    showToast('Backup failed. Please try again.', 'error');
  }
}

/**
 * Handle view backups functionality
 */
function handleViewBackups() {
  chrome.tabs.create({ url: chrome.runtime.getURL('backup-history/backup-history.html') });
}

/**
 * Handle open options functionality
 */
function handleOpenOptions() {
  chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
}

/**
 * Handle view backup history functionality
 */
// Removed unused function handleViewBackupHistory

// Removed unused function handleResolveConflicts

/**
 * Handle shared folders
 */
// Removed unused function handleSharedFolders

/**
 * Organize tab handlers
 */

/**
 * Handle manage tags
 */
async function handleManageTags() {
  if (!isFeatureEnabled('bookmark_organization')) {
    showToast('Bookmark organization feature is not enabled', 'warning');
    return;
  }

  try {
    // Open tags management interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/options.html#tags'),
    });
  } catch (error) {
    console.error('Failed to open tags manager:', error);
    showToast('Failed to open tags manager', 'error');
  }
}

/**
 * Handle bulk edit
 */
async function handleBulkEdit() {
  if (!isFeatureEnabled('bookmark_organization')) {
    showToast('Bookmark organization feature is not enabled', 'warning');
    return;
  }

  try {
    // Open bulk edit interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/options.html#bulk-edit'),
    });
  } catch (error) {
    console.error('Failed to open bulk edit:', error);
    showToast('Failed to open bulk edit', 'error');
  }
}

/**
 * Handle create smart folder
 */
async function handleCreateSmartFolder() {
  if (!isFeatureEnabled('bookmark_organization')) {
    showToast('Bookmark organization feature is not enabled', 'warning');
    return;
  }

  try {
    // Open smart folder creation interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/options.html#smart-folders'),
    });
  } catch (error) {
    console.error('Failed to open smart folder creator:', error);
    showToast('Failed to open smart folder creator', 'error');
  }
}

/**
 * Handle advanced search
 */
async function handleAdvancedSearch() {
  if (!isFeatureEnabled('bookmark_organization')) {
    showToast('Bookmark organization feature is not enabled', 'warning');
    return;
  }

  const searchInput = document.getElementById('advanced-search-input');
  const query = searchInput?.value?.trim();

  if (!query) {
    showToast('Please enter a search query', 'warning');
    return;
  }

  try {
    // Open search results in new tab
    chrome.tabs.create({
      url: chrome.runtime.getURL(`src/options/options.html#search?q=${encodeURIComponent(query)}`),
    });
  } catch (error) {
    console.error('Failed to perform advanced search:', error);
    showToast('Failed to perform search', 'error');
  }
}

/**
 * Tools tab handlers
 */

/**
 * Handle import bookmarks
 */
async function handleImportBookmarks() {
  if (!isFeatureEnabled('import_export')) {
    showToast('Import/Export feature is not enabled', 'warning');
    return;
  }

  try {
    // Open import interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/options.html#import'),
    });
  } catch (error) {
    console.error('Failed to open import interface:', error);
    showToast('Failed to open import interface', 'error');
  }
}

/**
 * Handle export bookmarks
 */
async function handleExportBookmarks() {
  if (!isFeatureEnabled('import_export')) {
    showToast('Import/Export feature is not enabled', 'warning');
    return;
  }

  try {
    // Open export interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/options.html#export'),
    });
  } catch (error) {
    console.error('Failed to open export interface:', error);
    showToast('Failed to open export interface', 'error');
  }
}

/**
 * Handle read later
 */
async function handleReadLater() {
  if (!isFeatureEnabled('read_it_later')) {
    showToast('Read-It-Later feature is not enabled', 'warning');
    return;
  }

  try {
    // Open read later interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/read-later/read-later.html'),
    });
  } catch (error) {
    console.error('Failed to open read later interface:', error);
    showToast('Failed to open read later interface', 'error');
  }
}

/**
 * Handle annotations
 */
async function handleAnnotations() {
  if (!isFeatureEnabled('annotations')) {
    showToast('Annotations feature is not enabled', 'warning');
    return;
  }

  try {
    // Open annotations interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/annotations/annotations.html'),
    });
  } catch (error) {
    console.error('Failed to open annotations interface:', error);
    showToast('Failed to open annotations interface', 'error');
  }
}

/**
 * Handle public collections
 */
async function handlePublicCollections() {
  if (!isFeatureEnabled('public_collections')) {
    showToast('Public collections feature is not enabled', 'warning');
    return;
  }

  try {
    // Open public collections interface
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/options.html#public-collections'),
    });
  } catch (error) {
    console.error('Failed to open public collections:', error);
    showToast('Failed to open public collections', 'error');
  }
}

/**
 * Handle share link
 */
async function handleShareLink() {
  if (!isFeatureEnabled('public_collections')) {
    showToast('Sharing feature is not enabled', 'warning');
    return;
  }

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      // Create shareable link for current page
      const shareData = {
        title: tab.title,
        text: `Check out this page: ${tab.title}`,
        url: tab.url,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(tab.url);
        showToast('Link copied to clipboard', 'success');
      }
    }
  } catch (error) {
    console.error('Failed to share link:', error);
    showToast('Failed to share link', 'error');
  }
}

/**
 * Handle view analytics
 */
async function handleViewAnalytics() {
  if (!isFeatureEnabled('analytics')) {
    showToast('Analytics feature is not enabled', 'warning');
    return;
  }

  try {
    // Open analytics dashboard
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/analytics/analytics.html'),
    });
  } catch (error) {
    console.error('Failed to open analytics:', error);
    showToast('Failed to open analytics', 'error');
  }
}

/**
 * Handle team dashboard
 */
async function handleTeamDashboard() {
  if (!isFeatureEnabled('team_analytics')) {
    showToast('Team analytics feature is not enabled', 'warning');
    return;
  }

  try {
    // Open team dashboard
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/options/options.html#team-dashboard'),
    });
  } catch (error) {
    console.error('Failed to open team dashboard:', error);
    showToast('Failed to open team dashboard', 'error');
  }
}

/**
 * Handle sign out functionality
 */
async function handleSignOut() {
  try {
    await signOut();

    // Clear chrome.storage.local instead of localStorage
    await chrome.storage.local.clear();

    // Reset counts
    updateBookmarkCount(0);
    updateSyncCount(0);
    updateBackupCount(0);

    // Show onboarding again
    showOnboarding();

    showToast('Signed out successfully', 'success');

    console.log('Sign out completed');
  } catch (error) {
    console.error('Sign out failed:', error);
    showToast('Sign out failed. Please try again.', 'error');
  }
}

/**
 * Handle theme change
 */
async function handleThemeChange(event) {
  const theme = event.target.value;

  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.THEME]: theme });
    applyTheme(theme);
    showToast('Theme updated', 'success');
  } catch (error) {
    console.error('Failed to update theme:', error);
    showToast('Failed to update theme', 'error');
  }
}

/**
 * Handle notifications toggle
 */
// Removed unused function handleNotificationsChange

/**
 * Handle auto sync toggle
 */
async function handleAutoSyncChange(event) {
  const enabled = event.target.checked;

  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_SYNC]: enabled });
    showToast(`Auto sync ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    console.error('Failed to update auto sync:', error);
    showToast('Failed to update auto sync', 'error');
  }
}

/**
 * Apply theme to the popup
 */
function applyTheme(themeName) {
  const root = document.documentElement;

  // Remove existing theme attributes
  root.removeAttribute('data-theme');

  if (themeName === 'dark') {
    root.setAttribute('data-theme', 'dark');
  } else if (themeName === 'light') {
    root.setAttribute('data-theme', 'light');
  } else {
    // Auto theme - check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  }

  // Update theme toggle button if it exists
  updateThemeToggleButton(themeName);
}

/**
 * Update theme toggle button
 */
function updateThemeToggleButton(themeName) {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  if (themeToggleBtn) {
    const icon = themeToggleBtn.querySelector('.material-icons');
    if (icon) {
      if (themeName === 'dark') {
        icon.textContent = 'light_mode';
        themeToggleBtn.title = 'Switch to Light Mode';
      } else {
        icon.textContent = 'dark_mode';
        themeToggleBtn.title = 'Switch to Dark Mode';
      }
    }
  }
}

// Removed unused function updateSyncStatus

/**
 * Show header menu
 */
// Removed unused function showHeaderMenu

function toggleDropdownMenu() {
  const dropdownMenu = document.getElementById('dropdown-menu');
  if (dropdownMenu) {
    const isVisible = dropdownMenu.style.display !== 'none';
    if (isVisible) {
      hideDropdownMenu();
    } else {
      showDropdownMenu();
    }
  }
}

function showDropdownMenu() {
  const dropdownMenu = document.getElementById('dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.style.display = 'block';
    // Animate in
    requestAnimationFrame(() => {
      dropdownMenu.style.opacity = '1';
      dropdownMenu.style.transform = 'scale(1)';
    });
  }
}

function hideDropdownMenu() {
  const dropdownMenu = document.getElementById('dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.style.opacity = '0';
    dropdownMenu.style.transform = 'scale(0.95)';

    setTimeout(() => {
      dropdownMenu.style.display = 'none';
    }, 150); // Match transition duration
  }
}

function showAccountInfo() {
  // Show account information in a modal or toast
  if (currentUser) {
    showToast(`Signed in as: ${currentUser.email}`, 'info');
  } else {
    showToast('No user information available', 'info');
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
  showToast(message, 'error');
}

/**
 * Apply feature states to UI elements
 */
function applyFeatureStates() {
  // Apply feature states using the feature manager
  featureManager.applyFeatureStates();

  // Additional feature-specific UI updates
  updateFeatureSpecificUI();
}

/**
 * Update feature-specific UI elements
 */
function updateFeatureSpecificUI() {
  // Update conflict resolution button visibility
  const resolveConflictsBtn = document.getElementById('resolve-conflicts-btn');
  if (resolveConflictsBtn) {
    if (isFeatureEnabled('conflict_resolution')) {
      resolveConflictsBtn.style.display = '';
    } else {
      resolveConflictsBtn.style.display = 'none';
    }
  }

  // Update shared folders button visibility
  const sharedFoldersBtn = document.getElementById('shared-folders-btn');
  if (sharedFoldersBtn) {
    if (isFeatureEnabled('shared_folders')) {
      sharedFoldersBtn.style.display = '';
    } else {
      sharedFoldersBtn.style.display = 'none';
    }
  }

  // Update backup history button visibility
  const backupHistoryBtn = document.getElementById('view-backup-history-btn');
  if (backupHistoryBtn) {
    if (isFeatureEnabled('scheduled_backups')) {
      backupHistoryBtn.style.display = '';
    } else {
      backupHistoryBtn.style.display = 'none';
    }
  }

  // Update analytics button visibility
  const analyticsBtn = document.getElementById('view-analytics-btn');
  if (analyticsBtn) {
    if (isFeatureEnabled('analytics')) {
      analyticsBtn.style.display = '';
    } else {
      analyticsBtn.style.display = 'none';
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);
