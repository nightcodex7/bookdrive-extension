// Backup History JavaScript
import { getAllBackups, getBackupsByType, deleteBackup } from '../lib/index.js';

// Constants
const ITEMS_PER_PAGE = 10;

// State
let backups = [];
let filteredBackups = [];
let currentPage = 1;
let sortField = 'timestamp';
let sortDirection = 'desc';
let filters = {
  type: 'all',
  status: 'all',
  dateRange: 'all',
};

// DOM Elements
let backupItemsContainer;
let typeFilter;
let statusFilter;
let dateFilter;
let prevPageButton;
let nextPageButton;
let currentPageSpan;
let restoreModal;
let deleteModal;
let sortIndicators = {};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
  backupItemsContainer = document.getElementById('backup-items-container');
  typeFilter = document.getElementById('type-filter');
  statusFilter = document.getElementById('status-filter');
  dateFilter = document.getElementById('date-filter');
  prevPageButton = document.getElementById('prev-page');
  nextPageButton = document.getElementById('next-page');
  currentPageSpan = document.querySelector('.current-page');
  restoreModal = document.getElementById('restore-modal');
  deleteModal = document.getElementById('delete-modal');

  // Get sort header elements
  sortIndicators = {
    id: document.querySelector('#sort-id .sort-indicator'),
    timestamp: document.querySelector('#sort-timestamp .sort-indicator'),
    type: document.querySelector('#sort-type .sort-indicator'),
    status: document.querySelector('#sort-status .sort-indicator'),
  };

  // Set up event listeners
  setupEventListeners();

  // Set up message listener for progress updates and notifications
  setupMessageListener();

  // Load backups
  await loadBackups();
});

// Set up event listeners
function setupEventListeners() {
  // Filter change events
  typeFilter.addEventListener('change', handleFilterChange);
  statusFilter.addEventListener('change', handleFilterChange);
  dateFilter.addEventListener('change', handleFilterChange);

  // Sort header click events
  document.getElementById('sort-id').addEventListener('click', () => handleSort('id'));
  document
    .getElementById('sort-timestamp')
    .addEventListener('click', () => handleSort('timestamp'));
  document.getElementById('sort-type').addEventListener('click', () => handleSort('type'));
  document.getElementById('sort-status').addEventListener('click', () => handleSort('status'));

  // Pagination events
  prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderBackups();
    }
  });

  nextPageButton.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredBackups.length / ITEMS_PER_PAGE);
    if (currentPage < totalPages) {
      currentPage++;
      renderBackups();
    }
  });

  // Restore modal events
  document.getElementById('confirm-restore').addEventListener('click', handleRestoreConfirm);
  document.getElementById('cancel-restore').addEventListener('click', () => {
    restoreModal.style.display = 'none';
  });

  // Delete modal events
  document.getElementById('confirm-delete').addEventListener('click', handleDeleteConfirm);
  document.getElementById('cancel-delete').addEventListener('click', () => {
    deleteModal.style.display = 'none';
  });

  // Success modal events
  document.getElementById('success-close').addEventListener('click', () => {
    document.getElementById('success-modal').style.display = 'none';
  });
}

// Load backups from storage
async function loadBackups() {
  try {
    // Get all backups
    backups = await getAllBackups();

    // Apply filters and sort
    applyFiltersAndSort();

    // Render backups
    renderBackups();
  } catch (error) {
    console.error('Failed to load backups:', error);
    showToast('Failed to load backups. Please try again.', 'error');
  }
}

