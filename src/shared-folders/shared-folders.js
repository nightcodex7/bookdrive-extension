/**
 * shared-folders.js - Shared folders management for BookDrive
 *
 * This module provides the UI logic for managing shared bookmark folders
 * with team collaboration features.
 */

import {
  createSharedFolder,
  getSharedFolders,
  addBookmarksToSharedFolder,
  getPendingNotifications,
} from '../lib/team/shared-folders.js';

import { validatePassphrase } from '../lib/encryption.js';

// Global state
let sharedFolders = [];
let currentUserEmail = '';
let notifications = [];

/**
 * Initialize the shared folders page
 */
async function initializeSharedFolders() {
  try {
    console.log('Initializing shared folders page...');

    // Get current user email
    currentUserEmail = await getCurrentUserEmail();

    // Load shared folders
    await loadSharedFolders();

    // Load notifications
    await loadNotifications();

    // Setup event listeners
    setupEventListeners();

    console.log('Shared folders page initialized successfully');
  } catch (error) {
    console.error('Failed to initialize shared folders page:', error);
    showToast('Failed to initialize shared folders page', 'error');
  }
}

/**
 * Load shared folders from Google Drive
 */
async function loadSharedFolders() {
  try {
    showLoading(true);

    sharedFolders = await getSharedFolders({ includeBookmarks: true });

    updateFoldersGrid();
    updateImportFolderSelect();

    showLoading(false);
  } catch (error) {
    console.error('Failed to load shared folders:', error);
    showToast('Failed to load shared folders', 'error');
    showLoading(false);
  }
}

/**
 * Update the folders grid display
 */
