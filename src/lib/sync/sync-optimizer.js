/**
 * sync-optimizer.js - Optimization strategies for bookmark synchronization
 *
 * This module provides functions for optimizing bookmark synchronization,
 * including incremental sync algorithms, delta compression, and smart retry mechanisms.
 */

import { canPerformOperation } from '../scheduling/resource-monitor.js';
import { processBatch, runWhenIdle } from '../scheduling/resource-processor.js';

// Constants
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_BASE = 1000; // Base delay in milliseconds
const BATCH_SIZE = 100; // Default batch size for bookmark processing
const OFFLINE_QUEUE_KEY = 'sync_offline_queue';
const SYNC_CACHE_KEY = 'sync_cache';

/**
 * Calculate the difference between two bookmark trees
 * @param {Array} sourceTree - Source bookmark tree
 * @param {Array} targetTree - Target bookmark tree
 * @returns {Object} - Differences between the trees
 */
export function calculateDelta(sourceTree, targetTree) {
  // Convert target tree to a map for faster lookups
  const targetMap = new Map();
  flattenBookmarks(targetTree).forEach((bookmark) => {
    targetMap.set(bookmark.id, bookmark);
  });

  // Find added, modified, and unchanged bookmarks
  const added = [];
  const modified = [];
  const unchanged = [];
  const sourceFlat = flattenBookmarks(sourceTree);

  sourceFlat.forEach((sourceBookmark) => {
    const targetBookmark = targetMap.get(sourceBookmark.id);

    if (!targetBookmark) {
      // Bookmark doesn't exist in target, so it's new
      added.push(sourceBookmark);
    } else if (!areBookmarksEqual(sourceBookmark, targetBookmark)) {
      // Bookmark exists but has changed
      modified.push({
        source: sourceBookmark,
        target: targetBookmark,
        changes: getBookmarkChanges(sourceBookmark, targetBookmark),
      });
    } else {
      // Bookmark exists and is unchanged
      unchanged.push(sourceBookmark);
    }

    // Remove from target map to track what's left (deleted)
    targetMap.delete(sourceBookmark.id);
  });

  // Remaining bookmarks in target map are deleted in source
  const deleted = Array.from(targetMap.values());

  return {
    added,
    modified,
    deleted,
    unchanged,
    total: sourceFlat.length,
    changes: added.length + modified.length + deleted.length,
  };
}

/**
 * Apply delta changes to a bookmark tree
 * @param {Array} currentTree - Current bookmark tree
 * @param {Object} delta - Delta changes to apply
 * @param {Function} applyFn - Function to apply changes
 * @returns {Promise<Object>} - Result of applying changes
 */
export async function applyDelta(currentTree, delta, applyFn) {
  const operations = [];

  // Add deletions first
  delta.deleted.forEach((bookmark) => {
    operations.push({ type: 'delete', item: bookmark });
  });

  // Add modifications
  delta.modified.forEach((mod) => {
    operations.push({ type: 'modify', item: mod });
  });

  // Add additions
  delta.added.forEach((bookmark) => {
    operations.push({ type: 'add', item: bookmark });
  });

  // Process operations in batches
  const result = await processBatch(operations, applyFn);

  return {
    success: result.success,
    applied: result.processed,
    failed: result.failed,
    errors: result.errors || [],
  };
}

/**
 * Compress bookmark data using dictionary compression
 * @param {Object} data - Bookmark data to compress
 * @returns {Object} - Compressed data with dictionary
 */