// Apply filters and sort to backups
function applyFiltersAndSort() {
  // Apply filters
  filteredBackups = backups.filter((backup) => {
    // Type filter
    if (filters.type !== 'all' && backup.type !== filters.type) {
      return false;
    }

    // Status filter
    if (filters.status !== 'all' && backup.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const backupDate = new Date(backup.timestamp);
      const now = new Date();

      switch (filters.dateRange) {
        case 'today':
          // Check if backup is from today
          return backupDate.toDateString() === now.toDateString();

        case 'week':
          // Check if backup is from the last 7 days
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          return backupDate >= weekAgo;

        case 'month':
          // Check if backup is from the last 30 days
          const monthAgo = new Date();
          monthAgo.setDate(now.getDate() - 30);
          return backupDate >= monthAgo;
      }
    }

    return true;
  });

  // Apply sort
  filteredBackups.sort((a, b) => {
    let valueA, valueB;

    // Get values to compare based on sort field
    switch (sortField) {
      case 'id':
        valueA = a.id;
        valueB = b.id;
        break;

      case 'timestamp':
        valueA = new Date(a.timestamp);
        valueB = new Date(b.timestamp);
        break;

      case 'type':
        valueA = a.type;
        valueB = b.type;
        break;

      case 'status':
        valueA = a.status;
        valueB = b.status;
        break;

      default:
        valueA = new Date(a.timestamp);
        valueB = new Date(b.timestamp);
    }

    // Compare values based on sort direction
    if (sortDirection === 'asc') {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });

  // Reset to first page when filters or sort change
  currentPage = 1;
}

// Render backups to the UI
function renderBackups() {
  // Clear container
  backupItemsContainer.innerHTML = '';

  // Check if there are any backups
  if (filteredBackups.length === 0) {
    backupItemsContainer.innerHTML = `
      <div class="empty-state">
        <p>No backups found. Create a backup to see it here.</p>
      </div>
    `;

    // Disable pagination
    prevPageButton.disabled = true;
    nextPageButton.disabled = true;
    currentPageSpan.textContent = '1';

    return;
  }

  // Calculate pagination
  const totalPages = Math.ceil(filteredBackups.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, filteredBackups.length);

  // Update pagination controls
  prevPageButton.disabled = currentPage === 1;
  nextPageButton.disabled = currentPage === totalPages;
  currentPageSpan.textContent = currentPage;

  // Get backups for current page
  const pageBackups = filteredBackups.slice(startIndex, endIndex);

  // Create backup items
  pageBackups.forEach((backup) => {
    const backupItem = document.createElement('div');
    backupItem.className = 'backup-item';

    // Format timestamp
    const timestamp = new Date(backup.timestamp);
    const formattedDate = timestamp.toLocaleDateString();
    const formattedTime = timestamp.toLocaleTimeString();

    // Create backup item HTML
    backupItem.innerHTML = `
      <div class="backup-id" title="${backup.id}">${truncateId(backup.id)}</div>
      <div class="backup-timestamp" title="${timestamp.toISOString()}">
        ${formattedDate}<br>${formattedTime}
      </div>
      <div class="backup-type ${backup.type}">${backup.type}</div>
      <div class="backup-status ${backup.status}">${formatStatus(backup.status)}</div>
      <div class="backup-actions">
        <button class="action-button restore" title="Restore this backup" data-id="${backup.id}">
          <span class="material-icons">restore</span>
        </button>
        <button class="action-button delete" title="Delete this backup" data-id="${backup.id}">
          <span class="material-icons">delete</span>
        </button>
      </div>
    `;

    // Add event listeners to action buttons
    const restoreButton = backupItem.querySelector('.action-button.restore');
    restoreButton.addEventListener('click', () => showRestoreModal(backup));

    const deleteButton = backupItem.querySelector('.action-button.delete');
    deleteButton.addEventListener('click', () => showDeleteModal(backup));

    // Add to container
    backupItemsContainer.appendChild(backupItem);
  });

  // Update sort indicators
  updateSortIndicators();
}

// Handle filter change
function handleFilterChange() {
  // Update filters
  filters.type = typeFilter.value;
  filters.status = statusFilter.value;
  filters.dateRange = dateFilter.value;

  // Apply filters and sort
  applyFiltersAndSort();

  // Render backups
  renderBackups();
}

// Handle sort header click
function handleSort(field) {
  // If clicking the same field, toggle direction
  if (sortField === field) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // Otherwise, set new field and default to descending
    sortField = field;
    sortDirection = 'desc';
  }

  // Apply filters and sort
  applyFiltersAndSort();

  // Render backups
  renderBackups();
}

// Update sort indicators
function updateSortIndicators() {
  // Clear all indicators
  Object.values(sortIndicators).forEach((indicator) => {
    indicator.textContent = '';
  });

  // Set indicator for current sort field
  if (sortIndicators[sortField]) {
    sortIndicators[sortField].textContent = sortDirection === 'asc' ? '▲' : '▼';
  }
}

// Show restore confirmation modal
function showRestoreModal(backup) {
  // Set backup details in modal
  document.getElementById('restore-backup-id').textContent = backup.id;
  document.getElementById('restore-backup-timestamp').textContent = new Date(
    backup.timestamp,
  ).toLocaleString();

  // Format backup type with proper capitalization and display
  const backupTypeText = backup.type === 'scheduled' ? 'Scheduled' : 'Manual';
  document.getElementById('restore-backup-type').textContent = backupTypeText;
  document.getElementById('restore-backup-type').className = backup.type;

  // Add bookmark count if available
  if (backup.bookmarkCount) {
    document.getElementById('restore-bookmark-count').textContent = backup.bookmarkCount;
    document.getElementById('restore-bookmark-count-container').style.display = 'block';
  } else {
    document.getElementById('restore-bookmark-count-container').style.display = 'none';
  }

  // Add creation date information
  const creationDate = new Date(backup.timestamp);
  const timeAgo = getTimeAgo(creationDate);
  document.getElementById('restore-backup-age').textContent = timeAgo;
  document.getElementById('restore-backup-age-container').style.display = 'block';

  // Store backup ID, type, timestamp and bookmark count for restore confirmation
  const confirmButton = document.getElementById('confirm-restore');
  confirmButton.dataset.backupId = backup.id;
  confirmButton.dataset.backupType = backup.type;
  confirmButton.dataset.timestamp = backup.timestamp;
  confirmButton.dataset.bookmarkCount = backup.bookmarkCount || 'Unknown';

  // Show modal with enhanced warning for scheduled backups
  restoreModal.style.display = 'flex';

  // Add specific warning for scheduled backups
  const warningElement = document.querySelector('.restore-warning p');
  if (backup.type === 'scheduled') {
    warningElement.innerHTML = `<span class="material-icons">warning</span> This action will replace your current bookmarks with the ones from this scheduled backup.`;
  } else {
    warningElement.innerHTML = `<span class="material-icons">warning</span> This action will replace your current bookmarks with the ones from this backup.`;
  }
}

