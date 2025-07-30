/**
 * Sync Analytics Module
 * Tracks sync performance and generates timeline graphs
 */

// Storage keys
const ANALYTICS_KEYS = {
  ENABLED: 'bookDriveAnalyticsEnabled',
  SYNC_HISTORY: 'bookDriveSyncHistory',
  PERFORMANCE_METRICS: 'bookDrivePerformanceMetrics',
  ERROR_LOG: 'bookDriveErrorLog',
};

/**
 * Analytics event types
 */
export const ANALYTICS_EVENTS = {
  SYNC_STARTED: 'sync_started',
  SYNC_COMPLETED: 'sync_completed',
  SYNC_FAILED: 'sync_failed',
  BACKUP_CREATED: 'backup_created',
  BACKUP_RESTORED: 'backup_restored',
  CONFLICT_RESOLVED: 'conflict_resolved',
  ERROR_OCCURRED: 'error_occurred',
};

/**
 * Record analytics event
 * @param {string} eventType - Type of event
 * @param {Object} data - Event data
 * @returns {Promise<void>}
 */
export async function recordEvent(eventType, data = {}) {
  try {
    // Check if analytics is enabled
    const result = await chrome.storage.local.get([ANALYTICS_KEYS.ENABLED]);
    if (!result[ANALYTICS_KEYS.ENABLED]) {
      return;
    }

    const event = {
      type: eventType,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      },
    };

    // Store event in sync history
    const historyResult = await chrome.storage.local.get([ANALYTICS_KEYS.SYNC_HISTORY]);
    const history = historyResult[ANALYTICS_KEYS.SYNC_HISTORY] || [];

    // Keep only last 1000 events
    history.push(event);
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    await chrome.storage.local.set({
      [ANALYTICS_KEYS.SYNC_HISTORY]: history,
    });

    console.log('Analytics event recorded:', event);
  } catch (error) {
    console.error('Failed to record analytics event:', error);
  }
}

/**
 * Get sync analytics data
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Analytics data
 */
export async function getSyncAnalytics(options = {}) {
  try {
    const { days = 30, eventType } = options;

    const result = await chrome.storage.local.get([
      ANALYTICS_KEYS.SYNC_HISTORY,
      ANALYTICS_KEYS.PERFORMANCE_METRICS,
    ]);

    const history = result[ANALYTICS_KEYS.SYNC_HISTORY] || [];
    const metrics = result[ANALYTICS_KEYS.PERFORMANCE_METRICS] || {};

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filteredHistory = history.filter((event) => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= cutoffDate;
    });

    // Filter by event type if specified
    const filteredEvents = eventType
      ? filteredHistory.filter((event) => event.type === eventType)
      : filteredHistory;

    // Generate analytics
    const analytics = {
      totalEvents: filteredEvents.length,
      eventCounts: countEvents(filteredEvents),
      performanceMetrics: calculatePerformanceMetrics(filteredEvents),
      timeline: generateTimeline(filteredEvents, days),
      errors: getErrorSummary(filteredEvents),
      recommendations: generateRecommendations(filteredEvents, metrics),
    };

    return analytics;
  } catch (error) {
    console.error('Failed to get sync analytics:', error);
    return {
      totalEvents: 0,
      eventCounts: {},
      performanceMetrics: {},
      timeline: [],
      errors: [],
      recommendations: [],
    };
  }
}

/**
 * Count events by type
 * @param {Array} events - Array of events
 * @returns {Object} Event counts
 */
function countEvents(events) {
  const counts = {};

  for (const event of events) {
    counts[event.type] = (counts[event.type] || 0) + 1;
  }

  return counts;
}

/**
 * Calculate performance metrics
 * @param {Array} events - Array of events
 * @returns {Object} Performance metrics
 */
function calculatePerformanceMetrics(events) {
  const syncEvents = events.filter(
    (e) => e.type === ANALYTICS_EVENTS.SYNC_STARTED || e.type === ANALYTICS_EVENTS.SYNC_COMPLETED,
  );

  const metrics = {
    totalSyncs: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    averageSyncTime: 0,
    syncTimes: [],
    successRate: 0,
  };

  // Group sync events by session
  const syncSessions = [];
  let currentSession = null;

  for (const event of syncEvents) {
    if (event.type === ANALYTICS_EVENTS.SYNC_STARTED) {
      currentSession = {
        startTime: new Date(event.timestamp),
        startData: event.data,
      };
    } else if (event.type === ANALYTICS_EVENTS.SYNC_COMPLETED && currentSession) {
      currentSession.endTime = new Date(event.timestamp);
      currentSession.endData = event.data;
      currentSession.duration = currentSession.endTime - currentSession.startTime;
      syncSessions.push(currentSession);
      currentSession = null;
    }
  }

  // Calculate metrics
  metrics.totalSyncs = syncSessions.length;
  metrics.successfulSyncs = syncSessions.length;
  metrics.failedSyncs = events.filter((e) => e.type === ANALYTICS_EVENTS.SYNC_FAILED).length;

  if (metrics.totalSyncs > 0) {
    metrics.syncTimes = syncSessions.map((s) => s.duration);
    metrics.averageSyncTime =
      metrics.syncTimes.reduce((a, b) => a + b, 0) / metrics.syncTimes.length;
    metrics.successRate =
      (metrics.successfulSyncs / (metrics.successfulSyncs + metrics.failedSyncs)) * 100;
  }

  return metrics;
}

