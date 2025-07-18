// BookDrive popup.js - UI logic for the extension popup
console.log('BookDrive popup loaded');

import {
  getAuthToken,
  isAuthenticated,
  signOut,
  ensureBookDriveFolder,
  listFiles,
  uploadBookmarksFile,
  downloadBookmarksFile,
} from '../lib/index.js';

// Constants
const FOLDER_NAME = 'MyExtensionData';

// Show toast notification
function showToast(message, type = '') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  toastContainer.style.display = '';
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// Global references for sync status
let syncNowBtn = null;
let syncStatus = null;

// Initialize the popup
async function initializePopup() {
  try {
    // Check if user is signed in
    const isUserSignedIn = await isAuthenticated();

    if (!isUserSignedIn) {
      // Show onboarding screen
      document.getElementById('popup-root').style.display = 'none';
      document.getElementById('onboarding').style.display = 'block';

      // Set up sign-in button
      const signInBtn = document.getElementById('onboarding-signin-btn');
      if (signInBtn) {
        signInBtn.addEventListener('click', async () => {
          signInBtn.disabled = true;
          signInBtn.textContent = 'Signing in...';

          try {
            // Get auth token (will prompt user)
            await getAuthToken(true);

            // Create folder if needed
            await ensureBookDriveFolder();

            // Show welcome screen
            document.getElementById('onboarding').style.display = 'none';
            document.getElementById('welcome-setup').style.display = 'block';

            // Set up go to settings button
            const goToSettingsBtn = document.getElementById('go-to-settings-btn');
            if (goToSettingsBtn) {
              goToSettingsBtn.addEventListener('click', () => {
                document.getElementById('welcome-setup').style.display = 'none';
                document.getElementById('popup-root').style.display = 'block';

                // Switch to settings tab
                const settingsTab = document.querySelector('.tab[data-tab="settings"]');
                if (settingsTab) settingsTab.click();
              });
            }
          } catch (error) {
            signInBtn.disabled = false;
            signInBtn.textContent = 'Sign in with Google';
            showToast('Authentication failed: ' + error.message, 'error');
          }
        });
      }
    } else {
      // User is already signed in, ensure folder exists
      try {
        await ensureBookDriveFolder(false);
      } catch (error) {
        console.log('Silent folder check failed, will create on user action:', error.message);
      }

      // Show main popup
      document.getElementById('popup-root').style.display = 'block';

      // Display folder info
      displayFolderInfo();
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    showToast('Error initializing: ' + error.message, 'error');
  }
}

// Update the last sync status display
function updateLastSyncStatus() {
  if (!syncStatus) return;
  chrome.storage.local.get(['lastSync', 'lastSyncStatus'], (data) => {
    if (data.lastSync) {
      syncStatus.textContent = `${new Date(data.lastSync).toLocaleString()} (${data.lastSyncStatus || 'unknown'})`;
    } else {
      syncStatus.textContent = 'Never';
    }
  });
}

// Apply theme based on settings or system preference
function applyTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// Setup theme handling
function setupThemeHandling() {
  // Load and apply theme
  chrome.storage.sync.get({ theme: 'auto' }, ({ theme }) => {
    applyTheme(theme);
  });

  // Theme select event listener
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    chrome.storage.sync.get({ theme: 'auto' }, ({ theme }) => {
      themeSelect.value = theme;
    });

    themeSelect.addEventListener('change', () => {
      const newTheme = themeSelect.value;
      chrome.storage.sync.set({ theme: newTheme }, () => {
        applyTheme(newTheme);
      });
    });
  }

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    chrome.storage.sync.get({ theme: 'auto' }, ({ theme }) => {
      if (theme === 'auto') applyTheme(theme);
    });
  });
}

// Setup tab navigation
function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });

      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');

      panels.forEach((panel) => panel.classList.add('hidden'));
      const panelId = tab.dataset.tab ? tab.dataset.tab + '-panel' : '';
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('hidden');
    });

    // Keyboard navigation for tabs
    tab.addEventListener('keydown', (e) => {
      const tabsArray = Array.from(tabs);
      const currentIndex = tabsArray.indexOf(tab);

      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        let newIndex = currentIndex + (e.key === 'ArrowRight' ? 1 : -1);
        if (newIndex >= tabsArray.length) newIndex = 0;
        if (newIndex < 0) newIndex = tabsArray.length - 1;

        tabsArray[newIndex].click();
        tabsArray[newIndex].focus();
      }
    });
  });
}