export function compressBookmarkData(data) {
  const dictionary = new Set();
  const commonStrings = [];

  // Extract common strings
  function extractStrings(obj) {
    if (typeof obj === 'string') {
      if (obj.length > 3) {
        // Only compress strings longer than 3 chars
        commonStrings.push(obj);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(extractStrings);
    }
  }

  extractStrings(data);

  // Create dictionary from most common strings
  const stringCount = {};
  commonStrings.forEach((str) => {
    stringCount[str] = (stringCount[str] || 0) + 1;
  });

  const sortedStrings = Object.entries(stringCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50) // Limit dictionary size
    .map(([str]) => str);

  // Replace strings with references
  function replaceWithRefs(obj) {
    if (typeof obj === 'string') {
      const index = sortedStrings.indexOf(obj);
      return index >= 0 ? `$${index}` : obj;
    } else if (Array.isArray(obj)) {
      return obj.map(replaceWithRefs);
    } else if (typeof obj === 'object' && obj !== null) {
      const result = {};
      Object.entries(obj).forEach(([key, value]) => {
        result[key] = replaceWithRefs(value);
      });
      return result;
    }
    return obj;
  }

  return {
    dictionary: sortedStrings,
    data: replaceWithRefs(data),
  };
}

/**
 * Decompress bookmark data using dictionary
 * @param {Object} compressed - Compressed data with dictionary
 * @returns {Object} - Decompressed data
 */
export function decompressBookmarkData(compressed) {
  const { dictionary, data } = compressed;

  function replaceRefs(obj) {
    if (typeof obj === 'string' && obj.startsWith('$')) {
      const index = parseInt(obj.slice(1), 10);
      return dictionary[index] || obj;
    } else if (Array.isArray(obj)) {
      return obj.map(replaceRefs);
    } else if (typeof obj === 'object' && obj !== null) {
      const result = {};
      Object.entries(obj).forEach(([key, value]) => {
        result[key] = replaceRefs(value);
      });
      return result;
    }
    return obj;
  }

  return replaceRefs(data);
}

/**
 * Compress delta data for efficient transfer
 * @param {Object} delta - Delta data
 * @returns {Object} - Compressed delta
 */
export function compressDelta(delta) {
  // Create a compressed representation of the delta
  const compressed = {
    a: delta.added.map((bookmark) => ({
      t: bookmark.title,
      u: bookmark.url,
      p: bookmark.parentId,
      d: bookmark.dateAdded,
    })),
    m: delta.modified.map((mod) => ({
      i: mod.source.id,
      c: mod.changes,
    })),
    d: delta.deleted.map((bookmark) => bookmark.id),
    s: {
      total: delta.total,
      changes: delta.changes,
      timestamp: Date.now(),
    },
  };

  return compressed;
}

/**
 * Decompress delta data
 * @param {Object} compressedDelta - Compressed delta data
 * @returns {Object} - Decompressed delta
 */
export function decompressDelta(compressedDelta) {
  const delta = {
    added: compressedDelta.a.map((bookmark) => ({
      id: generateBookmarkId(),
      title: bookmark.t,
      url: bookmark.u,
      parentId: bookmark.p,
      dateAdded: bookmark.d,
      dateGroupModified: Date.now(),
    })),
    modified: compressedDelta.m.map((mod) => ({
      source: { id: mod.i },
      target: { id: mod.i },
      changes: mod.c,
    })),
    deleted: compressedDelta.d,
    unchanged: [],
    total: compressedDelta.s.total,
    changes: compressedDelta.s.changes,
  };

  return delta;
}

/**
 * Smart retry mechanism with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise<Object>} - Operation result
 */
export async function smartRetry(operation, options = {}) {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    baseDelay = RETRY_DELAY_BASE,
    maxDelay = 30000, // 30 seconds
    backoffMultiplier = 2,
    jitter = 0.1, // 10% jitter
  } = options;

  let lastError;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      // Check system resources before attempting
      const resourceCheck = await canPerformOperation({
        checkNetwork: true,
        checkBattery: true,
        allowConstrained: true,
      });

      if (!resourceCheck.isSafe) {
        throw new Error(`System resources not available: ${resourceCheck.reason}`);
      }

      const result = await operation();
      return {
        success: true,
        result,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = error;
      attempt++;

      if (attempt >= maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      const jitterAmount = delay * jitter * (Math.random() - 0.5);
      const finalDelay = delay + jitterAmount;

      console.log(`Retry attempt ${attempt} failed, retrying in ${finalDelay}ms:`, error.message);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, finalDelay));
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: attempt,
  };
}

/**
 * Offline queue management
 * @param {Object} syncOperation - Sync operation to queue
 * @returns {Promise<Object>} - Queue result
 */
export async function queueOfflineOperation(syncOperation) {
  try {
    const queue = await getOfflineQueue();

    const queuedOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation: syncOperation,
      timestamp: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3,
    };

    queue.push(queuedOperation);

    // Keep only last 50 operations
    if (queue.length > 50) {
      queue.splice(0, queue.length - 50);
    }

    await saveOfflineQueue(queue);

    return {
      success: true,
      operationId: queuedOperation.id,
      queueLength: queue.length,
    };
  } catch (error) {
    console.error('Failed to queue offline operation:', error);
    throw error;
  }
}

