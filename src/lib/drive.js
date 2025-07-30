/**
 * drive.js - Google Drive API integration for BookDrive
 *
 * This module provides functions for interacting with Google Drive API
 * for storing and retrieving bookmark data.
 */

import { getAuthToken } from './auth/drive-auth.js';

/**
 * Handle API response with automatic token refresh via Chrome Identity API
 * @param {Response} response - Fetch response
 * @param {string} token - Current auth token
 * @param {Function} retryFn - Function to retry the operation with a new token
 * @returns {Promise<any>} - Response data or throws error
 */
export async function handleApiResponse(response, token, retryFn) {
  // If unauthorized, Chrome Identity API will handle token refresh automatically
  if (response.status === 401) {
    try {
      // Get a fresh token (Chrome Identity API handles refresh automatically)
      const newToken = await getAuthToken(false);
      return retryFn(newToken);
    } catch (refreshError) {
      throw new Error(`Authentication failed: ${refreshError.message}`);
    }
  }

  // Handle rate limiting
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After') || '60';
    const delaySeconds = parseInt(retryAfter, 10);

    throw new Error(`Rate limit exceeded. Try again in ${delaySeconds} seconds.`);
  }

  // Handle quota exceeded
  if (response.status === 403 && response.statusText.includes('Quota')) {
    throw new Error('Google Drive quota exceeded. Try again later.');
  }

  // Handle other errors
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
/**
 * Create a folder in Google Drive
 * @param {string} name - Folder name
 * @param {string} parentId - Parent folder ID (optional)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - The created folder metadata
 */
export async function createFolder(name, parentId = null, token) {
  const metadata = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  const makeRequest = async (currentToken) => {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    return handleApiResponse(response, currentToken, (newToken) => makeRequest(newToken));
  };

  return makeRequest(token);
}

/**
 * Upload a file to Google Drive
 * @param {string} name - File name
 * @param {string|Object} content - File content
 * @param {string} parentId - Parent folder ID (optional)
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - The uploaded file metadata
 */
export async function uploadFile(name, content, parentId = null, token) {
  // Validate content
  if (!content) {
    throw new Error('File content cannot be empty');
  }

  // Convert content to string if it's an object
  const contentStr = typeof content === 'object' ? JSON.stringify(content) : content;

  // Create metadata part
  const metadata = {
    name,
    mimeType: 'application/json',
  };

  if (parentId) {
    metadata.parents = [parentId];
  }

  // Create multipart request
  const boundary = `-------${Date.now()}`;
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    contentStr +
    closeDelimiter;

  const makeRequest = async (currentToken) => {
    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    return handleApiResponse(response, currentToken, (newToken) => makeRequest(newToken));
  };

  return makeRequest(token);
}

/**
 * Download a file from Google Drive
 * @param {string} fileId - File ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - The file content
 */
export async function downloadFile(fileId, token) {
  // Validate fileId
  if (!fileId) {
    throw new Error('File ID cannot be empty');
  }

  const makeRequest = async (currentToken) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    return handleApiResponse(response, currentToken, (newToken) => makeRequest(newToken));
  };

  return makeRequest(token);
}

/**
 * List files in a Google Drive folder
 * @param {string} folderId - Folder ID
 * @param {string} token - Auth token
 * @param {string} query - Query string (optional)
 * @param {number} pageSize - Number of files per page (default: 100)
 * @returns {Promise<Array>} - Array of file metadata
 */
export async function listFiles(folderId, token, query = '', pageSize = 100) {
  const makeRequest = async (currentToken, pageToken = null) => {
    let url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,size)`;

    if (folderId) {
      url += `&q=${encodeURIComponent(`'${folderId}' in parents`)}`;
    }

    if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    }

    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    return handleApiResponse(response, currentToken, (newToken) =>
      makeRequest(newToken, pageToken),
    );
  };

  return makeRequest(token);
}

/**
 * Delete a file from Google Drive
 * @param {string} fileId - File ID to delete
 * @param {string} token - Auth token
 * @returns {Promise<void>} - Success or throws error
 */
export async function deleteFile(fileId, token) {
  const makeRequest = async (currentToken) => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${currentToken}`,
      },
    });

    return handleApiResponse(response, currentToken, (newToken) => makeRequest(newToken));
  };

  return makeRequest(token);
}

/**
 * Upload bookmarks file to Google Drive
 * @param {Object} bookmarks - Bookmarks data
 * @param {string} folderId - Folder ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - The uploaded file metadata
 */
export async function uploadBookmarksFile(bookmarks, folderId, token) {
  // Validate inputs
  if (!bookmarks) {
    throw new Error('Bookmarks data cannot be empty');
  }

  if (!folderId) {
    throw new Error('Folder ID cannot be empty');
  }

  // Add metadata to bookmarks file
  const bookmarksWithMetadata = {
    data: bookmarks,
    metadata: {
      version: '1.0',
      timestamp: new Date().toISOString(),
      bookmarkCount: countBookmarks(bookmarks),
    },
  };

  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `bookmarks_${timestamp}.json`;

  return uploadFile(filename, bookmarksWithMetadata, folderId, token);
}

/**
 * Download bookmarks file from Google Drive
 * @param {string} fileId - File ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - The bookmarks data
 */
export async function downloadBookmarksFile(fileId, token) {
  const result = await downloadFile(fileId, token);

  // Handle both old format (direct bookmarks) and new format (with metadata)
  if (result && result.data && result.metadata) {
    // New format with metadata
    return result.data;
  }

  // Old format (direct bookmarks)
  return result;
}

/**
 * Count bookmarks in a bookmark tree
 * @param {Object} bookmarks - Bookmarks data
 * @returns {number} - Number of bookmarks
 */
function countBookmarks(bookmarks) {
  let count = 0;

  function traverse(node) {
    // Count this node if it's a bookmark (has URL)
    if (node.url) {
      count++;
    }

    // Traverse children
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  // Handle array of bookmarks or single bookmark object
  if (Array.isArray(bookmarks)) {
    bookmarks.forEach(traverse);
  } else if (bookmarks) {
    traverse(bookmarks);
  }

  return count;
}

/**
 * Find or create the BookDrive folder
 * @param {string} token - Auth token
 * @returns {Promise<string>} - The folder ID
 */
export async function findOrCreateBookDriveFolder(token) {
  const makeRequest = async (currentToken) => {
    // Try to find existing folder
    const query = "name = 'BookDrive' and mimeType = 'application/vnd.google-apps.folder'";
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
      {
        headers: {
          Authorization: `Bearer ${currentToken}`,
        },
      },
    );

    const result = await handleApiResponse(response, currentToken, (newToken) =>
      makeRequest(newToken),
    );

    // If folder exists, return its ID
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }

    // Otherwise create the folder
    const folder = await createFolder('BookDrive', null, currentToken);
    return folder.id;
  };

  return makeRequest(token);
}
