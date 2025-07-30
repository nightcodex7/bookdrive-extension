/**
 * public-collections.js - Public Collections Infrastructure
 *
 * This module provides functionality for creating, managing, and sharing
 * public bookmark collections that can be accessed by anyone with the link.
 */

import { getAuthToken, ensureBookDriveFolder } from './auth/drive-auth.js';
import { uploadFile, downloadFile, listFiles, createPublicLink } from './drive.js';
import { encryptData, decryptData } from './encryption.js';

// Storage keys
const PUBLIC_COLLECTIONS_FILE = 'public_collections.json';
const COLLECTION_METADATA_PREFIX = 'collection_metadata_';

/**
 * Public collection visibility levels
 */
export const COLLECTION_VISIBILITY = {
  PRIVATE: 'private',
  UNLISTED: 'unlisted',
  PUBLIC: 'public',
  TEAM: 'team',
};

/**
 * Collection access permissions
 */
export const COLLECTION_PERMISSIONS = {
  VIEW: 'view',
  COMMENT: 'comment',
  EDIT: 'edit',
  ADMIN: 'admin',
};

/**
 * Create a new public collection
 * @param {Object} collectionData - Collection data
 * @param {Object} options - Collection options
 * @returns {Promise<Object>} Created collection
 */
export async function createPublicCollection(collectionData, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Ensure BookDrive folder exists
    const folderId = await ensureBookDriveFolder(false);
    if (!folderId) {
      throw new Error('BookDrive folder not found');
    }

    const collection = {
      id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: collectionData.name,
      description: collectionData.description || '',
      visibility: collectionData.visibility || COLLECTION_VISIBILITY.PRIVATE,
      permissions: collectionData.permissions || [COLLECTION_PERMISSIONS.VIEW],
      tags: collectionData.tags || [],
      category: collectionData.category || 'general',
      createdBy: await getCurrentUserEmail(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessed: null,
      accessCount: 0,
      bookmarkCount: 0,
      isEncrypted: options.encrypt || false,
      encryptionKey: null,
      shareLink: null,
      settings: {
        allowComments: options.allowComments !== false,
        allowRating: options.allowRating !== false,
        allowForking: options.allowForking !== false,
        requireApproval: options.requireApproval || false,
        maxBookmarks: options.maxBookmarks || 1000,
        ...options,
      },
    };

    // Encrypt collection data if requested
    if (collection.isEncrypted && options.passphrase) {
      const encryptedData = await encryptData(collection, options.passphrase);
      collection.encryptionKey = encryptedData.key;
      collection.data = encryptedData.data;
    }

    // Save collection metadata
    await saveCollectionMetadata(collection);

    // Create share link if public or unlisted
    if (collection.visibility !== COLLECTION_VISIBILITY.PRIVATE) {
      collection.shareLink = await createCollectionShareLink(collection.id);
    }

    // Update public collections list
    await updatePublicCollectionsList(collection);

    console.log('Public collection created:', collection);
    return collection;
  } catch (error) {
    console.error('Failed to create public collection:', error);
    throw error;
  }
}

/**
 * Get public collection by ID
 * @param {string} collectionId - Collection ID
 * @param {Object} options - Access options
 * @returns {Promise<Object|null>} Collection data
 */
export async function getPublicCollection(collectionId, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get collection metadata
    const metadata = await getCollectionMetadata(collectionId);
    if (!metadata) {
      return null;
    }

    // Check access permissions
    if (!(await hasCollectionAccess(metadata, options))) {
      throw new Error('Access denied to collection');
    }

    // Get collection bookmarks
    const bookmarks = await getCollectionBookmarks(collectionId, options);

    // Decrypt if necessary
    let decryptedData = null;
    if (metadata.isEncrypted && options.passphrase) {
      try {
        decryptedData = await decryptData(metadata.data, options.passphrase);
      } catch (error) {
        throw new Error('Invalid encryption passphrase');
      }
    }

    // Update access statistics
    await updateCollectionAccessStats(collectionId);

    return {
      ...metadata,
      bookmarks,
      decryptedData,
    };
  } catch (error) {
    console.error('Failed to get public collection:', error);
    throw error;
  }
}

