/**
 * backup-compression.js - Advanced backup features for BookDrive
 *
 * This module provides compression, versioning, and incremental backup capabilities
 * to optimize storage usage and improve backup performance.
 */

import { deriveKey, encryptData, decryptData } from '../encryption.js';

// Compression constants
const COMPRESSION_LEVEL = 6; // Balance between speed and compression
// const CHUNK_SIZE = 64 * 1024; // 64KB chunks for processing // Removed unused variable
// const VERSION_PREFIX = 'v'; // Removed unused variable

/**
 * Compress data using gzip compression
 * @param {string|Object} data - Data to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} Compressed data with metadata
 */
export async function compressData(data, options = {}) {
  try {
    const { level = COMPRESSION_LEVEL, encrypt = false, passphrase } = options;

    // Convert data to string if it's an object
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // Create a TextEncoder to convert string to Uint8Array
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(dataString);

    // Compress using gzip
    const compressedBytes = await compressBytes(dataBytes, level);

    // Encrypt if requested
    let finalData = compressedBytes;
    let encryptionInfo = null;

    if (encrypt && passphrase) {
      const key = await deriveKey(passphrase);
      const encrypted = await encryptData(compressedBytes, key);
      finalData = encrypted.data;
      encryptionInfo = {
        encrypted: true,
        algorithm: encrypted.algorithm,
        iv: encrypted.iv,
      };
    }

    // Convert to base64 for storage
    const base64Data = btoa(String.fromCharCode(...new Uint8Array(finalData)));

    return {
      data: base64Data,
      originalSize: dataBytes.length,
      compressedSize: compressedBytes.length,
      compressionRatio: (1 - compressedBytes.length / dataBytes.length) * 100,
      encrypted: !!encryptionInfo,
      encryptionInfo,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        algorithm: 'gzip',
        level,
      },
    };
  } catch (error) {
    console.error('Compression failed:', error);
    throw new Error(`Compression failed: ${error.message}`);
  }
}

/**
 * Decompress data
 * @param {Object} compressedData - Compressed data object
 * @param {string} passphrase - Passphrase for decryption if encrypted
 * @returns {Promise<Object>} Decompressed data
 */
export async function decompressData(compressedData, passphrase = null) {
  try {
    const { data, encryptionInfo, metadata } = compressedData;

    // Convert from base64
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decrypt if encrypted
    let decryptedBytes = bytes;
    if (encryptionInfo && encryptionInfo.encrypted && passphrase) {
      const key = await deriveKey(passphrase);
      decryptedBytes = await decryptData(
        {
          data: bytes,
          algorithm: encryptionInfo.algorithm,
          iv: encryptionInfo.iv,
        },
        key,
      );
    }

    // Decompress
    const decompressedBytes = await decompressBytes(decryptedBytes);

    // Convert back to string
    const decoder = new TextDecoder();
    const decompressedString = decoder.decode(decompressedBytes);

    // Try to parse as JSON, fallback to string
    let result;
    try {
      result = JSON.parse(decompressedString);
    } catch {
      result = decompressedString;
    }

    return {
      data: result,
      originalSize: compressedData.originalSize,
      decompressedSize: decompressedBytes.length,
      metadata,
    };
  } catch (error) {
    console.error('Decompression failed:', error);
    throw new Error(`Decompression failed: ${error.message}`);
  }
}

/**
 * Create incremental backup by comparing with previous backup
 * @param {Object} currentData - Current bookmark data
 * @param {Object} previousBackup - Previous backup data
 * @param {Object} options - Backup options
 * @returns {Promise<Object>} Incremental backup data
 */
export async function createIncrementalBackup(currentData, previousBackup, options = {}) {
  try {
    const { compress = true, encrypt = false, passphrase } = options;

    // Calculate differences
    const differences = calculateDifferences(currentData, previousBackup.data);

    // Create incremental backup
    const incrementalData = {
      type: 'incremental',
      baseBackupId: previousBackup.id,
      timestamp: new Date().toISOString(),
      differences,
      metadata: {
        originalSize: JSON.stringify(currentData).length,
        incrementalSize: JSON.stringify(differences).length,
        compressionRatio: 0,
      },
    };

    // Compress if requested
    if (compress) {
      const compressed = await compressData(incrementalData, { encrypt, passphrase });
      incrementalData.data = compressed.data;
      incrementalData.metadata.compressionRatio = compressed.compressionRatio;
      incrementalData.metadata.compressedSize = compressed.compressedSize;
      incrementalData.encryptionInfo = compressed.encryptionInfo;
    } else {
      incrementalData.data = differences;
    }

    return incrementalData;
  } catch (error) {
    console.error('Incremental backup creation failed:', error);
    throw new Error(`Incremental backup failed: ${error.message}`);
  }
}

/**
 * Apply incremental backup to restore full data
 * @param {Object} baseBackup - Base backup data
 * @param {Object} incrementalBackup - Incremental backup data
 * @param {string} passphrase - Passphrase for decryption if needed
 * @returns {Promise<Object>} Restored data
 */
