/**
 * Performance Tracking Utility for BookDrive Extension
 * Provides advanced performance monitoring and logging capabilities
 */
export class PerformanceTracker {
  private static instance: PerformanceTracker;
  private logs: Array<{
    timestamp: number;
    action: string;
    duration?: number;
    details?: any;
  }> = [];

  private constructor() {
    this.initializeLogging();
  }

  public static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  private async initializeLogging() {
    const isEnabled = await this.shouldLogPerf();
    if (!isEnabled) {
      console.warn('Performance logging is disabled.');
    }
  }

  /**
   * Check if performance logging is enabled
   */
  private async shouldLogPerf(): Promise<boolean> {
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
   * @param action Descriptive name of the action
   * @param operation Function to measure
   */
  async measure<T>(action: string, operation: () => Promise<T>): Promise<T> {
    if (!(await this.shouldLogPerf())) return operation();

    const start = performance.now();
    try {
      const result = await operation();
      const end = performance.now();
      
      this.logs.push({
        timestamp: Date.now(),
        action,
        duration: end - start,
        details: result
      });

      console.log(`[Perf] ${action}: ${(end - start).toFixed(1)} ms`);
      return result;
    } catch (error) {
      this.logs.push({
        timestamp: Date.now(),
        action,
        duration: performance.now() - start,
        details: { error: String(error) }
      });
      throw error;
    }
  }

  /**
   * Log current memory usage
   */
  async logMemoryUsage(): Promise<void> {
    if (!(await this.shouldLogPerf())) return;

    if ((window as any).performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      const log = {
        usedMB: (mem.usedJSHeapSize / 1048576).toFixed(2),
        totalMB: (mem.totalJSHeapSize / 1048576).toFixed(2),
        limitMB: (mem.jsHeapSizeLimit / 1048576).toFixed(2)
      };
      
      console.log('[Perf] Memory Usage:', log);
      this.logs.push({
        timestamp: Date.now(),
        action: 'Memory Usage',
        details: log
      });
    }
  }

  /**
   * Get performance logs
   */
  getLogs(filter?: { action?: string, limit?: number }) {
    let filteredLogs = [...this.logs];
    
    if (filter?.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filter.action);
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
    console.log(`[Perf] ${label} (FAILED): ${(end - start).toFixed(1)} ms`);
    throw e;
  }
}