// Display folder information
function displayFolderInfo() {
  const folderInfoEl = document.getElementById('folder-info');
  if (!folderInfoEl) return;

  chrome.storage.local.get(['bookDriveFolderId'], async (result) => {
    if (result.bookDriveFolderId) {
      folderInfoEl.textContent = `${FOLDER_NAME} (ID: ${result.bookDriveFolderId.substring(0, 8)}...)`;
      folderInfoEl.classList.remove('hidden');

      // Add a link to open the folder in Google Drive
      const folderContainer = document.getElementById('folder-info-container');
      if (folderContainer) {
        // Check if we already added the link
        if (!document.getElementById('open-drive-folder')) {
          const openFolderLink = document.createElement('div');
          openFolderLink.className = 'status-row';
          openFolderLink.innerHTML = `
            <button id="open-drive-folder" class="btn btn-text btn-sm">
              <span class="material-icons">open_in_new</span> Open in Drive
            </button>
          `;
          folderContainer.appendChild(openFolderLink);

          // Add click handler
          document.getElementById('open-drive-folder').addEventListener('click', () => {
            const url = `https://drive.google.com/drive/folders/${result.bookDriveFolderId}`;
            chrome.tabs.create({ url });
          });
        }
      }
    } else {
      folderInfoEl.textContent = `${FOLDER_NAME} folder will be created on first sync`;
      folderInfoEl.classList.remove('hidden');
    }
  });
}

// Setup sync functionality
function setupSyncHandling() {
  syncNowBtn = document.getElementById('sync-now-btn');
  syncStatus = document.getElementById('sync-status');

  // Display folder info when popup opens
  displayFolderInfo();

  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', async () => {
      syncNowBtn.disabled = true;
      syncNowBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Syncing...';

      if (syncStatus) syncStatus.textContent = 'Syncing...';

      try {
        // Ensure we're authenticated
        await getAuthToken(true);

        // Ensure folder exists
        const folderId = await ensureBookDriveFolder();
        showToast(`Using ${FOLDER_NAME} folder: ${folderId.substring(0, 8)}...`, 'info');

        // Update folder info display
        displayFolderInfo();

        // Perform sync
        chrome.runtime.sendMessage({ action: 'syncNow' }, (response) => {
          syncNowBtn.disabled = false;
          syncNowBtn.innerHTML = '<span class="material-icons">sync</span> Sync Now';

          if (response && response.status === 'ok') {
            if (syncStatus) syncStatus.textContent = 'Sync complete';
            updateLastSyncStatus();
            showToast('Sync complete!', 'success');

            // Update stats
            if (typeof setupHomeStats === 'function') {
              setupHomeStats();
            }
          } else {
            if (syncStatus) syncStatus.textContent = 'Sync failed';
            const errorMsg = response?.error || 'Unknown error';
            showToast('Sync failed: ' + errorMsg, 'error');
          }
        });
      } catch (error) {
        syncNowBtn.disabled = false;
        syncNowBtn.innerHTML = '<span class="material-icons">sync</span> Sync Now';
        showToast('Authentication failed: ' + error.message, 'error');
      }
    });
  }

  // Listen for network status updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'networkStatus') {
      if (!message.online && syncStatus) {
        syncStatus.textContent = 'No internet. Sync paused and will resume once connected.';
      } else {
        updateLastSyncStatus();
      }
    }
  });
}