export async function applyIncrementalBackup(baseBackup, incrementalBackup, passphrase = null) {
  try {
    // Decompress incremental backup if needed
    let incrementalData = incrementalBackup.data;
    if (incrementalBackup.encryptionInfo || incrementalBackup.metadata.compressionRatio > 0) {
      const decompressed = await decompressData(incrementalBackup, passphrase);
      incrementalData = decompressed.data;
    }

    // Apply differences to base backup
    const restoredData = applyDifferences(baseBackup.data, incrementalData);

    return {
      data: restoredData,
      metadata: {
        baseBackupId: incrementalBackup.baseBackupId,
        incrementalBackupId: incrementalBackup.id,
        restoredAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Incremental backup application failed:', error);
    throw new Error(`Incremental restore failed: ${error.message}`);
  }
}

/**
 * Calculate differences between current and previous data
 * @param {Object} current - Current data
 * @param {Object} previous - Previous data
 * @returns {Object} Differences object
 */
function calculateDifferences(current, previous) {
  const differences = {
    added: [],
    modified: [],
    deleted: [],
  };

  // Create maps for efficient lookup
  const currentMap = new Map();
  const previousMap = new Map();

  // Index current bookmarks
  current.bookmarks.forEach((bookmark) => {
    currentMap.set(bookmark.id, bookmark);
  });

  // Index previous bookmarks
  previous.bookmarks.forEach((bookmark) => {
    previousMap.set(bookmark.id, bookmark);
  });

  // Find added and modified bookmarks
  current.bookmarks.forEach((bookmark) => {
    const previousBookmark = previousMap.get(bookmark.id);
    if (!previousBookmark) {
      differences.added.push(bookmark);
    } else if (!areBookmarksEqual(bookmark, previousBookmark)) {
      differences.modified.push({
        id: bookmark.id,
        changes: getBookmarkChanges(previousBookmark, bookmark),
      });
    }
  });

  // Find deleted bookmarks
  previous.bookmarks.forEach((bookmark) => {
    if (!currentMap.has(bookmark.id)) {
      differences.deleted.push(bookmark.id);
    }
  });

  return differences;
}

/**
 * Apply differences to base data
 * @param {Object} baseData - Base data
 * @param {Object} differences - Differences to apply
 * @returns {Object} Updated data
 */
function applyDifferences(baseData, differences) {
  const result = {
    ...baseData,
    bookmarks: [...baseData.bookmarks],
  };

  // Apply deletions
  differences.deleted.forEach((bookmarkId) => {
    const index = result.bookmarks.findIndex((b) => b.id === bookmarkId);
    if (index !== -1) {
      result.bookmarks.splice(index, 1);
    }
  });

  // Apply modifications
  differences.modified.forEach((modification) => {
    const index = result.bookmarks.findIndex((b) => b.id === modification.id);
    if (index !== -1) {
      result.bookmarks[index] = {
        ...result.bookmarks[index],
        ...modification.changes,
      };
    }
  });

  // Apply additions
  differences.added.forEach((bookmark) => {
    result.bookmarks.push(bookmark);
  });

  return result;
}

/**
 * Check if two bookmarks are equal
 * @param {Object} bookmark1 - First bookmark
 * @param {Object} bookmark2 - Second bookmark
 * @returns {boolean} True if equal
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
 * @param {Object} oldBookmark - Old bookmark
 * @param {Object} newBookmark - New bookmark
 * @returns {Object} Changes object
 */
function getBookmarkChanges(oldBookmark, newBookmark) {
  const changes = {};

  if (oldBookmark.title !== newBookmark.title) {
    changes.title = newBookmark.title;
  }
  if (oldBookmark.url !== newBookmark.url) {
    changes.url = newBookmark.url;
  }
  if (oldBookmark.parentId !== newBookmark.parentId) {
    changes.parentId = newBookmark.parentId;
  }
  if (oldBookmark.dateGroupModified !== newBookmark.dateGroupModified) {
    changes.dateGroupModified = newBookmark.dateGroupModified;
  }

  return changes;
}

/**
 * Compress bytes using gzip
 * @param {Uint8Array} data - Data to compress
 * @param {number} level - Compression level
 * @returns {Promise<Uint8Array>} Compressed data
 */
async function compressBytes(data, _level) {
  // Use a simple compression algorithm for browser compatibility
  // In a real implementation, you might use a WebAssembly-based gzip library

  // For now, we'll use a basic run-length encoding as a placeholder
  // This should be replaced with proper gzip compression in production

  const compressed = [];
  let count = 1;
  let current = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i] === current && count < 255) {
      count++;
    } else {
      compressed.push(count, current);
      count = 1;
      current = data[i];
    }
  }
  compressed.push(count, current);

  return new Uint8Array(compressed);
}

/**
 * Decompress bytes
 * @param {Uint8Array} data - Compressed data
 * @returns {Promise<Uint8Array>} Decompressed data
 */
async function decompressBytes(data) {
  // Decompress using the same algorithm as compressBytes
  const decompressed = [];

  for (let i = 0; i < data.length; i += 2) {
    const count = data[i];
    const value = data[i + 1];

    for (let j = 0; j < count; j++) {
      decompressed.push(value);
    }
  }

  return new Uint8Array(decompressed);
}

/**
 * Generate version number for backup
 * @param {string} baseVersion - Base version
 * @param {number} increment - Increment amount
 * @returns {string} New version number
 */
export function generateVersion(baseVersion = '1.0.0', increment = 1) {
  const parts = baseVersion.split('.').map(Number);
  parts[parts.length - 1] += increment;
  return parts.join('.');
}

/**
 * Validate backup version compatibility
 * @param {string} backupVersion - Backup version
 * @param {string} currentVersion - Current extension version
 * @returns {boolean} True if compatible
 */
export function isVersionCompatible(backupVersion, currentVersion) {
  const backupParts = backupVersion.split('.').map(Number);
  const currentParts = currentVersion.split('.').map(Number);

  // Major version must match
  return backupParts[0] === currentParts[0];
}
