// Performance utilities for BookDrive

/**
 * Returns a promise that resolves to true if performance logging is enabled in chrome.storage.sync.
 */
export async function shouldLogPerf(): Promise<boolean> {
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
 * Logs current memory usage (if available in the environment).
 */
export async function logMemoryUsage(label: string = 'Memory Usage'): Promise<void> {
  if (!(await shouldLogPerf())) return;
  if ((window as any).performance && (performance as any).memory) {
    const mem = (performance as any).memory;
    // Chrome only
    console.log(`[Perf] ${label}:`, {
      usedMB: (mem.usedJSHeapSize / 1048576).toFixed(2),
      totalMB: (mem.totalJSHeapSize / 1048576).toFixed(2),
      limitMB: (mem.jsHeapSizeLimit / 1048576).toFixed(2),
    });
  } else {
    console.log(`[Perf] ${label}: Memory usage not available in this environment.`);
  }
}

/**
 * Logs the duration of an async operation.
 * @param label Label for the operation
 * @param fn   Async function to benchmark
 */
export async function logAsyncDuration<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!(await shouldLogPerf())) return fn();
  const start = performance.now();
  try {
    const result = await fn();
    const end = performance.now();
    console.log(`[Perf] ${label}: ${(end - start).toFixed(1)} ms`);
    return result;
  } catch (e) {
    const end = performance.now();
    console.log(`[Perf] ${label} (FAILED): ${(end - start).toFixed(1)} ms`);
    throw e;
  }
}
