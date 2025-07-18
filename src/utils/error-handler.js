import { logAsyncDuration } from './perf.js';

/**
 * Centralized error handling utility
 */
export class ErrorHandler {
  /**
   * Log an error with optional context
   * @param {unknown} error - The error to log
   * @param {Object} context - Optional context for debugging
   */
  static log(error, context) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(`[${timestamp}] Error: ${errorMessage}`);

    if (context) {
      console.error('Error Context:', JSON.stringify(context, null, 2));
    }

    if (error instanceof Error && error.stack) {
      console.error('Stack Trace:', error.stack);
    }
  }

  /**
   * Wrap async functions with error handling
   * @param {Function} fn - Async function to wrap
   * @returns {Function} Wrapped function with error handling
   */
  static asyncWrapper(fn) {
    return async (...args) => {
      try {
        return await logAsyncDuration(fn.name, () => fn(...args));
      } catch (error) {
        this.log(error, { functionName: fn.name, args });
        throw error;
      }
    };
  }

  /**
   * Create a safe promise that always resolves
   * @param {Promise} promise - Promise to make safe
   * @returns {Promise<Object>} Promise that resolves with result or error
   */
  static async safePromise(promise) {
    try {
      const data = await promise;
      return { data };
    } catch (error) {
      this.log(error);
      return { error };
    }
  }
}

/**
 * Custom error classes for specific scenarios
 */
export class BookmarkSyncError extends Error {
  /**
   * @param {string} message
   * @param {Object} details
   */
  constructor(message, details) {
    super(message);
    this.name = 'BookmarkSyncError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
