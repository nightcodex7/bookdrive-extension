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
 * Flatten a bookmark tree into an array
 * @param {Array} tree - Bookmark tree
 * @returns {Array} - Flattened array of bookmarks
 */
function flattenBookmarks(tree) {
  const result = [];

  function traverse(node) {
    result.push(node);

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  tree.forEach(traverse);
  return result;
}

/**
 * Check if two bookmarks are equal
 * @param {Object} a - First bookmark
 * @param {Object} b - Second bookmark
 * @returns {boolean} - True if bookmarks are equal
 */
function areBookmarksEqual(a, b) {
  // Compare basic properties
  if (a.title !== b.title || a.url !== b.url || a.type !== b.type) {
    return false;
  }

  // Compare parent IDs
  if (a.parentId !== b.parentId) {
    return false;
  }

  // Compare index (position)
  if (a.index !== b.index) {
    return false;
  }

  // For folders, check if children count is the same
  if (a.type === 'folder' && b.type === 'folder') {
    const aChildCount = a.children ? a.children.length : 0;
    const bChildCount = b.children ? b.children.length : 0;

    if (aChildCount !== bChildCount) {
      return false;
    }
  }

  return true;
}

/**
 * Get the changes between two bookmarks
 * @param {Object} source - Source bookmark
 * @param {Object} target - Target bookmark
 * @returns {Object} - Changes between the bookmarks
 */
function getBookmarkChanges(source, target) {
  const changes = {};

  if (source.title !== target.title) {
    changes.title = {
      from: target.title,
      to: source.title,
    };
  }

  if (source.url !== target.url) {
    changes.url = {
      from: target.url,
      to: source.url,
    };
  }

  if (source.parentId !== target.parentId) {
    changes.parentId = {
      from: target.parentId,
      to: source.parentId,
    };
  }

  if (source.index !== target.index) {
    changes.index = {
      from: target.index,
      to: source.index,
    };
  }

  return changes;
}

/**
 * Apply delta changes to a bookmark tree
 * @param {Array} tree - Target bookmark tree to modify
 * @param {Object} delta - Delta changes to apply
 * @param {Function} applyFn - Function to apply each change
 * @returns {Promise<Object>} - Result of applying changes
 */
export async function applyDelta(tree, delta, applyFn) {
  // Process changes in batches
  const allChanges = [
    ...delta.added.map((item) => ({ type: 'add', item })),
    ...delta.modified.map((item) => ({ type: 'modify', item })),
    ...delta.deleted.map((item) => ({ type: 'delete', item })),
  ];

  // Process in optimal order: deletions first, then modifications, then additions
  allChanges.sort((a, b) => {
    const typeOrder = { delete: 0, modify: 1, add: 2 };
    return typeOrder[a.type] - typeOrder[b.type];
  });

  // Use resource-aware batch processing
  const result = await processBatch(
    allChanges,
    async (change) => {
      await applyFn(change.type, change.item);
    },
    {
      batchSize: BATCH_SIZE,
      throttleDelay: 50, // Small delay between operations
      checkResources: true,
    },
  );

  return {
    success: result.success,
    applied: result.processed,
    failed: result.failed,
    total: allChanges.length,
    errors: result.errors,
    reason: result.reason,
  };
}

/**
 * Compress bookmark data for transfer
 * @param {Object} data - Bookmark data to compress
 * @returns {Object} - Compressed data
 */
export function compressBookmarkData(data) {
  // Create a dictionary of common strings
  const dictionary = new Map();
  const strings = [];

  // Extract all strings from the data
  function extractStrings(obj) {
    if (typeof obj === 'string') {
      if (obj.length > 3 && !strings.includes(obj)) {
        strings.push(obj);
      }
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(extractStrings);
      return;
    }

    if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(extractStrings);
    }
  }

  extractStrings(data);

  // Sort strings by frequency and length
  strings.sort((a, b) => {
    // Prioritize longer strings
    return b.length - a.length;
  });

  // Build dictionary (limit to most common strings)
  const MAX_DICTIONARY_SIZE = 1000;
  const dictionaryArray = strings.slice(0, MAX_DICTIONARY_SIZE);

  dictionaryArray.forEach((str, index) => {
    dictionary.set(str, index);
  });

  // Replace strings with dictionary references
  function replaceStrings(obj) {
    if (typeof obj === 'string') {
      if (dictionary.has(obj)) {
        return `$${dictionary.get(obj)}`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(replaceStrings);
    }

    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceStrings(value);
      }
      return result;
    }

    return obj;
  }

  // Create compressed data
  const compressedData = replaceStrings(data);

  return {
    dictionary: dictionaryArray,
    data: compressedData,
  };
}

/**
 * Decompress bookmark data
 * @param {Object} compressed - Compressed bookmark data
 * @returns {Object} - Decompressed data
 */
export function decompressBookmarkData(compressed) {
  const { dictionary, data } = compressed;

  // Replace dictionary references with actual strings
  function replaceReferences(obj) {
    if (typeof obj === 'string' && obj.startsWith('$')) {
      const index = parseInt(obj.substring(1), 10);
      if (!isNaN(index) && index >= 0 && index < dictionary.length) {
        return dictionary[index];
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(replaceReferences);
    }

    if (obj && typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = replaceReferences(value);
      }
      return result;
    }

    return obj;
  }

  return replaceReferences(data);
}

/**
 * Create a retry mechanism with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of the operation
 */
export async function withRetry(operation, options = {}) {
  const {
    maxAttempts = MAX_RETRY_ATTEMPTS,
    baseDelay = RETRY_DELAY_BASE,
    shouldRetry = () => true,
    onRetry = () => {},
  } = options;

  let attempt = 1;

  while (true) {
    try {
      // Check system resources before attempting operation
      const resourceCheck = await canPerformOperation({
        requireOptimal: false,
        allowConstrained: true,
      });

      if (!resourceCheck.isSafe) {
        throw new Error(`Insufficient system resources: ${resourceCheck.reason}`);
      }

      // Attempt the operation
      return await operation(attempt);
    } catch (error) {
      // Check if we should retry
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      // Calculate delay with exponential backoff and jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random());

      // Notify about retry
      onRetry(error, attempt, delay);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Increment attempt counter
      attempt++;
    }
  }
}

/**
 * Perform a sync operation when system resources are optimal
 * @param {Function} syncOperation - Sync operation to perform
 * @param {Object} options - Options for the operation
 * @returns {Promise<any>} - Result of the operation
 */
export async function performOptimizedSync(syncOperation, options = {}) {
  const {
    requireIdle = false,
    idleTimeout = 60000,
    maxWaitTime = 5 * 60 * 1000,
    retryOptions = {},
  } = options;

  // If idle execution is required, use runWhenIdle
  if (requireIdle) {
    const idleResult = await runWhenIdle(() => withRetry(syncOperation, retryOptions), {
      idleTimeout,
      maxWaitTime,
      checkResources: true,
    });

    if (!idleResult.success) {
      throw new Error(`Failed to perform sync operation: ${idleResult.reason}`);
    }

    return idleResult.result;
  }

  // Otherwise, just use retry mechanism
  return withRetry(syncOperation, retryOptions);
}