/**
 * Process offline queue when connection is restored
 * @returns {Promise<Object>} - Processing result
 */
export async function processOfflineQueue() {
  try {
    const queue = await getOfflineQueue();

    if (queue.length === 0) {
      return {
        success: true,
        processed: 0,
        message: 'No offline operations to process',
      };
    }

    let processed = 0;
    let failed = 0;
    const errors = [];

    // Process operations in batches
    const batchSize = 10;
    for (let i = 0; i < queue.length; i += batchSize) {
      const batch = queue.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(async (operation) => {
          try {
            const result = await smartRetry(() => executeSyncOperation(operation.operation), {
              maxAttempts: operation.maxAttempts,
              baseDelay: RETRY_DELAY_BASE,
            });

            if (result.success) {
              processed++;
              return { success: true, operationId: operation.id };
            } else {
              failed++;
              errors.push({
                operationId: operation.id,
                error: result.error.message,
              });
              return { success: false, operationId: operation.id, error: result.error };
            }
          } catch (error) {
            failed++;
            errors.push({
              operationId: operation.id,
              error: error.message,
            });
            return { success: false, operationId: operation.id, error };
          }
        }),
      );

      // Remove processed operations from queue
      const successfulOperations = batchResults
        .filter((result) => result.status === 'fulfilled' && result.value.success)
        .map((result) => result.value.operationId);

      queue.splice(i, batch.length);
      i -= batch.length; // Adjust index since we removed items
    }

    await saveOfflineQueue(queue);

    return {
      success: true,
      processed,
      failed,
      errors,
      remainingInQueue: queue.length,
    };
  } catch (error) {
    console.error('Failed to process offline queue:', error);
    throw error;
  }
}

/**
 * Execute a sync operation
 * @param {Object} operation - Sync operation
 * @returns {Promise<Object>} - Operation result
 */
async function executeSyncOperation(operation) {
  // Import sync service dynamically to avoid circular dependencies
  const { performRealSync } = await import('./sync-service.js');

  return await performRealSync(operation.mode, operation.options);
}

/**
 * Get offline queue from storage
 * @returns {Promise<Array>} - Offline queue
 */
async function getOfflineQueue() {
  try {
    const result = await chrome.storage.local.get({ [OFFLINE_QUEUE_KEY]: [] });
    return result[OFFLINE_QUEUE_KEY];
  } catch (error) {
    console.error('Failed to get offline queue:', error);
    return [];
  }
}

/**
 * Save offline queue to storage
 * @param {Array} queue - Offline queue
 */
async function saveOfflineQueue(queue) {
  try {
    await chrome.storage.local.set({ [OFFLINE_QUEUE_KEY]: queue });
  } catch (error) {
    console.error('Failed to save offline queue:', error);
  }
}

/**
 * Optimize sync performance based on system state
 * @param {Object} syncOptions - Sync options
 * @returns {Promise<Object>} - Optimized sync options
 */
export async function optimizeSyncOptions(syncOptions) {
  try {
    // Get system state
    const systemState = await canPerformOperation({
      checkBattery: true,
      checkNetwork: true,
      checkPerformance: true,
    });

    const optimizedOptions = { ...syncOptions };

    // Adjust batch size based on system performance
    if (systemState.systemState.state === 'constrained') {
      optimizedOptions.batchSize = Math.max(10, (syncOptions.batchSize || BATCH_SIZE) / 2);
      optimizedOptions.throttleDelay = (syncOptions.throttleDelay || 0) * 2;
    } else if (systemState.systemState.state === 'optimal') {
      optimizedOptions.batchSize = Math.min(200, (syncOptions.batchSize || BATCH_SIZE) * 1.5);
      optimizedOptions.throttleDelay = Math.max(0, (syncOptions.throttleDelay || 0) / 2);
    }

    // Adjust retry strategy based on network conditions
    if (systemState.systemState.details.network) {
      const networkType = systemState.systemState.details.network.effectiveType;
      if (networkType === '2g' || networkType === 'slow-2g') {
        optimizedOptions.maxRetries = Math.min(
          3,
          optimizedOptions.maxRetries || MAX_RETRY_ATTEMPTS,
        );
        optimizedOptions.retryDelay = (optimizedOptions.retryDelay || RETRY_DELAY_BASE) * 2;
      }
    }

    // Adjust based on battery level
    if (systemState.systemState.details.battery) {
      const batteryLevel = systemState.systemState.details.battery.level;
      if (batteryLevel < 0.2) {
        optimizedOptions.batchSize = Math.max(5, optimizedOptions.batchSize / 4);
        optimizedOptions.throttleDelay = (optimizedOptions.throttleDelay || 0) * 4;
      }
    }

    return optimizedOptions;
  } catch (error) {
    console.error('Failed to optimize sync options:', error);
    return syncOptions;
  }
}

