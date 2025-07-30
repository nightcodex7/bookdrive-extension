/**
 * Read Later Interface
 * Manages saved articles for offline reading
 */

import {
  saveForLater,
  getSavedPages,
  updateSavedPageStatus,
  deleteSavedPage,
  // addTagsToSavedPage, // Removed unused import
  getReadingStats,
} from '../lib/bookmarks.js';

// Global state
let savedArticles = [];
let currentFilters = {
  status: '',
  tags: '',
  search: '',
  sort: 'date',
};

/**
 * Initialize the read later interface
 */
async function initializeReadLater() {
  console.log('Initializing Read Later interface...');

  try {
    // Set up event listeners
    setupEventListeners();

    // Load initial data
    await loadSavedArticles();
    await updateStatistics();

    console.log('Read Later interface initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Read Later interface:', error);
    showToast('Failed to load saved articles', 'error');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Header buttons
  const addCurrentPageBtn = document.getElementById('add-current-page-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const addFirstArticleBtn = document.getElementById('add-first-article-btn');

  if (addCurrentPageBtn) {
    addCurrentPageBtn.addEventListener('click', handleAddCurrentPage);
  }
  if (settingsBtn) {
    settingsBtn.addEventListener('click', handleSettings);
  }
  if (addFirstArticleBtn) {
    addFirstArticleBtn.addEventListener('click', handleAddCurrentPage);
  }

  // Search and filters
  const searchInput = document.getElementById('search-input');
  const statusFilter = document.getElementById('status-filter');
  const tagFilter = document.getElementById('tag-filter');
  const sortFilter = document.getElementById('sort-filter');

  if (searchInput) {
    searchInput.addEventListener('input', handleSearch);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', handleFilterChange);
  }
  if (tagFilter) {
    tagFilter.addEventListener('change', handleFilterChange);
  }
  if (sortFilter) {
    sortFilter.addEventListener('change', handleFilterChange);
  }

  // Modal events
  const modalClose = document.getElementById('modal-close');
  const addModalClose = document.getElementById('add-modal-close');
  const saveArticleBtn = document.getElementById('save-article-btn');
  const cancelSaveBtn = document.getElementById('cancel-save-btn');

  if (modalClose) {
    modalClose.addEventListener('click', closeArticleModal);
  }
  if (addModalClose) {
    addModalClose.addEventListener('click', closeAddModal);
  }
  if (saveArticleBtn) {
    saveArticleBtn.addEventListener('click', handleSaveArticle);
  }
  if (cancelSaveBtn) {
    cancelSaveBtn.addEventListener('click', closeAddModal);
  }

  // Article modal actions
  const openArticleBtn = document.getElementById('open-article-btn');
  const markReadBtn = document.getElementById('mark-read-btn');
  const editArticleBtn = document.getElementById('edit-article-btn');

  if (openArticleBtn) {
    openArticleBtn.addEventListener('click', handleOpenArticle);
  }
  if (markReadBtn) {
    markReadBtn.addEventListener('click', handleMarkAsRead);
  }
  if (editArticleBtn) {
    editArticleBtn.addEventListener('click', handleEditArticle);
  }

  // Close modals on backdrop click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      closeArticleModal();
      closeAddModal();
    }
  });
}

/**
 * Load saved articles
 */
async function loadSavedArticles() {
  try {
    showLoading(true);

    const filters = {
      status: currentFilters.status || undefined,
      tags: currentFilters.tags ? [currentFilters.tags] : undefined,
      search: currentFilters.search || undefined,
    };

    savedArticles = await getSavedPages(filters);

    // Apply sorting
    sortArticles();

    // Update UI
    updateArticlesList();
    updateTagFilter();

    showLoading(false);
  } catch (error) {
    console.error('Failed to load saved articles:', error);
    showToast('Failed to load saved articles', 'error');
    showLoading(false);
  }
}

/**
 * Sort articles based on current sort filter
 */
function sortArticles() {
  switch (currentFilters.sort) {
    case 'title':
      savedArticles.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'reading-time':
      savedArticles.sort((a, b) => (b.readingTime || 0) - (a.readingTime || 0));
      break;
    case 'date':
    default:
      savedArticles.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      break;
  }
}

/**
 * Update articles list in UI
 */
