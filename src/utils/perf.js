/**
 * Performance Tracking Utility for BookDrive Extension
 * Provides advanced performance monitoring and logging capabilities
 */
export class PerformanceTracker {
  constructor() {
    this.logs = [];
    this.initializeLogging();
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new PerformanceTracker();
    }
    return this._instance;
  }

  async initializeLogging() {
    const isEnabled = await this.shouldLogPerf();
    if (!isEnabled) {
      console.warn('Performance logging is disabled.');
    }
  }

  /**
   * Check if performance logging is enabled
   * @returns {Promise<boolean>}
   */
  async shouldLogPerf() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get({ perfLogs: false }, ({ perfLogs }) => {
          resolve(!!perfLogs);
        });
      } else {
        resolve(false);
      }
    });
  }

  /**
   * Measure and log performance of an operation
   * @param {string} action Descriptive name of the action
   * @param {Function} operation Function to measure
   * @returns {Promise<any>}
   */
  async measure(action, operation) {
    if (!(await this.shouldLogPerf())) return operation();

    const start = performance.now();
    try {
      const result = await operation();
      const end = performance.now();

      this.logs.push({
        timestamp: Date.now(),
        action,
        duration: end - start,
        details: result,
      });

      console.log(`[Perf] ${action}: ${(end - start).toFixed(1)} ms`);
      return result;
    } catch (error) {
      this.logs.push({
        timestamp: Date.now(),
        action,
        duration: performance.now() - start,
        details: { error: String(error) },
      });
      throw error;
    }
  }

  /**
   * Log current memory usage
   * @returns {Promise<void>}
   */
  async logMemoryUsage() {
    if (!(await this.shouldLogPerf())) return;

    if (window.performance && performance.memory) {
      const mem = performance.memory;
      const log = {
        usedMB: (mem.usedJSHeapSize / 1048576).toFixed(2),
        totalMB: (mem.totalJSHeapSize / 1048576).toFixed(2),
        limitMB: (mem.jsHeapSizeLimit / 1048576).toFixed(2),
      };

      console.log('[Perf] Memory Usage:', log);
      this.logs.push({
        timestamp: Date.now(),
        action: 'Memory Usage',
        details: log,
      });
    }
  }

  /**
   * Get performance logs
   * @param {Object} filter
   * @returns {Array}
   */
  getLogs(filter) {
    let filteredLogs = [...this.logs];

    if (filter?.action) {
      filteredLogs = filteredLogs.filter((log) => log.action === filter.action);
    }

    if (filter?.limit) {
      filteredLogs = filteredLogs.slice(0, filter.limit);
    }

    return filteredLogs;
  }

  /**
   * Clear performance logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Singleton instance for easy import
export const perfTracker = PerformanceTracker.getInstance();

/**
 * Utility function to measure async operations with performance tracking
 * @param {string} label - Label for the operation
 * @param {Function} fn - Async function to measure
 * @returns {Promise<any>} Promise with the result of the function
 */
export async function logAsyncDuration(label, fn) {
  return perfTracker.measure(label, fn);
}