/**
 * Update public collection
 * @param {string} collectionId - Collection ID
 * @param {Object} updates - Updates to apply
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Updated collection
 */
export async function updatePublicCollection(collectionId, updates, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get existing collection
    const existingCollection = await getCollectionMetadata(collectionId);
    if (!existingCollection) {
      throw new Error('Collection not found');
    }

    // Check edit permissions
    if (!(await hasCollectionPermission(existingCollection, COLLECTION_PERMISSIONS.EDIT))) {
      throw new Error('Edit permission denied');
    }

    // Apply updates
    const updatedCollection = {
      ...existingCollection,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Re-encrypt if encryption settings changed
    if (updatedCollection.isEncrypted && options.passphrase) {
      const encryptedData = await encryptData(updatedCollection, options.passphrase);
      updatedCollection.encryptionKey = encryptedData.key;
      updatedCollection.data = encryptedData.data;
    }

    // Update share link if visibility changed
    if (updates.visibility && updates.visibility !== existingCollection.visibility) {
      if (updates.visibility !== COLLECTION_VISIBILITY.PRIVATE) {
        updatedCollection.shareLink = await createCollectionShareLink(collectionId);
      } else {
        updatedCollection.shareLink = null;
      }
    }

    // Save updated metadata
    await saveCollectionMetadata(updatedCollection);

    // Update public collections list
    await updatePublicCollectionsList(updatedCollection);

    console.log('Public collection updated:', updatedCollection);
    return updatedCollection;
  } catch (error) {
    console.error('Failed to update public collection:', error);
    throw error;
  }
}

/**
 * Delete public collection
 * @param {string} collectionId - Collection ID
 * @param {Object} options - Delete options
 * @returns {Promise<Object>} Delete result
 */
export async function deletePublicCollection(collectionId, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get existing collection
    const existingCollection = await getCollectionMetadata(collectionId);
    if (!existingCollection) {
      throw new Error('Collection not found');
    }

    // Check admin permissions
    if (!(await hasCollectionPermission(existingCollection, COLLECTION_PERMISSIONS.ADMIN))) {
      throw new Error('Admin permission required to delete collection');
    }

    // Delete collection bookmarks
    await deleteCollectionBookmarks(collectionId);

    // Delete collection metadata
    await deleteCollectionMetadata(collectionId);

    // Remove from public collections list
    await removeFromPublicCollectionsList(collectionId);

    // Revoke share link if exists
    if (existingCollection.shareLink) {
      await revokeCollectionShareLink(collectionId);
    }

    console.log('Public collection deleted:', collectionId);
    return {
      success: true,
      message: 'Collection deleted successfully',
    };
  } catch (error) {
    console.error('Failed to delete public collection:', error);
    throw error;
  }
}

/**
 * Add bookmarks to public collection
 * @param {string} collectionId - Collection ID
 * @param {Array<Object>} bookmarks - Bookmarks to add
 * @param {Object} options - Add options
 * @returns {Promise<Object>} Add result
 */
export async function addBookmarksToCollection(collectionId, bookmarks, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get collection metadata
    const collection = await getCollectionMetadata(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    // Check edit permissions
    if (!(await hasCollectionPermission(collection, COLLECTION_PERMISSIONS.EDIT))) {
      throw new Error('Edit permission denied');
    }

    // Check bookmark limit
    const currentCount = await getCollectionBookmarkCount(collectionId);
    if (currentCount + bookmarks.length > collection.settings.maxBookmarks) {
      throw new Error(`Bookmark limit exceeded (${collection.settings.maxBookmarks})`);
    }

    // Add bookmarks
    const addedBookmarks = [];
    for (const bookmark of bookmarks) {
      const addedBookmark = await addBookmarkToCollection(collectionId, bookmark, options);
      addedBookmarks.push(addedBookmark);
    }

    // Update collection metadata
    await updateCollectionBookmarkCount(collectionId, currentCount + bookmarks.length);

    console.log(`Added ${bookmarks.length} bookmarks to collection:`, collectionId);
    return {
      success: true,
      added: addedBookmarks.length,
      bookmarks: addedBookmarks,
    };
  } catch (error) {
    console.error('Failed to add bookmarks to collection:', error);
    throw error;
  }
}