function updateArticlesList() {
  const articlesList = document.getElementById('articles-list');
  const emptyState = document.getElementById('empty-state');

  if (!articlesList) return;

  if (savedArticles.length === 0) {
    articlesList.style.display = 'none';
    if (emptyState) {
      emptyState.style.display = 'block';
    }
    return;
  }

  articlesList.style.display = 'block';
  if (emptyState) {
    emptyState.style.display = 'none';
  }

  articlesList.innerHTML = savedArticles
    .map(
      (article) => `
    <div class="article-item" data-id="${article.id}">
      <img src="${article.favicon || '../assets/icon16.png'}" alt="" class="article-favicon" onerror="this.src='../assets/icon16.png'">
      <div class="article-content">
        <div class="article-title">${escapeHtml(article.title)}</div>
        <div class="article-url">${escapeHtml(article.url)}</div>
        <div class="article-meta">
          <span class="article-status ${article.status}">${article.status}</span>
          <span>${formatDate(article.savedAt)}</span>
          ${article.readingTime ? `<span>${formatReadingTime(article.readingTime)}</span>` : ''}
          ${article.tags.length > 0 ? `<span>${article.tags.join(', ')}</span>` : ''}
        </div>
      </div>
      <div class="article-actions">
        <button class="article-action-btn" onclick="handleArticleAction('${article.id}', 'view')" title="View">
          <span class="material-icons">visibility</span>
        </button>
        <button class="article-action-btn" onclick="handleArticleAction('${article.id}', 'edit')" title="Edit">
          <span class="material-icons">edit</span>
        </button>
        <button class="article-action-btn" onclick="handleArticleAction('${article.id}', 'delete')" title="Delete">
          <span class="material-icons">delete</span>
        </button>
      </div>
    </div>
  `,
    )
    .join('');

  // Add click handlers for article items
  const articleItems = document.querySelectorAll('.article-item');
  articleItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.article-action-btn')) {
        const articleId = item.dataset.id;
        openArticleModal(articleId);
      }
    });
  });
}

/**
 * Update tag filter options
 */
function updateTagFilter() {
  const tagFilter = document.getElementById('tag-filter');
  if (!tagFilter) return;

  // Get all unique tags
  const allTags = new Set();
  savedArticles.forEach((article) => {
    article.tags.forEach((tag) => allTags.add(tag));
  });

  // Update tag filter options
  const currentValue = tagFilter.value;
  tagFilter.innerHTML = '<option value="">All Tags</option>';

  Array.from(allTags)
    .sort()
    .forEach((tag) => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      tagFilter.appendChild(option);
    });

  tagFilter.value = currentValue;
}

/**
 * Update statistics
 */
async function updateStatistics() {
  try {
    const stats = await getReadingStats();

    document.getElementById('total-count').textContent = stats.total;
    document.getElementById('unread-count').textContent = stats.unread;
    document.getElementById('read-count').textContent = stats.read;
    document.getElementById('reading-time').textContent = formatReadingTime(stats.totalReadingTime);
  } catch (error) {
    console.error('Failed to update statistics:', error);
  }
}

/**
 * Handle add current page
 */
async function handleAddCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showToast('No active tab found', 'error');
      return;
    }

    // Pre-fill the add modal
    document.getElementById('article-title').value = tab.title || '';
    document.getElementById('article-url').value = tab.url || '';

    openAddModal();
  } catch (error) {
    console.error('Failed to get current tab:', error);
    showToast('Failed to get current page', 'error');
  }
}

/**
 * Handle settings
 */
function handleSettings() {
  chrome.tabs.create({
    url: chrome.runtime.getURL('src/options/options.html#read-later'),
  });
}

/**
 * Handle search
 */
function handleSearch(event) {
  currentFilters.search = event.target.value;
  loadSavedArticles();
}

/**
 * Handle filter change
 */
function handleFilterChange(event) {
  const filterType = event.target.id.replace('-filter', '');
  currentFilters[filterType] = event.target.value;
  loadSavedArticles();
}

/**
 * Handle save article
 */
async function handleSaveArticle() {
  try {
    const title = document.getElementById('article-title').value.trim();
    const url = document.getElementById('article-url').value.trim();
    const tags = document.getElementById('article-tags').value.trim();
    const notes = document.getElementById('article-notes').value.trim();

    if (!title || !url) {
      showToast('Title and URL are required', 'warning');
      return;
    }

    const options = {
      title,
      tags: tags ? tags.split(',').map((t) => t.trim()) : [],
      notes,
    };

    await saveForLater(url, options);

    closeAddModal();
    await loadSavedArticles();
    await updateStatistics();

    showToast('Article saved successfully', 'success');
  } catch (error) {
    console.error('Failed to save article:', error);
    showToast('Failed to save article', 'error');
  }
}