/**
 * Generate timeline data
 * @param {Array} events - Array of events
 * @param {number} days - Number of days
 * @returns {Array} Timeline data
 */
function generateTimeline(events, days) {
  const timeline = [];
  const now = new Date();

  // Generate daily buckets
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayEvents = events.filter((event) => {
      const eventDate = new Date(event.timestamp);
      return eventDate >= date && eventDate < nextDate;
    });

    timeline.push({
      date: date.toISOString().split('T')[0],
      events: dayEvents.length,
      syncs: dayEvents.filter((e) => e.type === ANALYTICS_EVENTS.SYNC_COMPLETED).length,
      backups: dayEvents.filter((e) => e.type === ANALYTICS_EVENTS.BACKUP_CREATED).length,
      errors: dayEvents.filter((e) => e.type === ANALYTICS_EVENTS.ERROR_OCCURRED).length,
    });
  }

  return timeline;
}

/**
 * Get error summary
 * @param {Array} events - Array of events
 * @returns {Array} Error summary
 */
function getErrorSummary(events) {
  const errorEvents = events.filter((e) => e.type === ANALYTICS_EVENTS.ERROR_OCCURRED);

  const errorCounts = {};
  for (const event of errorEvents) {
    const errorType = event.data.errorType || 'unknown';
    errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
  }

  return Object.entries(errorCounts).map(([type, count]) => ({
    type,
    count,
    percentage: (count / errorEvents.length) * 100,
  }));
}

/**
 * Generate recommendations
 * @param {Array} events - Array of events
 * @param {Object} metrics - Performance metrics
 * @returns {Array} Recommendations
 */
function generateRecommendations(events, metrics) {
  const recommendations = [];

  // Analyze sync frequency
  const syncEvents = events.filter((e) => e.type === ANALYTICS_EVENTS.SYNC_COMPLETED);
  if (syncEvents.length < 5) {
    recommendations.push({
      type: 'info',
      message: 'Consider enabling auto-sync for more frequent synchronization',
      priority: 'low',
    });
  }

  // Analyze error rate
  const errorEvents = events.filter((e) => e.type === ANALYTICS_EVENTS.ERROR_OCCURRED);
  const errorRate = events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;

  if (errorRate > 10) {
    recommendations.push({
      type: 'warning',
      message: `High error rate detected (${errorRate.toFixed(1)}%). Check your network connection and Google Drive permissions.`,
      priority: 'high',
    });
  }

  // Analyze sync performance
  if (metrics.averageSyncTime > 30000) {
    // 30 seconds
    recommendations.push({
      type: 'info',
      message:
        'Sync operations are taking longer than expected. Consider optimizing your bookmark structure.',
      priority: 'medium',
    });
  }

  // Analyze backup frequency
  const backupEvents = events.filter((e) => e.type === ANALYTICS_EVENTS.BACKUP_CREATED);
  if (backupEvents.length === 0) {
    recommendations.push({
      type: 'info',
      message: 'No backups created recently. Consider setting up scheduled backups.',
      priority: 'medium',
    });
  }

  return recommendations;
}

/**
 * Export analytics data
 * @returns {Promise<Object>} Export data
 */
export async function exportAnalyticsData() {
  try {
    const result = await chrome.storage.local.get([
      ANALYTICS_KEYS.SYNC_HISTORY,
      ANALYTICS_KEYS.PERFORMANCE_METRICS,
      ANALYTICS_KEYS.ERROR_LOG,
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        syncHistory: result[ANALYTICS_KEYS.SYNC_HISTORY] || [],
        performanceMetrics: result[ANALYTICS_KEYS.PERFORMANCE_METRICS] || {},
        errorLog: result[ANALYTICS_KEYS.ERROR_LOG] || [],
      },
    };

    return {
      success: true,
      data: exportData,
      filename: `bookdrive-analytics-${new Date().toISOString().split('T')[0]}.json`,
    };
  } catch (error) {
    console.error('Failed to export analytics data:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

/**
 * Clear analytics data
 * @returns {Promise<Object>} Result
 */
export async function clearAnalyticsData() {
  try {
    await chrome.storage.local.remove([
      ANALYTICS_KEYS.SYNC_HISTORY,
      ANALYTICS_KEYS.PERFORMANCE_METRICS,
      ANALYTICS_KEYS.ERROR_LOG,
    ]);

    return {
      success: true,
      message: 'Analytics data cleared successfully',
    };
  } catch (error) {
    console.error('Failed to clear analytics data:', error);
    return {
      success: false,
      message: error.message,
    };
  }
}