/**
 * Remove bookmarks from public collection
 * @param {string} collectionId - Collection ID
 * @param {Array<string>} bookmarkIds - Bookmark IDs to remove
 * @param {Object} options - Remove options
 * @returns {Promise<Object>} Remove result
 */
export async function removeBookmarksFromCollection(collectionId, bookmarkIds, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get collection metadata
    const collection = await getCollectionMetadata(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    // Check edit permissions
    if (!(await hasCollectionPermission(collection, COLLECTION_PERMISSIONS.EDIT))) {
      throw new Error('Edit permission denied');
    }

    // Remove bookmarks
    const removedCount = await removeBookmarksFromCollectionStorage(collectionId, bookmarkIds);

    // Update collection metadata
    const currentCount = await getCollectionBookmarkCount(collectionId);
    await updateCollectionBookmarkCount(collectionId, currentCount - removedCount);

    console.log(`Removed ${removedCount} bookmarks from collection:`, collectionId);
    return {
      success: true,
      removed: removedCount,
    };
  } catch (error) {
    console.error('Failed to remove bookmarks from collection:', error);
    throw error;
  }
}

/**
 * Search public collections
 * @param {Object} criteria - Search criteria
 * @param {Object} options - Search options
 * @returns {Promise<Array<Object>>} Search results
 */
