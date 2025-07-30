/**
 * shared-folders.js - Shared bookmark folders for team collaboration
 *
 * This module provides shared folder functionality with permission enforcement,
 * real-time collaboration features, and team-specific conflict resolution.
 */

import { getAuthToken, ensureBookDriveFolder } from '../auth/drive-auth.js';
import { uploadFile, downloadFile, listFiles } from '../drive.js';
import { getTeamMembers, isTeamAdmin } from './team-manager.js';

// Shared folder constants
const SHARED_FOLDERS_FILE = 'shared_folders.json';
const FOLDER_PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  ADMIN: 'admin',
};

/**
 * Create a shared folder
 * @param {Object} folderData - Folder data
 * @param {string} folderData.name - Folder name
 * @param {string} folderData.description - Folder description
 * @param {Array} folderData.members - Initial members with permissions
 * @param {Object} options - Creation options
 * @returns {Promise<Object>} Created shared folder
 */
export async function createSharedFolder(folderData, options = {}) {
  try {
    const { syncWithTeam = true, encrypt = false, passphrase } = options;

    // Verify user is team admin
    const isAdmin = await isTeamAdmin();
    if (!isAdmin) {
      throw new Error('Only team admins can create shared folders');
    }

    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Ensure BookDrive folder exists
    const driveFolderId = await ensureBookDriveFolder(true);

    // Create shared folder metadata
    const sharedFolder = {
      id: `shared_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: folderData.name,
      description: folderData.description,
      createdBy: await getCurrentUserEmail(),
      createdAt: new Date().toISOString(),
      members: folderData.members || [],
      bookmarks: [],
      permissions: {
        default: FOLDER_PERMISSIONS.READ,
        members: {},
      },
      metadata: {
        encrypted: encrypt,
        version: '1.0',
        lastModified: new Date().toISOString(),
      },
    };

    // Set up member permissions
    if (folderData.members) {
      folderData.members.forEach((member) => {
        sharedFolder.permissions.members[member.email] =
          member.permission || FOLDER_PERMISSIONS.READ;
      });
    }

    // Encrypt if requested
    if (encrypt && passphrase) {
      sharedFolder.data = await encryptFolderData(sharedFolder, passphrase);
    }

    // Save shared folder metadata
    await saveSharedFolderMetadata(sharedFolder, driveFolderId, token);

    // Sync with team if requested
    if (syncWithTeam) {
      await notifyTeamMembers(sharedFolder, 'created');
    }

    return {
      success: true,
      folder: sharedFolder,
      message: `Shared folder "${folderData.name}" created successfully`,
    };
  } catch (error) {
    console.error('Failed to create shared folder:', error);
    throw error;
  }
}

/**
 * Get all shared folders for current user
 * @param {Object} options - Options
 * @returns {Promise<Array>} Shared folders
 */
export async function getSharedFolders(options = {}) {
  try {
    const { includeBookmarks = false, decrypt = true, passphrase } = options;

    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Ensure BookDrive folder exists
    const driveFolderId = await ensureBookDriveFolder(false);
    if (!driveFolderId) {
      return [];
    }

    // Get shared folders metadata
    const files = await listFiles(
      driveFolderId,
      token,
      `name='${SHARED_FOLDERS_FILE}' and mimeType='application/json'`,
    );

    if (files.length === 0) {
      return [];
    }

    // Download shared folders data
    const sharedFoldersData = await downloadFile(files[0].id, token);
    const sharedFolders = sharedFoldersData.folders || [];

    // Filter folders user has access to
    const userEmail = await getCurrentUserEmail();
    const accessibleFolders = sharedFolders.filter((folder) => {
      return hasFolderAccess(folder, userEmail);
    });

    // Decrypt if needed
    if (decrypt) {
      for (const folder of accessibleFolders) {
        if (folder.metadata.encrypted && passphrase) {
          try {
            const decrypted = await decryptFolderData(folder, passphrase);
            Object.assign(folder, decrypted);
          } catch (error) {
            console.warn(`Failed to decrypt folder ${folder.id}:`, error);
          }
        }
      }
    }

    // Include bookmarks if requested
    if (includeBookmarks) {
      for (const folder of accessibleFolders) {
        folder.bookmarks = await getSharedFolderBookmarks(folder.id);
      }
    }

    return accessibleFolders;
  } catch (error) {
    console.error('Failed to get shared folders:', error);
    return [];
  }
}

/**
 * Add bookmarks to shared folder
 * @param {string} folderId - Shared folder ID
 * @param {Array} bookmarks - Bookmarks to add
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result
 */
export async function addBookmarksToSharedFolder(folderId, bookmarks, options = {}) {
  try {
    const { notifyTeam = true } = options;

    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get shared folder
    const sharedFolders = await getSharedFolders();
    const folder = sharedFolders.find((f) => f.id === folderId);

    if (!folder) {
      throw new Error('Shared folder not found');
    }

    // Check permissions
    const userEmail = await getCurrentUserEmail();
    const permission = getFolderPermission(folder, userEmail);

    if (permission === FOLDER_PERMISSIONS.READ) {
      throw new Error('Read-only access to this shared folder');
    }

    // Add bookmarks with metadata
    const bookmarksWithMetadata = bookmarks.map((bookmark) => ({
      ...bookmark,
      addedBy: userEmail,
      addedAt: new Date().toISOString(),
      folderId: folderId,
    }));

    folder.bookmarks.push(...bookmarksWithMetadata);
    folder.metadata.lastModified = new Date().toISOString();
    folder.metadata.lastModifiedBy = userEmail;

    // Save updated folder
    const driveFolderId = await ensureBookDriveFolder(true);
    await saveSharedFolderMetadata(folder, driveFolderId, token);

    // Notify team if requested
    if (notifyTeam) {
      await notifyTeamMembers(folder, 'updated', {
        action: 'bookmarks_added',
        count: bookmarks.length,
        addedBy: userEmail,
      });
    }

    return {
      success: true,
      addedCount: bookmarks.length,
      message: `Added ${bookmarks.length} bookmarks to shared folder`,
    };
  } catch (error) {
    console.error('Failed to add bookmarks to shared folder:', error);
    throw error;
  }
}

/**
 * Remove bookmarks from shared folder
 * @param {string} folderId - Shared folder ID
 * @param {Array} bookmarkIds - Bookmark IDs to remove
 * @param {Object} options - Options
 * @returns {Promise<Object>} Result
 */
export async function removeBookmarksFromSharedFolder(folderId, bookmarkIds, options = {}) {
  try {
    const { notifyTeam = true } = options;

    // Get auth token
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Get shared folder
    const sharedFolders = await getSharedFolders();
    const folder = sharedFolders.find((f) => f.id === folderId);

    if (!folder) {
      throw new Error('Shared folder not found');
    }

    // Check permissions
    const userEmail = await getCurrentUserEmail();
    const permission = getFolderPermission(folder, userEmail);

    if (permission === FOLDER_PERMISSIONS.READ) {
      throw new Error('Read-only access to this shared folder');
    }

    // Remove bookmarks
    const originalCount = folder.bookmarks.length;
    folder.bookmarks = folder.bookmarks.filter((bookmark) => {
      // Allow removal if user is admin or added the bookmark
      return (
        !bookmarkIds.includes(bookmark.id) ||
        permission === FOLDER_PERMISSIONS.ADMIN ||
        bookmark.addedBy === userEmail
      );
    });

    const removedCount = originalCount - folder.bookmarks.length;
    folder.metadata.lastModified = new Date().toISOString();
    folder.metadata.lastModifiedBy = userEmail;

    // Save updated folder
    const driveFolderId = await ensureBookDriveFolder(true);
    await saveSharedFolderMetadata(folder, driveFolderId, token);

    // Notify team if requested
    if (notifyTeam) {
      await notifyTeamMembers(folder, 'updated', {
        action: 'bookmarks_removed',
        count: removedCount,
        removedBy: userEmail,
      });
    }

    return {
      success: true,
      removedCount,
      message: `Removed ${removedCount} bookmarks from shared folder`,
    };
  } catch (error) {
    console.error('Failed to remove bookmarks from shared folder:', error);
    throw error;
  }
}

/**
 * Update shared folder permissions
 * @param {string} folderId - Shared folder ID
 * @param {string} memberEmail - Member email
 * @param {string} permission - New permission level
 * @returns {Promise<Object>} Result
 */
export async function updateSharedFolderPermission(folderId, memberEmail, permission) {
  try {
    // Verify user is folder admin
    const sharedFolders = await getSharedFolders();
    const folder = sharedFolders.find((f) => f.id === folderId);

    if (!folder) {
      throw new Error('Shared folder not found');
    }

    const userEmail = await getCurrentUserEmail();
    const userPermission = getFolderPermission(folder, userEmail);

    if (userPermission !== FOLDER_PERMISSIONS.ADMIN) {
      throw new Error('Admin permission required to update folder permissions');
    }

    // Update permission
    folder.permissions.members[memberEmail] = permission;
    folder.metadata.lastModified = new Date().toISOString();
    folder.metadata.lastModifiedBy = userEmail;

    // Save updated folder
    const token = await getAuthToken(false);
    const driveFolderId = await ensureBookDriveFolder(true);
    await saveSharedFolderMetadata(folder, driveFolderId, token);

    // Notify team
    await notifyTeamMembers(folder, 'permission_updated', {
      memberEmail,
      permission,
      updatedBy: userEmail,
    });

    return {
      success: true,
      message: `Updated permission for ${memberEmail} to ${permission}`,
    };
  } catch (error) {
    console.error('Failed to update shared folder permission:', error);
    throw error;
  }
}

/**
 * Get shared folder bookmarks
 * @param {string} folderId - Shared folder ID
 * @returns {Promise<Array>} Bookmarks
 */
export async function getSharedFolderBookmarks(folderId) {
  try {
    const sharedFolders = await getSharedFolders({ includeBookmarks: true });
    const folder = sharedFolders.find((f) => f.id === folderId);

    if (!folder) {
      return [];
    }

    return folder.bookmarks || [];
  } catch (error) {
    console.error('Failed to get shared folder bookmarks:', error);
    return [];
  }
}

/**
 * Check if user has access to folder
 * @param {Object} folder - Shared folder
 * @param {string} userEmail - User email
 * @returns {boolean} True if has access
 */
function hasFolderAccess(folder, userEmail) {
  // Creator always has access
  if (folder.createdBy === userEmail) {
    return true;
  }

  // Check member permissions
  return folder.permissions.members.hasOwnProperty(userEmail);
}

/**
 * Get user's permission level for folder
 * @param {Object} folder - Shared folder
 * @param {string} userEmail - User email
 * @returns {string} Permission level
 */
function getFolderPermission(folder, userEmail) {
  // Creator is admin
  if (folder.createdBy === userEmail) {
    return FOLDER_PERMISSIONS.ADMIN;
  }

  // Check member permissions
  return folder.permissions.members[userEmail] || folder.permissions.default;
}

/**
 * Save shared folder metadata
 * @param {Object} folder - Shared folder
 * @param {string} driveFolderId - Google Drive folder ID
 * @param {string} token - Auth token
 */
async function saveSharedFolderMetadata(folder, driveFolderId, token) {
  // Get existing shared folders
  const files = await listFiles(
    driveFolderId,
    token,
    `name='${SHARED_FOLDERS_FILE}' and mimeType='application/json'`,
  );

  let sharedFoldersData = { folders: [] };
  if (files.length > 0) {
    sharedFoldersData = await downloadFile(files[0].id, token);
  }

  // Update or add folder
  const existingIndex = sharedFoldersData.folders.findIndex((f) => f.id === folder.id);
  if (existingIndex !== -1) {
    sharedFoldersData.folders[existingIndex] = folder;
  } else {
    sharedFoldersData.folders.push(folder);
  }

  // Save updated data
  await uploadFile(SHARED_FOLDERS_FILE, sharedFoldersData, driveFolderId, token);
}

/**
 * Get current user email
 * @returns {Promise<string>} User email
 */
async function getCurrentUserEmail() {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${await getAuthToken(false)}`,
      },
    });

    if (response.ok) {
      const userInfo = await response.json();
      return userInfo.email;
    }
  } catch (error) {
    console.error('Failed to get user email:', error);
  }

  return 'unknown@example.com';
}