// Handle restore confirmation
function handleRestoreConfirm() {
  const confirmButton = document.getElementById('confirm-restore');
  const backupId = confirmButton.dataset.backupId;
  const backupType = confirmButton.dataset.backupType;
  const timestamp = confirmButton.dataset.timestamp;
  const bookmarkCount = confirmButton.dataset.bookmarkCount || 'Unknown';

  // Show loading state in the modal
  confirmButton.textContent = 'Restoring...';
  confirmButton.disabled = true;
  document.getElementById('cancel-restore').disabled = true;

  // Add progress indicator to the modal
  const modalContent = document.querySelector('#restore-modal .modal-content');
  const progressElement = document.createElement('div');
  progressElement.className = 'restore-progress';
  progressElement.innerHTML = `
    <div class="progress-bar-container">
      <div class="progress-bar"></div>
    </div>
    <p class="progress-text">Restoring your bookmarks...</p>
  `;
  modalContent.appendChild(progressElement);

  // Animate progress bar
  const progressBar = progressElement.querySelector('.progress-bar');
  let width = 0;
  const progressInterval = setInterval(() => {
    if (width >= 90) {
      clearInterval(progressInterval);
    } else {
      width += 5;
      progressBar.style.width = width + '%';
    }
  }, 150);

  // Send message to restore backup
  chrome.runtime.sendMessage(
    {
      action: 'restoreBackup',
      backupId,
    },
    (response) => {
      // Complete the progress bar animation
      clearInterval(progressInterval);
      progressBar.style.width = '100%';

      // Wait a moment to show completion before closing modal
      setTimeout(() => {
        // Hide restore modal
        restoreModal.style.display = 'none';

        // Reset button state for next time
        confirmButton.textContent = 'Restore';
        confirmButton.disabled = false;
        document.getElementById('cancel-restore').disabled = false;

        // Remove progress element for next time
        if (progressElement.parentNode) {
          progressElement.parentNode.removeChild(progressElement);
        }

        if (response?.success) {
          // Format date for display
          const formattedDate = new Date(timestamp).toLocaleString();

          // Use the detailed message from the background script if available
          const successMessage =
            response.message ||
            `${backupType === 'scheduled' ? 'Scheduled' : 'Manual'} backup from ${formattedDate} restored successfully!`;

          // Show success notification
          showToast(successMessage, 'success');

          // Add a visual indicator to the restored backup in the list
          highlightRestoredBackup(backupId);

          // Show success modal with details
          const successModal = document.getElementById('success-modal');
          const successBackupType = document.getElementById('success-backup-type');
          const successBackupTimestamp = document.getElementById('success-backup-timestamp');
          const successBookmarkCount = document.getElementById('success-bookmark-count');
          const successMessage_el = document.getElementById('success-message');

          // Set success modal content
          successBackupType.textContent = backupType === 'scheduled' ? 'Scheduled' : 'Manual';
          successBackupType.className = backupType; // Add class for styling
          successBackupTimestamp.textContent = formattedDate;
          successBookmarkCount.textContent = bookmarkCount;
          successMessage_el.textContent = successMessage;

          // Show success modal
          successModal.style.display = 'flex';

          // Add event listener to close button (only once)
          const closeButton = document.getElementById('success-close');
          const closeSuccessModal = () => {
            successModal.style.display = 'none';
            closeButton.removeEventListener('click', closeSuccessModal);
          };
          closeButton.addEventListener('click', closeSuccessModal);

          // Notify user of successful restoration with browser notification
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('BookDrive Restoration Complete', {
                body: `Your bookmarks have been successfully restored from the ${backupType} backup.`,
                icon: '/assets/icon-48.png',
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                  new Notification('BookDrive Restoration Complete', {
                    body: `Your bookmarks have been successfully restored from the ${backupType} backup.`,
                    icon: '/assets/icon-48.png',
                  });
                }
              });
            }
          }
        } else {
          // Show error notification with details if available
          showToast(`Failed to restore backup: ${response?.error || 'Unknown error'}`, 'error');
        }
      }, 500);
    },
  );
}

