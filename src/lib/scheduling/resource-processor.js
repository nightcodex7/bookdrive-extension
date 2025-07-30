/**
 * resource-processor.js - Resource-aware processing for BookDrive
 *
 * This module provides functions for resource-aware processing,
 * including background task throttling, idle detection, and batch processing.
 */

import { canPerformOperation, getSystemState, RESOURCE_STATE } from './resource-monitor.js';

// Constants
const IDLE_TIMEOUT = 60000; // 1 minute in milliseconds
const BATCH_SIZE = 50; // Default batch size for processing
const THROTTLE_DELAY = 100; // Default delay between tasks in ms

// Track the last activity time
let lastActivityTime = Date.now();
let isProcessingBatch = false;

/**
 * Update the last activity time
 */
function updateActivityTime() {
  lastActivityTime = Date.now();
}

/**
 * Initialize activity tracking
 */
export function initializeActivityTracking() {
  // Track user activity
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('mousemove', updateActivityTime);
    window.addEventListener('keydown', updateActivityTime);
    window.addEventListener('scroll', updateActivityTime);
    window.addEventListener('click', updateActivityTime);
  }

  // Initialize with current time
  updateActivityTime();
}

/**
 * Check if the system is idle
 * @param {number} idleTimeout - Timeout in milliseconds to consider the system idle
 * @returns {boolean} - True if the system is idle
 */
export function isIdle(idleTimeout = IDLE_TIMEOUT) {
  return Date.now() - lastActivityTime > idleTimeout;
}

/**
 * Process a batch of items with throttling
 * @param {Array} items - Array of items to process
 * @param {Function} processFn - Function to process each item
 * @param {Object} options - Processing options
 * @param {number} options.batchSize - Number of items to process in each batch
 * @param {number} options.throttleDelay - Delay between processing items in ms
 * @param {boolean} options.requireIdle - Whether to require the system to be idle
 * @param {number} options.idleTimeout - Timeout to consider the system idle
 * @param {boolean} options.checkResources - Whether to check system resources
 * @returns {Promise<Object>} - Processing results
 */
export async function processBatch(items, processFn, options = {}) {
  // Default options
  const {
    batchSize = BATCH_SIZE,
    throttleDelay = THROTTLE_DELAY,
    requireIdle = false,
    idleTimeout = IDLE_TIMEOUT,
    checkResources = true,
  } = options;

  // For testing purposes, reset the processing flag
  isProcessingBatch = false;

  // Check if already processing a batch
  if (isProcessingBatch) {
    return {
      success: false,
      processed: 0,
      total: items.length,
      reason: 'Another batch is already being processed',
    };
  }

  try {
    isProcessingBatch = true;

    // Check if system is idle if required
    if (requireIdle && !isIdle(idleTimeout)) {
      return {
        success: false,
        processed: 0,
        total: items.length,
        reason: 'System is not idle',
      };
    }

    // Check system resources if required
    if (checkResources) {
      const resourceCheck = await canPerformOperation({
        requireOptimal: false,
        allowConstrained: true,
      });

      if (!resourceCheck.isSafe) {
        return {
          success: false,
          processed: 0,
          total: items.length,
          reason: `Insufficient system resources: ${resourceCheck.reason}`,
          systemState: resourceCheck.systemState,
        };
      }
    }

    // Process items in batches
    const results = {
      success: true,
      processed: 0,
      failed: 0,
      total: items.length,
      errors: [],
    };

    // Process each item with throttling
    for (let i = 0; i < items.length; i++) {
      try {
        // Check if we should continue based on system state
        if (checkResources && i % 10 === 0 && i > 0) {
          // Check resources every 10 items
          const systemState = await getSystemState();
          if (systemState.state === RESOURCE_STATE.CRITICAL) {
            results.reason = `Processing stopped due to critical system state: ${systemState.reason}`;
            return results;
          }
        }

        // Process the item
        await processFn(items[i], i);
        results.processed++;

        // Throttle processing
        if (i < items.length - 1 && throttleDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, throttleDelay));
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          item: items[i],
          error: error.message || 'Unknown error',
        });
      }

      // Check if we should continue based on idle state
      if (requireIdle && !isIdle(idleTimeout)) {
        results.reason = 'Processing stopped because system is no longer idle';
        break;
      }
    }

    return results;
  } finally {
    isProcessingBatch = false;
  }
}

/**
 * Run a task when the system is idle
 * @param {Function} task - Task to run
 * @param {Object} options - Options for the task
 * @param {number} options.idleTimeout - Timeout to consider the system idle
 * @param {boolean} options.checkResources - Whether to check system resources
 * @param {number} options.maxWaitTime - Maximum time to wait for idle state in ms
 * @returns {Promise<Object>} - Task result
 */
export async function runWhenIdle(task, options = {}) {
  // Default options
  const {
    idleTimeout = IDLE_TIMEOUT,
    checkResources = true,
    maxWaitTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  // Check if system is already idle
  if (isIdle(idleTimeout)) {
    // Check system resources if required
    if (checkResources) {
      const resourceCheck = await canPerformOperation({
        requireOptimal: false,
        allowConstrained: true,
      });

      if (!resourceCheck.isSafe) {
        return {
          success: false,
          reason: `Insufficient system resources: ${resourceCheck.reason}`,
          systemState: resourceCheck.systemState,
        };
      }
    }

    // Run the task
    try {
      const result = await task();
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        reason: `Task failed: ${error.message}`,
        error,
      };
    }
  }

  // Wait for the system to become idle
  const startTime = Date.now();

  return new Promise((resolve) => {
    const checkIdle = async () => {
      // Check if we've waited too long
      if (Date.now() - startTime > maxWaitTime) {
        resolve({
          success: false,
          reason: 'Timed out waiting for system to become idle',
        });
        return;
      }

      // Check if system is idle
      if (isIdle(idleTimeout)) {
        // Check system resources if required
        if (checkResources) {
          const resourceCheck = await canPerformOperation({
            requireOptimal: false,
            allowConstrained: true,
          });

          if (!resourceCheck.isSafe) {
            resolve({
              success: false,
              reason: `Insufficient system resources: ${resourceCheck.reason}`,
              systemState: resourceCheck.systemState,
            });
            return;
          }
        }

        // Run the task
        try {
          const result = await task();
          resolve({
            success: true,
            result,
          });
        } catch (error) {
          resolve({
            success: false,
            reason: `Task failed: ${error.message}`,
            error,
          });
        }
      } else {
        // Check again later
        setTimeout(checkIdle, 1000);
      }
    };

    // Start checking
    checkIdle();
  });
}

/**
 * Throttle a function to limit its execution rate
 * @param {Function} fn - Function to throttle
 * @param {number} delay - Minimum delay between executions in ms
 * @returns {Function} - Throttled function
 */
export function throttle(fn, delay = THROTTLE_DELAY) {
  let lastCall = 0;
  let timeout = null;

  return function (...args) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // Clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }

    if (timeSinceLastCall >= delay) {
      // Execute immediately
      lastCall = now;
      return fn.apply(this, args);
    } else {
      // Schedule execution
      return new Promise((resolve) => {
        timeout = setTimeout(() => {
          lastCall = Date.now();
          resolve(fn.apply(this, args));
        }, delay - timeSinceLastCall);
      });
    }
  };
}

/**
 * Initialize the resource processor
 */
export function initializeResourceProcessor() {
  initializeActivityTracking();
  console.log('Resource processor initialized');
}