// Setup settings handling
function setupSettingsHandling() {
  // Mode select
  const modeSelect = document.getElementById('mode-select');
  if (modeSelect) {
    chrome.storage.sync.get({ mode: 'host' }, (data) => {
      modeSelect.value = data.mode;
    });

    modeSelect.addEventListener('change', () => {
      const newMode = modeSelect.value;
      chrome.storage.sync.set({ mode: newMode }, () => {
        const syncModeEl = document.getElementById('sync-mode');
        if (syncModeEl)
          syncModeEl.textContent = newMode === 'host' ? 'Host-to-Many' : 'Global Sync';
      });
    });
  }

  // Auto sync toggle and interval
  const autoSyncToggle = document.getElementById('auto-sync-toggle');
  const syncIntervalInput = document.getElementById('sync-interval');

  chrome.storage.sync.get({ autoSync: true, syncInterval: 30 }, (data) => {
    if (autoSyncToggle) autoSyncToggle.checked = data.autoSync;
    if (syncIntervalInput) syncIntervalInput.value = String(data.syncInterval);

    // Update interval value display
    const intervalValue = document.getElementById('interval-value');
    if (intervalValue) intervalValue.textContent = String(data.syncInterval);
  });

  if (autoSyncToggle) {
    autoSyncToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ autoSync: autoSyncToggle.checked });
    });
  }

  // Sync interval slider
  if (syncIntervalInput) {
    const intervalValue = document.getElementById('interval-value');

    syncIntervalInput.addEventListener('input', () => {
      if (intervalValue) intervalValue.textContent = syncIntervalInput.value;
    });

    syncIntervalInput.addEventListener('change', () => {
      chrome.storage.sync.set({ syncInterval: parseInt(syncIntervalInput.value, 10) });
    });
  }

  // Team Mode
  const teamModeToggle = document.getElementById('team-mode-toggle');
  const userEmailInput = document.getElementById('user-email');

  chrome.storage.sync.get({ teamMode: false, userEmail: '' }, (data) => {
    if (teamModeToggle) teamModeToggle.checked = data.teamMode;
    if (userEmailInput) userEmailInput.value = data.userEmail || '';
  });

  if (teamModeToggle) {
    teamModeToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ teamMode: teamModeToggle.checked });
      showToast('Team Mode ' + (teamModeToggle.checked ? 'enabled' : 'disabled'), 'info');
    });
  }

  if (userEmailInput) {
    userEmailInput.addEventListener('input', () => {
      chrome.storage.sync.set({ userEmail: userEmailInput.value });
    });
  }

  // Notifications toggle
  const notificationsToggle = document.getElementById('notifications-toggle');
  if (notificationsToggle) {
    chrome.storage.sync.get({ notifications: true }, (data) => {
      if (notificationsToggle) notificationsToggle.checked = data.notifications;
    });

    notificationsToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ notifications: notificationsToggle.checked });
    });
  }
}