export async function searchPublicCollections(criteria, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get all public collections
    const collections = await getAllPublicCollections();

    // Filter based on criteria
    const filteredCollections = collections.filter((collection) => {
      // Text search
      if (criteria.text) {
        const text = criteria.text.toLowerCase();
        const nameMatch = collection.name.toLowerCase().includes(text);
        const descMatch = collection.description.toLowerCase().includes(text);
        const tagMatch = collection.tags.some((tag) => tag.toLowerCase().includes(text));

        if (!nameMatch && !descMatch && !tagMatch) {
          return false;
        }
      }

      // Category filter
      if (criteria.category && collection.category !== criteria.category) {
        return false;
      }

      // Visibility filter
      if (criteria.visibility && collection.visibility !== criteria.visibility) {
        return false;
      }

      // Creator filter
      if (criteria.createdBy && collection.createdBy !== criteria.createdBy) {
        return false;
      }

      // Date range filter
      if (criteria.dateRange) {
        const createdDate = new Date(collection.createdAt);
        const startDate = criteria.dateRange.start
          ? new Date(criteria.dateRange.start)
          : new Date(0);
        const endDate = criteria.dateRange.end ? new Date(criteria.dateRange.end) : new Date();

        if (createdDate < startDate || createdDate > endDate) {
          return false;
        }
      }

      return true;
    });

    // Apply sorting
    if (options.sortBy) {
      filteredCollections.sort((a, b) => {
        const aValue = getCollectionValue(a, options.sortBy);
        const bValue = getCollectionValue(b, options.sortBy);

        if (options.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    // Apply pagination
    if (options.limit) {
      const start = options.offset || 0;
      return filteredCollections.slice(start, start + options.limit);
    }

    return filteredCollections;
  } catch (error) {
    console.error('Failed to search public collections:', error);
    return [];
  }
}

/**
 * Fork a public collection
 * @param {string} collectionId - Collection ID to fork
 * @param {Object} forkOptions - Fork options
 * @returns {Promise<Object>} Forked collection
 */
export async function forkPublicCollection(collectionId, forkOptions = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get original collection
    const originalCollection = await getPublicCollection(collectionId);
    if (!originalCollection) {
      throw new Error('Collection not found');
    }

    // Check if forking is allowed
    if (!originalCollection.settings.allowForking) {
      throw new Error('Forking not allowed for this collection');
    }

    // Create forked collection
    const forkedCollection = await createPublicCollection(
      {
        name: forkOptions.name || `${originalCollection.name} (Fork)`,
        description: forkOptions.description || originalCollection.description,
        visibility: forkOptions.visibility || COLLECTION_VISIBILITY.PRIVATE,
        tags: [...(originalCollection.tags || []), 'forked'],
        category: originalCollection.category,
      },
      {
        ...forkOptions,
        forkedFrom: collectionId,
      },
    );

    // Copy bookmarks
    if (originalCollection.bookmarks && originalCollection.bookmarks.length > 0) {
      await addBookmarksToCollection(forkedCollection.id, originalCollection.bookmarks);
    }

    console.log('Collection forked:', { original: collectionId, forked: forkedCollection.id });
    return forkedCollection;
  } catch (error) {
    console.error('Failed to fork collection:', error);
    throw error;
  }
}

/**
 * Get collection statistics
 * @param {string} collectionId - Collection ID
 * @returns {Promise<Object>} Collection statistics
 */
export async function getCollectionStats(collectionId) {
  try {
    const collection = await getCollectionMetadata(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const bookmarks = await getCollectionBookmarks(collectionId);
    const bookmarkCount = bookmarks.length;

    // Calculate statistics
    const stats = {
      totalBookmarks: bookmarkCount,
      uniqueDomains: new Set(bookmarks.map((b) => extractDomain(b.url))).size,
      averageBookmarksPerDay: calculateAverageBookmarksPerDay(collection.createdAt, bookmarkCount),
      topTags: calculateTopTags(bookmarks),
      accessTrends: await getCollectionAccessTrends(collectionId),
      popularity: await calculateCollectionPopularity(collectionId),
    };

    return stats;
  } catch (error) {
    console.error('Failed to get collection stats:', error);
    throw error;
  }
}

// Helper functions

/**
 * Save collection metadata
 * @param {Object} collection - Collection data
 * @returns {Promise<void>}
 */
async function saveCollectionMetadata(collection) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);

    const filename = `${COLLECTION_METADATA_PREFIX}${collection.id}.json`;
    await uploadFile(filename, collection, folderId, token);
  } catch (error) {
    console.error('Failed to save collection metadata:', error);
    throw error;
  }
}

/**
 * Get collection metadata
 * @param {string} collectionId - Collection ID
 * @returns {Promise<Object|null>} Collection metadata
 */
async function getCollectionMetadata(collectionId) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);

    const filename = `${COLLECTION_METADATA_PREFIX}${collectionId}.json`;
    const files = await listFiles(folderId, token, `name='${filename}'`);

    if (files.length === 0) {
      return null;
    }

    return await downloadFile(files[0].id, token);
  } catch (error) {
    console.error('Failed to get collection metadata:', error);
    return null;
  }
}

/**
 * Delete collection metadata
 * @param {string} collectionId - Collection ID
 * @returns {Promise<void>}
 */
async function deleteCollectionMetadata(collectionId) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);

    const filename = `${COLLECTION_METADATA_PREFIX}${collectionId}.json`;
    const files = await listFiles(folderId, token, `name='${filename}'`);

    if (files.length > 0) {
      // Note: This would require implementing file deletion in drive.js
      console.log('Collection metadata deleted:', collectionId);
    }
  } catch (error) {
    console.error('Failed to delete collection metadata:', error);
  }
}

/**
 * Check if user has collection access
 * @param {Object} collection - Collection data
 * @param {Object} options - Access options
 * @returns {Promise<boolean>} Whether user has access
 */
