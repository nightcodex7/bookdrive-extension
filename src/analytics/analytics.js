/**
 * BookDrive Analytics Page
 * Displays sync analytics with timeline graphs and logs
 */

import {
  getSyncAnalytics,
  exportAnalyticsData,
  clearAnalyticsData,
  ANALYTICS_EVENTS,
} from '../lib/analytics/sync-analytics.js';

// Chart.js instance
let timelineChart = null;

/**
 * Initialize the analytics page
 */
async function initializeAnalytics() {
  console.log('Initializing BookDrive Analytics...');

  try {
    // Set up event listeners
    setupEventListeners();

    // Load initial data
    await loadAnalyticsData();

    console.log('Analytics page initialized successfully');
  } catch (error) {
    console.error('Failed to initialize analytics:', error);
    showError('Failed to load analytics data. Please try again.');
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadAnalyticsData();
    });
  }

  // Export button
  const exportBtn = document.getElementById('export-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      await exportData();
    });
  }

  // Clear button
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      await clearData();
    });
  }

  // Timeline range selector
  const timelineRange = document.getElementById('timeline-range');
  if (timelineRange) {
    timelineRange.addEventListener('change', async () => {
      await loadAnalyticsData(parseInt(timelineRange.value));
    });
  }

  // Activity filter
  const activityFilter = document.getElementById('activity-filter');
  if (activityFilter) {
    activityFilter.addEventListener('change', () => {
      filterActivityList(activityFilter.value);
    });
  }
}

/**
 * Load analytics data
 * @param {number} days - Number of days to analyze
 */
async function loadAnalyticsData(days = 30) {
  try {
    showLoading(true);

    // Get analytics data
    const analytics = await getSyncAnalytics({ days });

    // Update overview cards
    updateOverviewCards(analytics);

    // Update timeline chart
    updateTimelineChart(analytics.timeline);

    // Update performance metrics
    updatePerformanceMetrics(analytics);

    // Update activity list
    updateActivityList(analytics);

    // Update recommendations
    updateRecommendations(analytics.recommendations);

    showLoading(false);
  } catch (error) {
    console.error('Failed to load analytics data:', error);
    showError('Failed to load analytics data. Please try again.');
    showLoading(false);
  }
}

/**
 * Update overview cards
 * @param {Object} analytics - Analytics data
 */
function updateOverviewCards(analytics) {
  // Total syncs
  const totalSyncsElement = document.getElementById('total-syncs');
  if (totalSyncsElement) {
    totalSyncsElement.textContent = analytics.performanceMetrics.totalSyncs || 0;
  }

  // Success rate
  const successRateElement = document.getElementById('success-rate');
  if (successRateElement) {
    const successRate = analytics.performanceMetrics.successRate || 0;
    successRateElement.textContent = `${successRate.toFixed(1)}%`;
  }

  // Average sync time
  const avgSyncTimeElement = document.getElementById('avg-sync-time');
  if (avgSyncTimeElement) {
    const avgTime = analytics.performanceMetrics.averageSyncTime || 0;
    avgSyncTimeElement.textContent = `${(avgTime / 1000).toFixed(1)}s`;
  }

  // Last sync
  const lastSyncElement = document.getElementById('last-sync');
  if (lastSyncElement) {
    const lastSync = analytics.performanceMetrics.lastSync;
    if (lastSync) {
      lastSyncElement.textContent = formatDate(new Date(lastSync));
    } else {
      lastSyncElement.textContent = 'Never';
    }
  }
}

/**
 * Update timeline chart
 * @param {Array} timelineData - Timeline data
 */
function updateTimelineChart(timelineData) {
  const ctx = document.getElementById('timeline-chart');
  if (!ctx) return;

  // Destroy existing chart
  if (timelineChart) {
    timelineChart.destroy();
  }

  // Prepare chart data
  const labels = timelineData.map((item) => formatDate(new Date(item.date)));
  const syncData = timelineData.map((item) => item.syncs);
  const backupData = timelineData.map((item) => item.backups);
  const errorData = timelineData.map((item) => item.errors);

  // Create new chart
  timelineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Syncs',
          data: syncData,
          borderColor: '#6750a4',
          backgroundColor: 'rgba(103, 80, 164, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Backups',
          data: backupData,
          borderColor: '#7d5260',
          backgroundColor: 'rgba(125, 82, 96, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Errors',
          data: errorData,
          borderColor: '#ba1a1a',
          backgroundColor: 'rgba(186, 26, 26, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    },
  });
}