/**
 * Handle article actions
 */
function handleArticleAction(articleId, action) {
  event.stopPropagation();

  switch (action) {
    case 'view':
      openArticleModal(articleId);
      break;
    case 'edit':
      handleEditArticle(articleId);
      break;
    case 'delete':
      handleDeleteArticle(articleId);
      break;
  }
}

/**
 * Open article modal
 */
function openArticleModal(articleId) {
  const article = savedArticles.find((a) => a.id === articleId);
  if (!article) return;

  // Populate modal
  document.getElementById('modal-title').textContent = article.title;
  document.getElementById('modal-date').textContent = formatDate(article.savedAt);
  document.getElementById('modal-reading-time').textContent = article.readingTime
    ? formatReadingTime(article.readingTime)
    : 'Unknown';
  document.getElementById('modal-tags').textContent = article.tags.join(', ') || 'No tags';
  document.getElementById('modal-excerpt').textContent = article.excerpt || 'No excerpt available';

  // Store current article ID
  document.getElementById('article-modal').dataset.articleId = articleId;

  // Show modal
  document.getElementById('article-modal').style.display = 'flex';
}

/**
 * Close article modal
 */
function closeArticleModal() {
  document.getElementById('article-modal').style.display = 'none';
}

/**
 * Open add modal
 */
function openAddModal() {
  document.getElementById('add-article-modal').style.display = 'flex';
}

/**
 * Close add modal
 */
function closeAddModal() {
  document.getElementById('add-article-modal').style.display = 'none';

  // Clear form
  document.getElementById('article-title').value = '';
  document.getElementById('article-url').value = '';
  document.getElementById('article-tags').value = '';
  document.getElementById('article-notes').value = '';
}

/**
 * Handle open article
 */
function handleOpenArticle() {
  const articleId = document.getElementById('article-modal').dataset.articleId;
  const article = savedArticles.find((a) => a.id === articleId);

  if (article) {
    chrome.tabs.create({ url: article.url });
    closeArticleModal();
  }
}

/**
 * Handle mark as read
 */
async function handleMarkAsRead() {
  const articleId = document.getElementById('article-modal').dataset.articleId;

  try {
    await updateSavedPageStatus(articleId, 'read');
    closeArticleModal();
    await loadSavedArticles();
    await updateStatistics();
    showToast('Article marked as read', 'success');
  } catch (error) {
    console.error('Failed to mark article as read:', error);
    showToast('Failed to update article status', 'error');
  }
}

/**
 * Handle edit article
 */
function handleEditArticle(articleId) {
  const article = savedArticles.find((a) => a.id === articleId);
  if (!article) return;

  // Pre-fill the add modal
  document.getElementById('article-title').value = article.title;
  document.getElementById('article-url').value = article.url;
  document.getElementById('article-tags').value = article.tags.join(', ');
  document.getElementById('article-notes').value = article.notes || '';

  closeArticleModal();
  openAddModal();
}

/**
 * Handle delete article
 */
async function handleDeleteArticle(articleId) {
  if (!confirm('Are you sure you want to delete this article?')) {
    return;
  }

  try {
    await deleteSavedPage(articleId);
    await loadSavedArticles();
    await updateStatistics();
    showToast('Article deleted successfully', 'success');
  } catch (error) {
    console.error('Failed to delete article:', error);
    showToast('Failed to delete article', 'error');
  }
}

/**
 * Show loading state
 */
function showLoading(loading) {
  const loadingState = document.getElementById('loading-state');
  const articlesList = document.getElementById('articles-list');

  if (loading) {
    if (loadingState) loadingState.style.display = 'block';
    if (articlesList) articlesList.style.display = 'none';
  } else {
    if (loadingState) loadingState.style.display = 'none';
    if (articlesList) articlesList.style.display = 'block';
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  const container = document.getElementById('toast-container');
  if (container) {
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
}

/**
 * Format date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const oneDay = 24 * 60 * 60 * 1000;

  if (diff < oneDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diff < 7 * oneDay) {
    return date.toLocaleDateString([], { weekday: 'short' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

/**
 * Format reading time
 */
function formatReadingTime(minutes) {
  if (!minutes) return '0m';

  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeReadLater);

// Make functions globally available for onclick handlers
window.handleArticleAction = handleArticleAction;