/**
 * Cache sync results for faster subsequent syncs
 * @param {Object} syncResult - Sync result
 * @param {string} syncMode - Sync mode
 */
export async function cacheSyncResult(syncResult, syncMode) {
  try {
    const cache = {
      lastSync: new Date().toISOString(),
      mode: syncMode,
      bookmarkCount: syncResult.bookmarkCount,
      changes: syncResult.changes,
      conflicts: syncResult.conflicts,
      hash: generateSyncHash(syncResult),
    };

    await chrome.storage.local.set({ [SYNC_CACHE_KEY]: cache });
  } catch (error) {
    console.error('Failed to cache sync result:', error);
  }
}

/**
 * Get cached sync result
 * @returns {Promise<Object|null>} - Cached sync result
 */
export async function getCachedSyncResult() {
  try {
    const result = await chrome.storage.local.get({ [SYNC_CACHE_KEY]: null });
    return result[SYNC_CACHE_KEY];
  } catch (error) {
    console.error('Failed to get cached sync result:', error);
    return null;
  }
}

/**
 * Perform optimized sync operation with retry and idle handling
 * @param {Function} syncOperation - The sync operation to perform
 * @param {Object} options - Options for the sync operation
 * @returns {Promise<any>} - Result of the sync operation
 */
export async function performOptimizedSync(syncOperation, options = {}) {
  const { requireIdle = false, maxRetries = MAX_RETRY_ATTEMPTS } = options;

  try {
    if (requireIdle) {
      return await runWhenIdle(syncOperation);
    }

    return await smartRetry(syncOperation, { maxAttempts: maxRetries });
  } catch (error) {
    console.error('Failed to perform sync operation:', error);
    throw new Error('Failed to perform sync operation');
  }
}

/**
 * Generate hash for sync result
 * @param {Object} syncResult - Sync result
 * @returns {string} - Hash
 */
function generateSyncHash(syncResult) {
  const data = JSON.stringify({
    bookmarkCount: syncResult.bookmarkCount,
    changes: syncResult.changes,
    timestamp: syncResult.timestamp,
  });

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString(36);
}

/**
 * Flatten a bookmark tree into an array
 * @param {Array} tree - Bookmark tree
 * @returns {Array} - Flattened array of bookmarks
 */
function flattenBookmarks(tree) {
  const bookmarks = [];

  function traverse(node) {
    if (node.url) {
      bookmarks.push(node);
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  tree.forEach(traverse);
  return bookmarks;
}

/**
 * Check if two bookmarks are equal
 * @param {Object} bookmark1 - First bookmark
 * @param {Object} bookmark2 - Second bookmark
 * @returns {boolean} - True if equal
 */
function areBookmarksEqual(bookmark1, bookmark2) {
  return (
    bookmark1.title === bookmark2.title &&
    bookmark1.url === bookmark2.url &&
    bookmark1.parentId === bookmark2.parentId &&
    bookmark1.dateAdded === bookmark2.dateAdded &&
    bookmark1.dateGroupModified === bookmark2.dateGroupModified
  );
}

/**
 * Get changes between two bookmarks
 * @param {Object} sourceBookmark - Source bookmark
 * @param {Object} targetBookmark - Target bookmark
 * @returns {Object} - Changes object
 */
function getBookmarkChanges(sourceBookmark, targetBookmark) {
  const changes = {};

  if (sourceBookmark.title !== targetBookmark.title) {
    changes.title = sourceBookmark.title;
  }
  if (sourceBookmark.url !== targetBookmark.url) {
    changes.url = sourceBookmark.url;
  }
  if (sourceBookmark.parentId !== targetBookmark.parentId) {
    changes.parentId = sourceBookmark.parentId;
  }
  if (sourceBookmark.dateGroupModified !== targetBookmark.dateGroupModified) {
    changes.dateGroupModified = sourceBookmark.dateGroupModified;
  }

  return changes;
}

/**
 * Generate a unique bookmark ID
 * @returns {string} - Unique bookmark ID
 */
function generateBookmarkId() {
  return `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