/**
 * Update performance metrics
 * @param {Object} analytics - Analytics data
 */
function updatePerformanceMetrics(analytics) {
  const metrics = analytics.performanceMetrics;

  // Sync performance
  const fastSyncs = metrics.syncTimes?.filter((time) => time < 5000).length || 0;
  const mediumSyncs = metrics.syncTimes?.filter((time) => time >= 5000 && time < 30000).length || 0;
  const slowSyncs = metrics.syncTimes?.filter((time) => time >= 30000).length || 0;

  document.getElementById('fast-syncs').textContent = fastSyncs;
  document.getElementById('medium-syncs').textContent = mediumSyncs;
  document.getElementById('slow-syncs').textContent = slowSyncs;

  // Error analysis
  const errorEvents = analytics.errors || [];
  const networkErrors = errorEvents.filter((error) => error.type === 'network').length;
  const authErrors = errorEvents.filter((error) => error.type === 'auth').length;
  const otherErrors = errorEvents.length - networkErrors - authErrors;

  document.getElementById('network-errors').textContent = networkErrors;
  document.getElementById('auth-errors').textContent = authErrors;
  document.getElementById('other-errors').textContent = otherErrors;
}

/**
 * Update activity list
 * @param {Object} analytics - Analytics data
 */
function updateActivityList(analytics) {
  const activityList = document.getElementById('activity-list');
  if (!activityList) return;

  const events = analytics.recentEvents || [];

  if (events.length === 0) {
    activityList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📊</div>
        <h3>No Activity Yet</h3>
        <p>Start syncing your bookmarks to see activity here.</p>
      </div>
    `;
    return;
  }

  // Sort events by timestamp (newest first)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Take only the most recent 20 events
  const recentEvents = events.slice(0, 20);

  activityList.innerHTML = recentEvents.map((event) => createActivityItem(event)).join('');
}

/**
 * Create activity item HTML
 * @param {Object} event - Event data
 * @returns {string} HTML string
 */
function createActivityItem(event) {
  const icon = getEventIcon(event.type);
  const title = getEventTitle(event.type);
  const time = formatDate(new Date(event.timestamp));
  const details = getEventDetails(event);

  return `
    <div class="activity-item" data-event-type="${event.type}">
      <div class="activity-icon ${getEventIconClass(event.type)}">
        ${icon}
      </div>
      <div class="activity-content">
        <div class="activity-title">${title}</div>
        <div class="activity-time">${time}</div>
        ${details ? `<div class="activity-details">${details}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Get event icon
 * @param {string} eventType - Event type
 * @returns {string} Icon emoji
 */
function getEventIcon(eventType) {
  const icons = {
    [ANALYTICS_EVENTS.SYNC_STARTED]: '🔄',
    [ANALYTICS_EVENTS.SYNC_COMPLETED]: '✅',
    [ANALYTICS_EVENTS.SYNC_FAILED]: '❌',
    [ANALYTICS_EVENTS.BACKUP_CREATED]: '💾',
    [ANALYTICS_EVENTS.BACKUP_RESTORED]: '📥',
    [ANALYTICS_EVENTS.CONFLICT_RESOLVED]: '🔧',
    [ANALYTICS_EVENTS.ERROR_OCCURRED]: '⚠️',
  };
  return icons[eventType] || '📊';
}

/**
 * Get event icon class
 * @param {string} eventType - Event type
 * @returns {string} CSS class
 */
function getEventIconClass(eventType) {
  if (
    eventType === ANALYTICS_EVENTS.SYNC_COMPLETED ||
    eventType === ANALYTICS_EVENTS.BACKUP_CREATED
  ) {
    return 'success';
  } else if (
    eventType === ANALYTICS_EVENTS.SYNC_FAILED ||
    eventType === ANALYTICS_EVENTS.ERROR_OCCURRED
  ) {
    return 'error';
  }
  return 'info';
}

/**
 * Get event title
 * @param {string} eventType - Event type
 * @returns {string} Event title
 */
function getEventTitle(eventType) {
  const titles = {
    [ANALYTICS_EVENTS.SYNC_STARTED]: 'Sync Started',
    [ANALYTICS_EVENTS.SYNC_COMPLETED]: 'Sync Completed',
    [ANALYTICS_EVENTS.SYNC_FAILED]: 'Sync Failed',
    [ANALYTICS_EVENTS.BACKUP_CREATED]: 'Backup Created',
    [ANALYTICS_EVENTS.BACKUP_RESTORED]: 'Backup Restored',
    [ANALYTICS_EVENTS.CONFLICT_RESOLVED]: 'Conflict Resolved',
    [ANALYTICS_EVENTS.ERROR_OCCURRED]: 'Error Occurred',
  };
  return titles[eventType] || 'Unknown Event';
}

/**
 * Get event details
 * @param {Object} event - Event data
 * @returns {string} Event details
 */
function getEventDetails(event) {
  if (event.data) {
    const details = [];

    if (event.data.mode) {
      details.push(`Mode: ${event.data.mode}`);
    }

    if (event.data.bookmarkCount) {
      details.push(`${event.data.bookmarkCount} bookmarks`);
    }

    if (event.data.duration) {
      details.push(`Duration: ${(event.data.duration / 1000).toFixed(1)}s`);
    }

    if (event.data.error) {
      details.push(`Error: ${event.data.error}`);
    }

    return details.join(' • ');
  }
  return '';
}

/**
 * Update recommendations
 * @param {Array} recommendations - Recommendations array
 */
function updateRecommendations(recommendations) {
  const recommendationsList = document.getElementById('recommendations-list');
  if (!recommendationsList) return;

  if (!recommendations || recommendations.length === 0) {
    recommendationsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <h3>All Good!</h3>
        <p>No recommendations at this time. Your sync setup looks optimal.</p>
      </div>
    `;
    return;
  }

  recommendationsList.innerHTML = recommendations
    .map(
      (rec) => `
    <div class="recommendation-item ${rec.type}">
      <div class="recommendation-icon">
        ${rec.type === 'warning' ? '⚠️' : rec.type === 'error' ? '❌' : 'ℹ️'}
      </div>
      <div class="recommendation-content">
        <h4>${rec.message}</h4>
        <p>Priority: ${rec.priority}</p>
      </div>
    </div>
  `,
    )
    .join('');
}

/**
 * Filter activity list
 * @param {string} filter - Filter value
 */
function filterActivityList(filter) {
  const activityItems = document.querySelectorAll('.activity-item');

  activityItems.forEach((item) => {
    const eventType = item.dataset.eventType;

    if (filter === 'all') {
      item.style.display = 'flex';
    } else if (filter === 'sync' && eventType.includes('sync')) {
      item.style.display = 'flex';
    } else if (filter === 'backup' && eventType.includes('backup')) {
      item.style.display = 'flex';
    } else if (
      filter === 'error' &&
      (eventType.includes('failed') || eventType.includes('error'))
    ) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Export analytics data
 */
async function exportData() {
  try {
    const result = await exportAnalyticsData();

    if (result.success) {
      // Create download link
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showSuccess('Analytics data exported successfully');
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Failed to export analytics data:', error);
    showError('Failed to export analytics data. Please try again.');
  }
}

/**
 * Clear analytics data
 */
async function clearData() {
  if (
    !confirm('Are you sure you want to clear all analytics data? This action cannot be undone.')
  ) {
    return;
  }

  try {
    const result = await clearAnalyticsData();

    if (result.success) {
      showSuccess('Analytics data cleared successfully');
      await loadAnalyticsData();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Failed to clear analytics data:', error);
    showError('Failed to clear analytics data. Please try again.');
  }
}

/**
 * Show loading state
 * @param {boolean} loading - Loading state
 */
function showLoading(loading) {
  const container = document.querySelector('.analytics-container');
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
document.addEventListener('DOMContentLoaded', initializeAnalytics);
