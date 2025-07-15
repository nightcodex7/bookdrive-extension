import { logAsyncDuration } from './perf';

/**
 * Centralized error handling utility
 */
export class ErrorHandler {
  /**
   * Log an error with optional context
   * @param error - The error to log
   * @param context - Optional context for debugging
   */
  static log(error: unknown, context?: Record<string, unknown>): void {
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
   * @param fn - Async function to wrap
   * @returns Wrapped function with error handling
   */
  static asyncWrapper<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await logAsyncDuration(() => fn(...args), fn.name);
      } catch (error) {
        this.log(error, { functionName: fn.name, args });
        throw error;
      }
    }) as T;
  }

  /**
   * Create a safe promise that always resolves
   * @param promise - Promise to make safe
   * @returns Promise that resolves with result or error
   */
  static async safePromise<T>(promise: Promise<T>): Promise<{ 
    data?: T, 
    error?: unknown 
  }> {
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
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = 'BookmarkSyncError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}
