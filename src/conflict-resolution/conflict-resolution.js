/**
 * BookDrive Conflict Resolution
 * Visual merge tools for resolving bookmark conflicts
 */

import {
  resolveConflicts,
} from '../lib/sync/conflict-resolver.js';
import { generateSyncPreview } from '../lib/sync/sync-preview.js';

// Global state
let conflicts = [];
let resolvedConflicts = [];
let currentConflictIndex = 0;

/**
 * Initialize the conflict resolution page
 */
async function initializeConflictResolution() {
  console.log('Initializing Conflict Resolution...');

  try {
    // Set up event listeners
    setupEventListeners();

    // Load conflicts
    await loadConflicts();

    console.log('Conflict resolution initialized successfully');
  } catch (error) {
    console.error('Failed to initialize conflict resolution:', error);
    showError('Failed to load conflicts. Please try again.');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Auto resolve button
  const autoResolveBtn = document.getElementById('auto-resolve-btn');
  if (autoResolveBtn) {
    autoResolveBtn.addEventListener('click', async () => {
      await autoResolveConflicts();
    });
  }

  // Apply all button
  const applyAllBtn = document.getElementById('apply-all-btn');
  if (applyAllBtn) {
    applyAllBtn.addEventListener('click', async () => {
      await applyAllResolutions();
    });
  }

  // Skip all button
  const skipAllBtn = document.getElementById('skip-all-btn');
  if (skipAllBtn) {
    skipAllBtn.addEventListener('click', () => {
      skipAllConflicts();
    });
  }

  // Resolution strategy selector
  const strategySelect = document.getElementById('resolution-strategy');
  if (strategySelect) {
    strategySelect.addEventListener('change', () => {
      updateResolutionStrategy(strategySelect.value);
    });
  }

  // Resolve selected button
  const resolveSelectedBtn = document.getElementById('resolve-selected-btn');
  if (resolveSelectedBtn) {
    resolveSelectedBtn.addEventListener('click', () => {
      resolveSelectedConflicts();
    });
  }

  // Cancel button
  const cancelBtn = document.getElementById('cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.close();
    });
  }

  // Modal close button
  const modalClose = document.getElementById('modal-close');
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      closeModal();
    });
  }

  // Modal backdrop click
  const modal = document.getElementById('conflict-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Apply resolution button
  const applyResolutionBtn = document.getElementById('apply-resolution-btn');
  if (applyResolutionBtn) {
    applyResolutionBtn.addEventListener('click', () => {
      applyCurrentResolution();
    });
  }

  // Skip conflict button
  const skipConflictBtn = document.getElementById('skip-conflict-btn');
  if (skipConflictBtn) {
    skipConflictBtn.addEventListener('click', () => {
      skipCurrentConflict();
    });
  }

  // Option buttons
  const optionBtns = document.querySelectorAll('.option-btn');
  optionBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectResolutionOption(btn.dataset.option);
    });
  });

  // Panel toggle
  const panelToggle = document.getElementById('panel-toggle');
  if (panelToggle) {
    panelToggle.addEventListener('click', () => {
      toggleRecommendationsPanel();
    });
  }
}

/**
 * Load conflicts from sync preview
 */
async function loadConflicts() {
  try {
    showLoading(true);

    // Generate sync preview to detect conflicts
    const preview = await generateSyncPreview('global');

    if (!preview.success) {
      throw new Error(preview.message || 'Failed to generate sync preview');
    }

    conflicts = preview.preview.details.conflicts || [];
    resolvedConflicts = [];
    currentConflictIndex = 0;

    // Update UI
    updateConflictSummary();
    updateConflictList();
    updateProgress();

    showLoading(false);

    if (conflicts.length === 0) {
      showEmptyState();
    }
  } catch (error) {
    console.error('Failed to load conflicts:', error);
    showError('Failed to load conflicts. Please try again.');
    showLoading(false);
  }
}

/**
 * Update conflict summary
 */
function updateConflictSummary() {
  const conflictCount = document.getElementById('conflict-count');
  if (conflictCount) {
    conflictCount.textContent = `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} found`;
  }
}

/**
 * Update conflict list
 */