async function hasCollectionAccess(collection, options = {}) {
  const userEmail = await getCurrentUserEmail();

  // Public collections are accessible to everyone
  if (collection.visibility === COLLECTION_VISIBILITY.PUBLIC) {
    return true;
  }

  // Unlisted collections require the share link
  if (collection.visibility === COLLECTION_VISIBILITY.UNLISTED) {
    return options.shareToken || collection.createdBy === userEmail;
  }

  // Private collections only accessible to creator
  if (collection.visibility === COLLECTION_VISIBILITY.PRIVATE) {
    return collection.createdBy === userEmail;
  }

  // Team collections require team membership
  if (collection.visibility === COLLECTION_VISIBILITY.TEAM) {
    return await isTeamMember(userEmail);
  }

  return false;
}

/**
 * Check if user has specific permission
 * @param {Object} collection - Collection data
 * @param {string} permission - Permission to check
 * @returns {Promise<boolean>} Whether user has permission
 */
async function hasCollectionPermission(collection, permission) {
  const userEmail = await getCurrentUserEmail();

  // Creator has all permissions
  if (collection.createdBy === userEmail) {
    return true;
  }

  // Check specific permissions
  return collection.permissions.includes(permission);
}

/**
 * Create collection share link
 * @param {string} collectionId - Collection ID
 * @returns {Promise<string>} Share link
 */
async function createCollectionShareLink(collectionId) {
  try {
    // This would integrate with Google Drive's sharing API
    // For now, return a placeholder
    return `https://bookdrive.app/collection/${collectionId}`;
  } catch (error) {
    console.error('Failed to create share link:', error);
    return null;
  }
}

/**
 * Revoke collection share link
 * @param {string} collectionId - Collection ID
 * @returns {Promise<void>}
 */
async function revokeCollectionShareLink(collectionId) {
  try {
    // This would integrate with Google Drive's sharing API
    console.log('Share link revoked for collection:', collectionId);
  } catch (error) {
    console.error('Failed to revoke share link:', error);
  }
}

/**
 * Get current user email
 * @returns {Promise<string>} User email
 */
async function getCurrentUserEmail() {
  try {
    // This would get the current user's email from Google OAuth
    // For now, return a placeholder
    return 'user@example.com';
  } catch (error) {
    console.error('Failed to get current user email:', error);
    return 'unknown@example.com';
  }
}

/**
 * Check if user is team member
 * @param {string} userEmail - User email
 * @returns {Promise<boolean>} Whether user is team member
 */
async function isTeamMember(userEmail) {
  try {
    // This would check team membership
    // For now, return false
    return false;
  } catch (error) {
    console.error('Failed to check team membership:', error);
    return false;
  }
}

/**
 * Extract domain from URL
 * @param {string} url - URL
 * @returns {string} Domain
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Get collection value for sorting
 * @param {Object} collection - Collection object
 * @param {string} field - Field name
 * @returns {any} Field value
 */
function getCollectionValue(collection, field) {
  switch (field) {
    case 'name':
      return collection.name || '';
    case 'createdAt':
      return collection.createdAt || '';
    case 'updatedAt':
      return collection.updatedAt || '';
    case 'accessCount':
      return collection.accessCount || 0;
    case 'bookmarkCount':
      return collection.bookmarkCount || 0;
    default:
      return collection[field] || '';
  }
}

// Placeholder functions that would need to be implemented
async function getCollectionBookmarks(collectionId, options) {
  return [];
}
async function addBookmarkToCollection(collectionId, bookmark, options) {
  return bookmark;
}
async function removeBookmarksFromCollectionStorage(collectionId, bookmarkIds) {
  return bookmarkIds.length;
}
async function getCollectionBookmarkCount(collectionId) {
  return 0;
}
async function updateCollectionBookmarkCount(collectionId, count) {}
async function updateCollectionAccessStats(collectionId) {}
async function getAllPublicCollections() {
  return [];
}
async function updatePublicCollectionsList(collection) {}
async function removeFromPublicCollectionsList(collectionId) {}
async function getCollectionAccessTrends(collectionId) {
  return {};
}
async function calculateCollectionPopularity(collectionId) {
  return 0;
}
function calculateAverageBookmarksPerDay(createdAt, bookmarkCount) {
  return 0;
}
function calculateTopTags(bookmarks) {
  return [];
}