// Highlight the recently restored backup in the list
function highlightRestoredBackup(backupId) {
  // Find the backup item in the list
  const backupItem = document.querySelector(
    `.backup-item .backup-id[title="${backupId}"]`,
  )?.parentElement;

  if (backupItem) {
    // Add a highlight class
    backupItem.classList.add('recently-restored');

    // Scroll to the item if needed
    backupItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove highlight after a few seconds
    setTimeout(() => {
      backupItem.classList.remove('recently-restored');
    }, 5000);
  }
}

// Show delete confirmation modal
function showDeleteModal(backup) {
  // Set backup details in modal
  document.getElementById('delete-backup-id').textContent = backup.id;
  document.getElementById('delete-backup-timestamp').textContent = new Date(
    backup.timestamp,
  ).toLocaleString();
  document.getElementById('delete-backup-type').textContent = backup.type;

  // Store backup ID for delete confirmation
  document.getElementById('confirm-delete').dataset.backupId = backup.id;

  // Show modal
  deleteModal.style.display = 'flex';
}

// Handle delete confirmation
async function handleDeleteConfirm() {
  const backupId = document.getElementById('confirm-delete').dataset.backupId;

  // Hide modal
  deleteModal.style.display = 'none';

  try {
    // Delete backup
    const success = await deleteBackup(backupId);

    if (success) {
      // Reload backups
      await loadBackups();

      showToast('Backup deleted successfully!', 'success');
    } else {
      showToast('Failed to delete backup. Please try again.', 'error');
    }
  } catch (error) {
    console.error('Failed to delete backup:', error);
    showToast('Failed to delete backup. Please try again.', 'error');
  }
}

// Helper function to truncate backup ID
function truncateId(id) {
  if (id.length > 15) {
    return id.substring(0, 12) + '...';
  }
  return id;
}

// Helper function to format status
function formatStatus(status) {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'retry_pending':
      return 'Retry Pending';
    default:
      return status;
  }
}

// Helper function to get relative time (e.g., "2 days ago")
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffMonth > 0) {
    return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;
  } else if (diffDay > 0) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  } else if (diffHour > 0) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  } else if (diffMin > 0) {
    return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
  } else {
    return 'Just now';
  }
}

// Show toast message
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;

  // Set toast color based on type
  let backgroundColor;
  switch (type) {
    case 'success':
      backgroundColor = '#43a047';
      break;
    case 'error':
      backgroundColor = '#d32f2f';
      break;
    case 'warning':
      backgroundColor = '#f57c00';
      break;
    default:
      backgroundColor = '#333';
  }

  // Set toast content and style
  toastContainer.textContent = message;
  toastContainer.style.backgroundColor = backgroundColor;
  toastContainer.style.display = 'block';

  // Hide toast after delay
  setTimeout(() => {
    toastContainer.style.display = 'none';
  }, 3000);
} // Set up message listener for progress updates and notifications
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Handle toast notifications
    if (message.action === 'showToast') {
      showToast(message.message, message.type, message.duration || 3000);
      return true;
    }

    // Handle backup progress updates
    if (message.action === 'updateBackupProgress') {
      updateBackupProgressUI(message.backupId, message.progress, message.status);
      return true;
    }

    return false;
  });
}

// Update backup progress in the UI
function updateBackupProgressUI(backupId, progress, statusText) {
  // Find the backup item in the list
  const backupItem = document.querySelector(
    `.backup-item .backup-id[title="${backupId}"]`,
  )?.parentElement;

  if (backupItem) {
    // Get or create progress element
    let progressElement = backupItem.querySelector('.backup-progress');
    if (!progressElement) {
      progressElement = document.createElement('div');
      progressElement.className = 'backup-progress';
      progressElement.innerHTML = `
        <div class="progress-bar-container">
          <div class="progress-bar"></div>
        </div>
        <p class="progress-text"></p>
      `;
      backupItem.appendChild(progressElement);
    }

    // Update progress bar and text
    const progressBar = progressElement.querySelector('.progress-bar');
    const progressText = progressElement.querySelector('.progress-text');

    progressBar.style.width = `${progress}%`;
    progressText.textContent = statusText;

    // Update status display
    const statusElement = backupItem.querySelector('.backup-status');
    if (statusElement) {
      statusElement.textContent = 'In Progress';
      statusElement.className = 'backup-status in_progress';
    }

    // If progress is 100%, remove progress element after a delay
    if (progress >= 100) {
      setTimeout(() => {
        if (progressElement.parentNode) {
          progressElement.parentNode.removeChild(progressElement);

          // Reload backups to get updated status
          loadBackups();
        }
      }, 1000);
    }
  }
}