// Setup advanced features
function setupAdvancedFeatures() {
  // Verbose logs toggle
  const verboseLogsToggle = document.getElementById('verbose-logs-toggle');
  if (verboseLogsToggle) {
    chrome.storage.sync.get({ verboseLogs: false }, (data) => {
      verboseLogsToggle.checked = data.verboseLogs;
    });

    verboseLogsToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ verboseLogs: verboseLogsToggle.checked });
      showToast('Verbose logs ' + (verboseLogsToggle.checked ? 'enabled' : 'disabled'), 'info');
    });
  }

  // Drive cleanup
  const driveCleanupBtn = document.getElementById('drive-cleanup-btn');
  if (driveCleanupBtn) {
    driveCleanupBtn.addEventListener('click', async () => {
      driveCleanupBtn.disabled = true;

      try {
        // Ensure we're authenticated
        await getAuthToken(true);

        // List files
        const files = await listFiles();
        showToast(`Found ${files.length} files in BookDrive folder`, 'info');

        // Show file list
        showFileListModal(files);
      } catch (error) {
        showToast('Failed to list files: ' + error.message, 'error');
      } finally {
        driveCleanupBtn.disabled = false;
      }
    });
  }

  // Manual backup
  const manualBackupBtn = document.getElementById('manual-backup-btn');
  if (manualBackupBtn) {
    manualBackupBtn.addEventListener('click', async () => {
      manualBackupBtn.disabled = true;

      try {
        // Ensure we're authenticated
        await getAuthToken(true);

        // Create backup
        chrome.runtime.sendMessage({ action: 'manualBackup' }, (response) => {
          manualBackupBtn.disabled = false;
          if (response?.status === 'ok') {
            showToast('Manual backup complete!', 'success');
          } else {
            showToast('Manual backup failed: ' + (response?.error || 'Unknown error'), 'error');
          }
        });
      } catch (error) {
        manualBackupBtn.disabled = false;
        showToast('Authentication failed: ' + error.message, 'error');
      }
    });
  }

  // Backup history
  const backupHistoryBtn = document.getElementById('backup-history-btn');
  if (backupHistoryBtn) {
    backupHistoryBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'backup-history/backup-history.html' });
    });
  }

  // Preview sync
  const previewSyncBtn = document.getElementById('preview-sync-btn');
  if (previewSyncBtn) {
    previewSyncBtn.addEventListener('click', async () => {
      previewSyncBtn.disabled = true;

      try {
        // Ensure we're authenticated
        await getAuthToken(true);

        // Preview sync
        chrome.runtime.sendMessage({ action: 'simulateSyncPreview' }, (response) => {
          previewSyncBtn.disabled = false;
          if (response?.diff) {
            showPreviewModal(JSON.stringify(response.diff, null, 2));
          } else {
            showToast('No changes to preview', 'info');
          }
        });
      } catch (error) {
        previewSyncBtn.disabled = false;
        showToast('Authentication failed: ' + error.message, 'error');
      }
    });
  }

  // Settings export/import
  setupSettingsExportImport();

  // Encryption setup button
  const encryptionSetupBtn = document.getElementById('encryption-setup-btn');
  if (encryptionSetupBtn) {
    encryptionSetupBtn.addEventListener('click', () => {
      const encryptionModal = document.getElementById('encryption-modal');
      if (encryptionModal) encryptionModal.style.display = 'flex';
    });
  }
  
  // Encryption modal handlers
  const enableEncryptionBtn = document.getElementById('enable-encryption-btn');
  const cancelEncryptionBtn = document.getElementById('cancel-encryption-btn');
  const encryptionPassphrase = document.getElementById('encryption-passphrase');
  const encryptionModal = document.getElementById('encryption-modal');
  
  if (cancelEncryptionBtn && encryptionModal) {
    cancelEncryptionBtn.addEventListener('click', () => {
      encryptionModal.style.display = 'none';
      if (encryptionPassphrase) encryptionPassphrase.value = '';
    });
  }
  
  if (enableEncryptionBtn && encryptionPassphrase && encryptionModal) {
    enableEncryptionBtn.addEventListener('click', async () => {
      const passphrase = encryptionPassphrase.value;
      
      // Import encryption module
      const { validatePassphrase } = await import('../lib/encryption.js');
      
      // Validate passphrase
      const validation = validatePassphrase(passphrase);
      if (!validation.isValid) {
        showToast(validation.errors.join('. '), 'error');
        return;
      }
      
      // Save encryption config
      chrome.storage.sync.set({
        encryptionEnabled: true,
        encryptionConfig: {
          enabled: true,
          timestamp: Date.now(),
          algorithm: 'aes-gcm'
        }
      }, () => {
        // Store passphrase in session storage (will be cleared when browser closes)
        // This is more secure than storing in chrome.storage
        sessionStorage.setItem('encryptionPassphrase', passphrase);
        
        // Close modal and show success message
        encryptionModal.style.display = 'none';
        encryptionPassphrase.value = '';
        showToast('Encryption enabled successfully!', 'success');
        
        // Notify background script to re-encrypt data
        chrome.runtime.sendMessage({ 
          action: 'encryptionEnabled',
          passphrase: passphrase
        });
      });
    });
  }
  
  // Check encryption status on load
  chrome.storage.sync.get({ encryptionEnabled: false }, (data) => {
    if (data.encryptionEnabled && encryptionSetupBtn) {
      encryptionSetupBtn.textContent = 'Manage Encryption';
    }
  });
}