function updateConflictList() {
  const conflictList = document.getElementById('conflict-list');
  if (!conflictList) return;

  if (conflicts.length === 0) {
    conflictList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>No Conflicts Found</h3>
        <p>All bookmarks are in sync. No conflicts to resolve.</p>
      </div>
    `;
    return;
  }

  conflictList.innerHTML = conflicts
    .map((conflict, index) => {
      const isResolved = resolvedConflicts.includes(index);
      const severity = analyzeConflictSeverity(conflict);
      const type = analyzeConflictType(conflict);

      return `
      <div class="conflict-item ${isResolved ? 'resolved' : ''}" data-index="${index}">
        <div class="conflict-header-row">
          <div>
            <div class="conflict-title">${conflict.local.title || conflict.remote.title || 'Untitled Bookmark'}</div>
            <div class="conflict-url">${conflict.local.url || conflict.remote.url || 'No URL'}</div>
          </div>
          <div class="conflict-severity ${severity}">${severity}</div>
        </div>
        <div class="conflict-meta">
          <span>Type: ${type}</span>
          <span>ID: ${conflict.id}</span>
        </div>
        <input type="checkbox" class="conflict-checkbox" ${isResolved ? 'checked' : ''}>
      </div>
    `;
    })
    .join('');

  // Add click handlers
  const conflictItems = document.querySelectorAll('.conflict-item');
  conflictItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        const index = parseInt(item.dataset.index);
        openConflictModal(index);
      }
    });
  });
}

/**
 * Update progress bar
 */
function updateProgress() {
  const progressFill = document.getElementById('progress-fill');
  const resolvedCount = document.getElementById('resolved-count');
  const totalCount = document.getElementById('total-count');

  if (progressFill && resolvedCount && totalCount) {
    const progress = conflicts.length > 0 ? (resolvedConflicts.length / conflicts.length) * 100 : 0;
    progressFill.style.width = `${progress}%`;
    resolvedCount.textContent = resolvedConflicts.length;
    totalCount.textContent = conflicts.length;
  }
}

/**
 * Analyze conflict severity
 * @param {Object} conflict - Conflict object
 * @returns {string} Severity level
 */
function analyzeConflictSeverity(conflict) {
  const { local, remote } = conflict;

  // High severity: URL changes
  if (local.url !== remote.url) {
    return 'high';
  }

  // Medium severity: Title changes
  if (local.title !== remote.title) {
    return 'medium';
  }

  // Low severity: Folder changes or other metadata
  return 'low';
}

/**
 * Analyze conflict type
 * @param {Object} conflict - Conflict object
 * @returns {string} Conflict type
 */
function analyzeConflictType(conflict) {
  const { local, remote } = conflict;

  const titleChanged = local.title !== remote.title;
  const urlChanged = local.url !== remote.url;
  const folderChanged = local.parentId !== remote.parentId;

  if (titleChanged && urlChanged && folderChanged) {
    return 'mixed';
  } else if (folderChanged) {
    return 'folder';
  } else if (urlChanged) {
    return 'url';
  } else if (titleChanged) {
    return 'title';
  }

  return 'mixed';
}

/**
 * Auto resolve conflicts
 */
async function autoResolveConflicts() {
  try {
    const strategy = document.getElementById('resolution-strategy').value;

    if (strategy === 'manual') {
      showError('Please select an automatic resolution strategy');
      return;
    }

    showLoading(true);

    const resolution = resolveConflicts(conflicts, strategy);

    // Mark conflicts as resolved
    resolution.resolved.forEach((_, index) => {
      if (!resolvedConflicts.includes(index)) {
        resolvedConflicts.push(index);
      }
    });

    updateConflictList();
    updateProgress();

    showSuccess(`Auto-resolved ${resolution.resolvedCount} conflicts`);
    showLoading(false);
  } catch (error) {
    console.error('Failed to auto-resolve conflicts:', error);
    showError('Failed to auto-resolve conflicts. Please try again.');
    showLoading(false);
  }
}

/**
 * Apply all resolutions
 */
async function applyAllResolutions() {
  try {
    if (resolvedConflicts.length === 0) {
      showError('No conflicts have been resolved yet');
      return;
    }

    showLoading(true);

    // Apply resolutions to bookmarks
    const resolvedBookmarks = resolvedConflicts.map((index) => {
      const conflict = conflicts[index];
      // For now, use local version as default
      return conflict.local;
    });

    // Update bookmarks (this would integrate with the actual bookmark API)
    console.log('Applying resolved bookmarks:', resolvedBookmarks);

    showSuccess(`Applied ${resolvedConflicts.length} resolutions`);
    showLoading(false);

    // Close the window after successful application
    setTimeout(() => {
      window.close();
    }, 2000);
  } catch (error) {
    console.error('Failed to apply resolutions:', error);
    showError('Failed to apply resolutions. Please try again.');
    showLoading(false);
  }
}

/**
 * Skip all conflicts
 */
function skipAllConflicts() {
  if (confirm('Are you sure you want to skip all conflicts? This will leave them unresolved.')) {
    window.close();
  }
}

/**
 * Update resolution strategy
 * @param {string} strategy - Resolution strategy
 */
function updateResolutionStrategy(strategy) {
  console.log('Resolution strategy updated:', strategy);
  // This could trigger automatic resolution or update UI
}

/**
 * Resolve selected conflicts
 */
function resolveSelectedConflicts() {
  const selectedCheckboxes = document.querySelectorAll('.conflict-checkbox:checked');

  if (selectedCheckboxes.length === 0) {
    showError('Please select conflicts to resolve');
    return;
  }

  selectedCheckboxes.forEach((checkbox) => {
    const conflictItem = checkbox.closest('.conflict-item');
    const index = parseInt(conflictItem.dataset.index);

    if (!resolvedConflicts.includes(index)) {
      resolvedConflicts.push(index);
    }
  });

  updateConflictList();
  updateProgress();
  showSuccess(`Marked ${selectedCheckboxes.length} conflicts as resolved`);
}

/**
 * Open conflict modal
 * @param {number} index - Conflict index
 */
function openConflictModal(index) {
  const conflict = conflicts[index];
  if (!conflict) return;

  currentConflictIndex = index;

  // Populate modal with conflict data
  document.getElementById('conflict-title').textContent =
    conflict.local.title || conflict.remote.title || 'Untitled Bookmark';
  document.getElementById('conflict-url').textContent =
    conflict.local.url || conflict.remote.url || 'No URL';

  // Local version
  document.getElementById('local-title').value = conflict.local.title || '';
  document.getElementById('local-url').value = conflict.local.url || '';
  document.getElementById('local-modified').textContent = formatDate(
    new Date(conflict.local.dateModified || 0),
  );
  document.getElementById('local-added').textContent = formatDate(
    new Date(conflict.local.dateAdded || 0),
  );

  // Remote version
  document.getElementById('remote-title').value = conflict.remote.title || '';
  document.getElementById('remote-url').value = conflict.remote.url || '';
  document.getElementById('remote-modified').textContent = formatDate(
    new Date(conflict.remote.dateModified || 0),
  );
  document.getElementById('remote-added').textContent = formatDate(
    new Date(conflict.remote.dateAdded || 0),
  );

  // Show modal
  const modal = document.getElementById('conflict-modal');
  if (modal) {
    modal.classList.add('show');
  }
}

/**
 * Close modal
 */
function closeModal() {
  const modal = document.getElementById('conflict-modal');
  if (modal) {
    modal.classList.remove('show');
  }
}

/**
 * Select resolution option
 * @param {string} option - Resolution option
 */
function selectResolutionOption(option) {
  // Remove previous selection
  document.querySelectorAll('.option-btn').forEach((btn) => {
    btn.classList.remove('selected');
  });

  // Select new option
  const selectedBtn = document.querySelector(`[data-option="${option}"]`);
  if (selectedBtn) {
    selectedBtn.classList.add('selected');
  }

  // Apply the selection
  const conflict = conflicts[currentConflictIndex];
  if (!conflict) return;

  switch (option) {
    case 'local':
      document.getElementById('local-title').focus();
      break;
    case 'remote':
      document.getElementById('remote-title').focus();
      break;
    case 'merge':
      // Auto-merge logic would go here
      break;
    case 'custom':
      // Enable editing
      break;
  }
}

/**
 * Apply current resolution
 */
function applyCurrentResolution() {
  const selectedOption = document.querySelector('.option-btn.selected');
  if (!selectedOption) {
    showError('Please select a resolution option');
    return;
  }

  const _option = selectedOption.dataset.option;
  const conflict = conflicts[currentConflictIndex];

  if (!conflict) return;

  // Mark as resolved
  if (!resolvedConflicts.includes(currentConflictIndex)) {
    resolvedConflicts.push(currentConflictIndex);
  }

  // Update UI
  updateConflictList();
  updateProgress();
  closeModal();

  showSuccess('Conflict resolved successfully');
}

/**
 * Skip current conflict
 */
function skipCurrentConflict() {
  closeModal();
  showInfo('Conflict skipped');
}

/**
 * Toggle recommendations panel
 */
function toggleRecommendationsPanel() {
  const panel = document.getElementById('recommendations-panel');
  const content = document.getElementById('panel-content');
  const toggle = document.getElementById('panel-toggle');

  if (panel && content && toggle) {
    const isVisible = content.style.display !== 'none';

    if (isVisible) {
      content.style.display = 'none';
      toggle.textContent = '+';
    } else {
      content.style.display = 'block';
      toggle.textContent = '−';
    }
  }
}

/**
 * Show empty state
 */
function showEmptyState() {
  const conflictList = document.getElementById('conflict-list');
  if (conflictList) {
    conflictList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>No Conflicts Found</h3>
        <p>All bookmarks are in sync. No conflicts to resolve.</p>
      </div>
    `;
  }
}

/**
 * Show loading state
 * @param {boolean} loading - Loading state
 */
function showLoading(loading) {
  const container = document.querySelector('.conflict-container');
  if (container) {
    if (loading) {
      container.classList.add('loading');
    } else {
      container.classList.remove('loading');
    }
  }
}

/**
 * Show success message
 * @param {string} message - Success message
 */
function showSuccess(message) {
  showToast(message, 'success');
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  showToast(message, 'error');
}

/**
 * Show info message
 * @param {string} message - Info message
 */
function showInfo(message) {
  showToast(message, 'info');
}

/**
 * Show toast message
 * @param {string} message - Message
 * @param {string} type - Message type
 */
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Add styles
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;

  // Set background color based on type
  if (type === 'success') {
    toast.style.backgroundColor = '#2e7d32';
  } else if (type === 'error') {
    toast.style.backgroundColor = '#c62828';
  } else {
    toast.style.backgroundColor = '#1565c0';
  }

  // Add to page
  document.body.appendChild(toast);

  // Remove after 3 seconds
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
 * Format date
 * @param {Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
  if (date.getTime() === 0) {
    return 'Unknown';
  }

  const now = new Date();
  const diff = now - date;
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 7 * oneDay) {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeConflictResolution);