/**
 * Encrypt folder data
 * @param {Object} folder - Folder data
 * @param {string} passphrase - Encryption passphrase
 * @returns {Promise<Object>} Encrypted data
 */
async function encryptFolderData(folder, passphrase) {
  // Import encryption functions
  const { deriveKey, encryptData } = await import('../encryption.js');

  const key = await deriveKey(passphrase);
  const folderString = JSON.stringify(folder);
  const encoder = new TextEncoder();
  const folderBytes = encoder.encode(folderString);

  const encrypted = await encryptData(folderBytes, key);

  return {
    data: btoa(String.fromCharCode(...new Uint8Array(encrypted.data))),
    algorithm: encrypted.algorithm,
    iv: encrypted.iv,
  };
}

/**
 * Decrypt folder data
 * @param {Object} folder - Folder with encrypted data
 * @param {string} passphrase - Decryption passphrase
 * @returns {Promise<Object>} Decrypted folder data
 */
async function decryptFolderData(folder, passphrase) {
  // Import encryption functions
  const { deriveKey, decryptData } = await import('../encryption.js');

  const key = await deriveKey(passphrase);

  // Convert from base64
  const binaryString = atob(folder.data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const decrypted = await decryptData(
    {
      data: bytes,
      algorithm: folder.algorithm,
      iv: folder.iv,
    },
    key,
  );

  const decoder = new TextDecoder();
  const decryptedString = decoder.decode(decrypted);

  return JSON.parse(decryptedString);
}

/**
 * Notify team members of folder changes
 * @param {Object} folder - Shared folder
 * @param {string} action - Action performed
 * @param {Object} details - Additional details
 */
async function notifyTeamMembers(folder, action, details = {}) {
  try {
    // Get team members
    const teamMembers = await getTeamMembers();

    // Create notification
    const notification = {
      type: 'shared_folder_update',
      folderId: folder.id,
      folderName: folder.name,
      action,
      details,
      timestamp: new Date().toISOString(),
      from: await getCurrentUserEmail(),
    };

    // Save notification for team members
    const token = await getAuthToken(false);
    const driveFolderId = await ensureBookDriveFolder(true);

    const notificationFile = `notifications_${Date.now()}.json`;
    await uploadFile(notificationFile, notification, driveFolderId, token);

    console.log(
      `Notified ${teamMembers.length} team members of ${action} on folder ${folder.name}`,
    );
  } catch (error) {
    console.error('Failed to notify team members:', error);
  }
}

/**
 * Get pending notifications for current user
 * @returns {Promise<Array>} Notifications
 */
export async function getPendingNotifications() {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      return [];
    }

    const driveFolderId = await ensureBookDriveFolder(false);
    if (!driveFolderId) {
      return [];
    }

    // Get notification files
    const files = await listFiles(
      driveFolderId,
      token,
      `name contains 'notifications_' and mimeType='application/json'`,
    );

    const notifications = [];
    for (const file of files) {
      try {
        const notification = await downloadFile(file.id, token);
        notifications.push(notification);
      } catch (error) {
        console.warn(`Failed to download notification ${file.id}:`, error);
      }
    }

    // Sort by timestamp
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return notifications;
  } catch (error) {
    console.error('Failed to get pending notifications:', error);
    return [];
  }
}