function updateFoldersGrid() {
  const foldersGrid = document.getElementById('folders-grid');

  if (sharedFolders.length === 0) {
    foldersGrid.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">folder_open</span>
        <h3>No Shared Folders</h3>
        <p>Create your first shared folder to start collaborating with your team.</p>
        <button id="create-first-folder-btn" class="btn btn-primary">Create Folder</button>
      </div>
    `;

    // Add event listener for the create button
    const createFirstBtn = document.getElementById('create-first-folder-btn');
    if (createFirstBtn) {
      createFirstBtn.addEventListener('click', () => showCreateFolderModal());
    }
    return;
  }

  foldersGrid.innerHTML = sharedFolders.map((folder) => createFolderCard(folder)).join('');

  // Add click event listeners to folder cards
  document.querySelectorAll('.folder-card').forEach((card, index) => {
    card.addEventListener('click', () => showFolderDetails(sharedFolders[index]));
  });
}

/**
 * Create a folder card element
 */
function createFolderCard(folder) {
  const bookmarkCount = folder.bookmarks ? folder.bookmarks.length : 0;
  const memberCount = folder.members ? folder.members.length : 0;
  const permission = getFolderPermission(folder, currentUserEmail);

  return `
    <div class="folder-card" data-folder-id="${folder.id}">
      <div class="folder-header">
        <div>
          <div class="folder-icon">📁</div>
          <div class="folder-title">${escapeHtml(folder.name)}</div>
          <div class="folder-description">${escapeHtml(folder.description || 'No description')}</div>
        </div>
        <div class="folder-permission">${permission.toUpperCase()}</div>
      </div>
      
      <div class="folder-stats">
        <div class="folder-stat">
          <div class="folder-stat-value">${bookmarkCount}</div>
          <div class="folder-stat-label">Bookmarks</div>
        </div>
        <div class="folder-stat">
          <div class="folder-stat-value">${memberCount}</div>
          <div class="folder-stat-label">Members</div>
        </div>
        <div class="folder-stat">
          <div class="folder-stat-value">${formatDate(folder.createdAt)}</div>
          <div class="folder-stat-label">Created</div>
        </div>
      </div>
      
      ${folder.metadata.encrypted ? '<div class="folder-encrypted">🔒 Encrypted</div>' : ''}
    </div>
  `;
}

/**
 * Load notifications
 */
async function loadNotifications() {
  try {
    notifications = await getPendingNotifications();
    updateNotificationsPanel();
  } catch (error) {
    console.error('Failed to load notifications:', error);
  }
}

/**
 * Update notifications panel
 */
function updateNotificationsPanel() {
  const notificationList = document.getElementById('notification-list');

  if (notifications.length === 0) {
    notificationList.innerHTML = `
      <div class="empty-notifications">
        <span class="material-icons">notifications_none</span>
        <p>No new notifications</p>
      </div>
    `;
    return;
  }

  notificationList.innerHTML = notifications
    .map((notification) => createNotificationItem(notification))
    .join('');
}

/**
 * Create a notification item element
 */
function createNotificationItem(notification) {
  const icon = getNotificationIcon(notification.action);
  const title = getNotificationTitle(notification.action);
  const message = getNotificationMessage(notification);

  return `
    <div class="notification-item">
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <h4>${title}</h4>
        <p>${message}</p>
        <div class="notification-time">${formatRelativeTime(notification.timestamp)}</div>
      </div>
    </div>
  `;
}

/**
 * Get notification icon based on action
 */
function getNotificationIcon(action) {
  const icons = {
    created: '📁',
    updated: '✏️',
    permission_updated: '🔐',
    bookmarks_added: '➕',
    bookmarks_removed: '➖',
  };
  return icons[action] || '📢';
}

/**
 * Get notification title based on action
 */
function getNotificationTitle(action) {
  const titles = {
    created: 'Folder Created',
    updated: 'Folder Updated',
    permission_updated: 'Permission Updated',
    bookmarks_added: 'Bookmarks Added',
    bookmarks_removed: 'Bookmarks Removed',
  };
  return titles[action] || 'Notification';
}

/**
 * Get notification message
 */
function getNotificationMessage(notification) {
  const { action, details, folderName, from } = notification;

  switch (action) {
    case 'created':
      return `"${folderName}" was created by ${from}`;
    case 'updated':
      return `"${folderName}" was updated by ${from}`;
    case 'permission_updated':
      return `Permission for ${details.memberEmail} was updated to ${details.permission} by ${from}`;
    case 'bookmarks_added':
      return `${details.count} bookmarks were added to "${folderName}" by ${from}`;
    case 'bookmarks_removed':
      return `${details.count} bookmarks were removed from "${folderName}" by ${from}`;
    default:
      return `Action performed on "${folderName}" by ${from}`;
  }
}

/**
 * Show create folder modal
 */
function showCreateFolderModal() {
  const modal = document.getElementById('create-folder-modal');
  modal.classList.add('show');

  // Reset form
  document.getElementById('create-folder-form').reset();
  document.getElementById('members-list').innerHTML = '';
  document.getElementById('passphrase-group').style.display = 'none';
}

/**
 * Hide create folder modal
 */
function hideCreateFolderModal() {
  const modal = document.getElementById('create-folder-modal');
  modal.classList.remove('show');
}

/**
 * Show folder details modal
 */
function showFolderDetails(folder) {
  const modal = document.getElementById('folder-details-modal');

  // Populate folder info
  document.getElementById('folder-details-title').textContent = folder.name;
  document.getElementById('folder-details-name').textContent = folder.name;
  document.getElementById('folder-details-description').textContent =
    folder.description || 'No description';
  document.getElementById('folder-details-created').textContent = formatDate(folder.createdAt);
  document.getElementById('folder-details-bookmarks').textContent = folder.bookmarks
    ? folder.bookmarks.length
    : 0;
  document.getElementById('folder-details-permission').textContent = getFolderPermission(
    folder,
    currentUserEmail,
  ).toUpperCase();

  // Populate bookmarks list
  updateFolderBookmarksList(folder);

  // Populate members list
  updateFolderMembersList(folder);

  // Show/hide action buttons based on permissions
  const userPermission = getFolderPermission(folder, currentUserEmail);
  const editBtn = document.getElementById('edit-folder-btn');
  const deleteBtn = document.getElementById('delete-folder-btn');

  editBtn.style.display = userPermission === 'admin' ? 'block' : 'none';
  deleteBtn.style.display = userPermission === 'admin' ? 'block' : 'none';

  modal.classList.add('show');
}

/**
 * Hide folder details modal
 */
function hideFolderDetailsModal() {
  const modal = document.getElementById('folder-details-modal');
  modal.classList.remove('show');
}

/**
 * Update folder bookmarks list
 */
function updateFolderBookmarksList(folder) {
  const bookmarksList = document.getElementById('folder-bookmarks-list');

  if (!folder.bookmarks || folder.bookmarks.length === 0) {
    bookmarksList.innerHTML = '<p>No bookmarks in this folder</p>';
    return;
  }

  bookmarksList.innerHTML = folder.bookmarks
    .map(
      (bookmark) => `
    <div class="bookmark-item">
      <div>
        <div class="bookmark-title">${escapeHtml(bookmark.title)}</div>
        <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
        <div class="bookmark-added">Added by ${bookmark.addedBy} on ${formatDate(bookmark.addedAt)}</div>
      </div>
    </div>
  `,
    )
    .join('');
}

/**
 * Update folder members list
 */
function updateFolderMembersList(folder) {
  const membersList = document.getElementById('folder-members-list');

  if (!folder.members || folder.members.length === 0) {
    membersList.innerHTML = '<p>No members in this folder</p>';
    return;
  }

  membersList.innerHTML = folder.members
    .map(
      (member) => `
    <div class="member-item">
      <div class="member-email">${escapeHtml(member.email)}</div>
      <div class="member-permission">${member.permission.toUpperCase()}</div>
    </div>
  `,
    )
    .join('');
}

/**
 * Update import folder select
 */
function updateImportFolderSelect() {
  const select = document.getElementById('import-folder-select');

  select.innerHTML =
    '<option value="">Choose a shared folder</option>' +
    sharedFolders
      .map((folder) => `<option value="${folder.id}">${escapeHtml(folder.name)}</option>`)
      .join('');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Header buttons
  document.getElementById('create-folder-btn').addEventListener('click', showCreateFolderModal);
  document.getElementById('refresh-btn').addEventListener('click', loadSharedFolders);

  // Notifications panel
  document
    .getElementById('notifications-toggle')
    .addEventListener('click', toggleNotificationsPanel);

  // Create folder modal
  document.getElementById('create-modal-close').addEventListener('click', hideCreateFolderModal);
  document.getElementById('create-folder-cancel').addEventListener('click', hideCreateFolderModal);
  document.getElementById('create-folder-submit').addEventListener('click', handleCreateFolder);

  // Folder details modal
  document.getElementById('details-modal-close').addEventListener('click', hideFolderDetailsModal);
  document.getElementById('folder-details-close').addEventListener('click', hideFolderDetailsModal);
  document.getElementById('edit-folder-btn').addEventListener('click', handleEditFolder);
  document.getElementById('delete-folder-btn').addEventListener('click', handleDeleteFolder);

  // Import bookmarks modal
  document
    .getElementById('import-bookmarks-btn')
    .addEventListener('click', showImportBookmarksModal);
  document.getElementById('import-modal-close').addEventListener('click', hideImportBookmarksModal);
  document.getElementById('import-cancel').addEventListener('click', hideImportBookmarksModal);
  document.getElementById('import-submit').addEventListener('click', handleImportBookmarks);

  // Quick actions
  document.getElementById('export-bookmarks-btn').addEventListener('click', handleExportBookmarks);
  document
    .getElementById('manage-permissions-btn')
    .addEventListener('click', handleManagePermissions);

  // Form interactions
  document.getElementById('folder-encryption').addEventListener('change', togglePassphraseGroup);
  document.getElementById('add-member-btn').addEventListener('click', addMemberToList);
  document
    .getElementById('folder-passphrase')
    .addEventListener('input', validatePassphraseStrength);

  // Close modals when clicking outside
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });
}

/**
 * Toggle notifications panel
 */
function toggleNotificationsPanel() {
  const content = document.getElementById('notifications-content');
  const toggle = document.getElementById('notifications-toggle');

  if (content.style.display === 'none') {
    content.style.display = 'block';
    toggle.textContent = '−';
  } else {
    content.style.display = 'none';
    toggle.textContent = '+';
  }
}

/**
 * Toggle passphrase group visibility
 */
function togglePassphraseGroup() {
  const passphraseGroup = document.getElementById('passphrase-group');
  const isChecked = document.getElementById('folder-encryption').checked;

  passphraseGroup.style.display = isChecked ? 'block' : 'none';
}

/**
 * Add member to list
 */
function addMemberToList() {
  const emailInput = document.getElementById('member-email');
  const permissionSelect = document.getElementById('member-permission');
  const membersList = document.getElementById('members-list');

  const email = emailInput.value.trim();
  const permission = permissionSelect.value;

  if (!email || !isValidEmail(email)) {
    showToast('Please enter a valid email address', 'error');
    return;
  }

  // Check if member already exists
  const existingMembers = Array.from(membersList.children).map(
    (item) => item.querySelector('.member-email').textContent,
  );

  if (existingMembers.includes(email)) {
    showToast('Member already added to the list', 'error');
    return;
  }

  const memberItem = document.createElement('div');
  memberItem.className = 'member-item';
  memberItem.innerHTML = `
    <div class="member-email">${escapeHtml(email)}</div>
    <div class="member-permission">${permission.toUpperCase()}</div>
    <button type="button" class="remove-member" onclick="removeMemberFromList(this)">×</button>
  `;

  membersList.appendChild(memberItem);

  // Clear inputs
  emailInput.value = '';
  permissionSelect.value = 'read';
}

/**
 * Remove member from list
 */
function removeMemberFromList(button) {
  button.parentElement.remove();
}

/**
 * Validate passphrase strength
 */
function validatePassphraseStrength() {
  const passphrase = document.getElementById('folder-passphrase').value;
  const strengthDiv = document.getElementById('passphrase-strength');

  if (!passphrase) {
    strengthDiv.innerHTML = '';
    return;
  }

  const strength = validatePassphrase(passphrase);
  const strengthText = {
    weak: 'Weak - Use at least 8 characters with mixed case, numbers, and symbols',
    medium: 'Medium - Good, but could be stronger',
    strong: 'Strong - Excellent password strength',
  };

  const strengthColor = {
    weak: '#ba1a1a',
    medium: '#f57c00',
    strong: '#2e7d32',
  };

  strengthDiv.innerHTML = `
    <div style="color: ${strengthColor[strength]}; font-size: 12px;">
      ${strengthText[strength]}
    </div>
  `;
}

/**
 * Handle create folder
 */
async function handleCreateFolder() {
  try {
    const form = document.getElementById('create-folder-form');
    const formData = new FormData(form);

    const folderData = {
      name: formData.get('name'),
      description: formData.get('description'),
      encrypt: formData.get('encrypt') === 'on',
      passphrase: formData.get('passphrase'),
      members: getMembersFromList(),
    };

    if (!folderData.name) {
      showToast('Please enter a folder name', 'error');
      return;
    }

    if (folderData.encrypt && !folderData.passphrase) {
      showToast('Please enter an encryption passphrase', 'error');
      return;
    }

    showLoading(true);

    const result = await createSharedFolder(folderData, {
      encrypt: folderData.encrypt,
      passphrase: folderData.passphrase,
    });

    if (result.success) {
      showToast(result.message, 'success');
      hideCreateFolderModal();
      await loadSharedFolders();
    } else {
      showToast('Failed to create folder', 'error');
    }

    showLoading(false);
  } catch (error) {
    console.error('Failed to create folder:', error);
    showToast(`Failed to create folder: ${error.message}`, 'error');
    showLoading(false);
  }
}

/**
 * Get members from list
 */
function getMembersFromList() {
  const membersList = document.getElementById('members-list');
  const members = [];

  Array.from(membersList.children).forEach((item) => {
    const email = item.querySelector('.member-email').textContent;
    const permission = item.querySelector('.member-permission').textContent.toLowerCase();

    members.push({
      email,
      permission,
    });
  });

  return members;
}

/**
 * Handle edit folder
 */
function handleEditFolder() {
  showToast('Edit folder functionality coming soon', 'info');
}

/**
 * Handle delete folder
 */
async function handleDeleteFolder() {
  if (!confirm('Are you sure you want to delete this folder? This action cannot be undone.')) {
    return;
  }

  showToast('Delete folder functionality coming soon', 'info');
}

/**
 * Show import bookmarks modal
 */
function showImportBookmarksModal() {
  const modal = document.getElementById('import-bookmarks-modal');
  modal.classList.add('show');
}

/**
 * Hide import bookmarks modal
 */
function hideImportBookmarksModal() {
  const modal = document.getElementById('import-bookmarks-modal');
  modal.classList.remove('show');
}

/**
 * Handle import bookmarks
 */
async function handleImportBookmarks() {
  const folderId = document.getElementById('import-folder-select').value;
  const bookmarksInput = document.getElementById('import-bookmarks-input').value;
  const fileInput = document.getElementById('import-bookmarks-file');

  if (!folderId) {
    showToast('Please select a folder', 'error');
    return;
  }

  let bookmarks = [];

  if (fileInput.files.length > 0) {
    // Handle file upload
    const file = fileInput.files[0];
    const text = await file.text();
    bookmarks = parseBookmarksFromText(text);
  } else if (bookmarksInput.trim()) {
    // Handle text input
    bookmarks = parseBookmarksFromText(bookmarksInput);
  } else {
    showToast('Please enter bookmarks or upload a file', 'error');
    return;
  }

  if (bookmarks.length === 0) {
    showToast('No valid bookmarks found', 'error');
    return;
  }

  try {
    showLoading(true);

    const result = await addBookmarksToSharedFolder(folderId, bookmarks);

    if (result.success) {
      showToast(result.message, 'success');
      hideImportBookmarksModal();
      await loadSharedFolders();
    } else {
      showToast('Failed to import bookmarks', 'error');
    }

    showLoading(false);
  } catch (error) {
    console.error('Failed to import bookmarks:', error);
    showToast(`Failed to import bookmarks: ${error.message}`, 'error');
    showLoading(false);
  }
}

/**
 * Parse bookmarks from text
 */
function parseBookmarksFromText(text) {
  const lines = text.trim().split('\n');
  const bookmarks = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to parse as JSON
    try {
      const bookmark = JSON.parse(trimmed);
      if (bookmark.url && bookmark.title) {
        bookmarks.push(bookmark);
      }
    } catch {
      // Try to parse as URL
      if (isValidUrl(trimmed)) {
        bookmarks.push({
          title: new URL(trimmed).hostname,
          url: trimmed,
        });
      }
    }
  }

  return bookmarks;
}

/**
 * Handle export bookmarks
 */
function handleExportBookmarks() {
  showToast('Export bookmarks functionality coming soon', 'info');
}

/**
 * Handle manage permissions
 */
function handleManagePermissions() {
  showToast('Manage permissions functionality coming soon', 'info');
}

/**
 * Get folder permission for user
 */
function getFolderPermission(folder, userEmail) {
  if (folder.createdBy === userEmail) {
    return 'admin';
  }

  const member = folder.members?.find((m) => m.email === userEmail);
  return member ? member.permission : 'read';
}

/**
 * Get current user email
 */
async function getCurrentUserEmail() {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${await getAuthToken()}`,
      },
    });

    if (response.ok) {
      const userInfo = await response.json();
      return userInfo.email;
    }
  } catch (error) {
    console.error('Failed to get user email:', error);
  }

  return 'unknown@example.com';
}

/**
 * Get auth token
 */
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getAuthToken' }, (response) => {
      resolve(response?.token || null);
    });
  });
}

/**
 * Show loading state
 */
function showLoading(show) {
  const container = document.querySelector('.shared-folders-container');
  if (show) {
    container.classList.add('loading');
  } else {
    container.classList.remove('loading');
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3000);
}

/**
 * Utility functions
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSharedFolders);

// Make removeMemberFromList globally accessible
window.removeMemberFromList = removeMemberFromList;