// Show file list modal
function showFileListModal(files) {
  // Create modal if it doesn't exist
  let fileListModal = document.getElementById('file-list-modal');
  if (!fileListModal) {
    fileListModal = document.createElement('div');
    fileListModal.id = 'file-list-modal';
    fileListModal.className = 'modal-overlay';
    fileListModal.innerHTML = `
      <div class="modal-content">
        <h2>BookDrive Files</h2>
        <div class="file-list" id="drive-file-list"></div>
        <div class="modal-actions">
          <button id="close-file-list-btn" class="btn btn-text">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(fileListModal);

    // Add close button handler
    const closeBtn = document.getElementById('close-file-list-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (fileListModal) fileListModal.style.display = 'none';
      });
    }
  }

  // Update content and show modal
  const fileListDiv = document.getElementById('drive-file-list');
  if (fileListDiv) {
    if (files.length === 0) {
      fileListDiv.innerHTML = '<p>No files found in BookDrive folder.</p>';
    } else {
      fileListDiv.innerHTML = `
        <table class="file-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Modified</th>
              <th>Size</th>
            </tr>
          </thead>
          <tbody>
            ${files
              .map(
                (file) => `
              <tr>
                <td>${file.name}</td>
                <td>${file.mimeType.split('/').pop()}</td>
                <td>${new Date(file.modifiedTime).toLocaleString()}</td>
                <td>${formatFileSize(file.size || 0)}</td>
              </tr>
            `,
              )
              .join('')}
          </tbody>
        </table>
      `;
    }
  }

  fileListModal.style.display = 'flex';
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function setupSettingsExportImport() {
  const exportBtn = document.getElementById('export-settings-btn');
  const importBtn = document.getElementById('import-settings-btn');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportBtn.disabled = true;
      chrome.storage.sync.get(null, (data) => {
        exportBtn.disabled = false;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookdrive-settings.json';
        a.click();
        showToast('Settings exported!', 'success');
      });
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            if (typeof data !== 'object' || !data) throw new Error('Invalid format');

            chrome.storage.sync.set(data, () => {
              showToast('Settings imported! Reloading...', 'success');
              setTimeout(() => location.reload(), 1200);
            });
          } catch (err) {
            showToast('Import failed: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }
}

// Show preview modal for sync changes
function showPreviewModal(content) {
  // Create modal if it doesn't exist
  let previewModal = document.getElementById('preview-modal');
  if (!previewModal) {
    previewModal = document.createElement('div');
    previewModal.id = 'preview-modal';
    previewModal.className = 'modal-overlay';
    previewModal.innerHTML = `
      <div class="modal-content">
        <h2>Sync Preview</h2>
        <div class="preview-content" id="preview-content"></div>
        <div class="modal-actions">
          <button id="close-preview-btn" class="btn btn-text">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(previewModal);

    // Add close button handler
    const closeBtn = document.getElementById('close-preview-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (previewModal) previewModal.style.display = 'none';
      });
    }
  }

  // Update content and show modal
  const previewContentDiv = document.getElementById('preview-content');
  if (previewContentDiv) {
    previewContentDiv.innerHTML = `<pre>${content}</pre>`;
  }

  previewModal.style.display = 'flex';
}

// Listen for toast messages from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'showToast') {
    showToast(message.message, message.type);
  }
});

// Setup sign-out functionality
function setupSignOut() {
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      try {
        signOutBtn.disabled = true;
        signOutBtn.innerHTML = '<span class="material-icons">hourglass_top</span> Signing out...';

        // Sign out using the drive.js function
        await signOut();

        // Clear folder ID from storage
        chrome.storage.local.remove(['bookDriveFolderId'], () => {
          // Show success message
          showToast('Signed out successfully', 'success');

          // Redirect to onboarding screen
          document.getElementById('popup-root').style.display = 'none';
          document.getElementById('onboarding').style.display = 'block';

          // Reset sign-out button
          signOutBtn.disabled = false;
          signOutBtn.innerHTML = '<span class="material-icons">logout</span> Sign Out';
        });
      } catch (error) {
        signOutBtn.disabled = false;
        signOutBtn.innerHTML = '<span class="material-icons">logout</span> Sign Out';
        showToast('Sign out failed: ' + error.message, 'error');
      }
    });
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize popup
  initializePopup();

  // Setup UI components
  setupThemeHandling();
  setupTabNavigation();
  setupSyncHandling();
  setupSettingsHandling();
  setupAdvancedFeatures();
  setupSignOut();

  // Update sync status
  updateLastSyncStatus();

  // Set device ID
  const deviceIdEl = document.getElementById('device-id');
  if (deviceIdEl) {
    chrome.storage.local.get(['deviceId'], (data) => {
      if (data.deviceId) {
        deviceIdEl.textContent = data.deviceId;
      } else {
        // Generate a device ID if not exists
        const newId = 'device_' + Math.random().toString(36).substring(2, 10);
        chrome.storage.local.set({ deviceId: newId });
        deviceIdEl.textContent = newId;
      }
    });
  }

  // Set sync mode
  const syncModeEl = document.getElementById('sync-mode');
  if (syncModeEl) {
    chrome.storage.sync.get({ mode: 'host' }, (data) => {
      syncModeEl.textContent = data.mode === 'host' ? 'Host-to-Many' : 'Global Sync';
    });
  }

  // Set bookmark count
  const bookmarkCountEl = document.getElementById('bookmark-count');
  if (bookmarkCountEl) {
    chrome.bookmarks.getTree((tree) => {
      let count = 0;

      function countBookmarks(nodes) {
        for (const node of nodes) {
          if (node.url) count++;
          if (node.children) countBookmarks(node.children);
        }
      }

      countBookmarks(tree);
      bookmarkCountEl.textContent = count.toString();
    });
  }
});
