/**
 * BookDrive Conflict Resolution
 * Visual merge tools for resolving bookmark conflicts
 */

import { resolveConflicts, CONFLICT_STRATEGIES } from '../lib/sync/conflict-resolver.js';
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
  if (index < 0 || index >= conflicts.length) return;

  const conflict = conflicts[index];
  const modal = createConflictModal(conflict, index);
  document.body.appendChild(modal);

  // Add event listeners
  const closeBtn = modal.querySelector('.modal-close');
  const localBtn = modal.querySelector('.resolve-local');
  const remoteBtn = modal.querySelector('.resolve-remote');
  const mergeBtn = modal.querySelector('.resolve-merge');
  const skipBtn = modal.querySelector('.resolve-skip');

  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  localBtn.addEventListener('click', () => {
    resolveConflictByIndex(index, CONFLICT_STRATEGIES.LOCAL_WINS);
    document.body.removeChild(modal);
  });

  remoteBtn.addEventListener('click', () => {
    resolveConflictByIndex(index, CONFLICT_STRATEGIES.REMOTE_WINS);
    document.body.removeChild(modal);
  });

  mergeBtn.addEventListener('click', () => {
    resolveConflictByIndex(index, CONFLICT_STRATEGIES.MERGE);
    document.body.removeChild(modal);
  });

  skipBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
}

/**
 * Create conflict resolution modal
 * @param {Object} conflict - Conflict object
 * @param {number} index - Conflict index
 * @returns {HTMLElement} Modal element
 */
function createConflictModal(conflict, index) {
  const modal = document.createElement('div');
  modal.className = 'conflict-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Resolve Conflict</h2>
        <button class="modal-close">
          <span class="material-icons">close</span>
        </button>
      </div>
      
      <div class="modal-body">
        <div class="conflict-info">
          <h3>${conflict.local.title || conflict.remote.title || 'Untitled Bookmark'}</h3>
          <p class="conflict-url">${conflict.local.url || conflict.remote.url || 'No URL'}</p>
        </div>
        
        <div class="conflict-comparison">
          <div class="comparison-column">
            <h4>Local Version</h4>
            <div class="version-details">
              <p><strong>Title:</strong> ${conflict.local.title || 'No title'}</p>
              <p><strong>URL:</strong> ${conflict.local.url || 'No URL'}</p>
              <p><strong>Modified:</strong> ${formatDate(conflict.local.dateModified)}</p>
              <p><strong>Folder:</strong> ${getFolderName(conflict.local.parentId)}</p>
            </div>
          </div>
          
          <div class="comparison-column">
            <h4>Remote Version</h4>
            <div class="version-details">
              <p><strong>Title:</strong> ${conflict.remote.title || 'No title'}</p>
              <p><strong>URL:</strong> ${conflict.remote.url || 'No URL'}</p>
              <p><strong>Modified:</strong> ${formatDate(conflict.remote.dateModified)}</p>
              <p><strong>Folder:</strong> ${getFolderName(conflict.remote.parentId)}</p>
            </div>
          </div>
        </div>
        
        <div class="resolution-options">
          <h4>Choose Resolution Strategy</h4>
          <div class="resolution-buttons">
            <button class="resolve-btn resolve-local">
              <span class="material-icons">computer</span>
              <span>Keep Local</span>
            </button>
            <button class="resolve-btn resolve-remote">
              <span class="material-icons">cloud</span>
              <span>Keep Remote</span>
            </button>
            <button class="resolve-btn resolve-merge">
              <span class="material-icons">merge</span>
              <span>Smart Merge</span>
            </button>
            <button class="resolve-btn resolve-skip">
              <span class="material-icons">skip_next</span>
              <span>Skip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return modal;
}

/**
 * Resolve a specific conflict
 * @param {number} index - Conflict index
 * @param {string} strategy - Resolution strategy
 */
function resolveConflictByIndex(index, strategy) {
  if (index < 0 || index >= conflicts.length) return;

  const conflict = conflicts[index];
  const resolution = resolveConflicts([conflict], strategy);
  
  if (resolution.resolvedCount > 0) {
    resolvedConflicts.push(index);
    updateConflictList();
    updateProgress();
    
    // Show success message
    showToast(`Conflict resolved using ${strategy} strategy`, 'success');
  }
}

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleString();
}

/**
 * Get folder name by ID
 * @param {string} folderId - Folder ID
 * @returns {string} Folder name
 */
function getFolderName(folderId) {
  // This would need to be implemented to fetch folder names
  // For now, return a placeholder
  return folderId === '0' ? 'Bookmarks Bar' : `Folder ${folderId}`;
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Toast type (success, error, warning)
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  const container = document.getElementById('toast-container') || document.body;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
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
 * Show loading state
 * @param {boolean} loading - Whether to show loading
 */
function showLoading(loading) {
  const loadingEl = document.getElementById('loading-indicator');
  if (loadingEl) {
    loadingEl.style.display = loading ? 'block' : 'none';
  }
}

/**
 * Show error message
 * @param {string} message - Error message
 */
function showError(message) {
  showToast(message, 'error');
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
 * Toggle recommendations panel
 */
function toggleRecommendationsPanel() {
  const panel = document.getElementById('recommendations-panel');
  if (panel) {
    panel.classList.toggle('expanded');
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
