// drive-auth.js - Google Drive authentication and folder management

const FOLDER_NAME = 'MyExtensionData'; // Changed to match requirements
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

// Toast notification for auth events
function showAuthNotification(message, type = 'info') {
  chrome.runtime.sendMessage({
    action: 'showNotification',
    message,
    type,
  });
}

/**
 * Get an OAuth2 token for Google Drive API with proper error handling
 * @param {boolean} interactive Whether to show the auth popup
 * @returns {Promise<string>} The OAuth2 token
 */
export async function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        console.error('Auth error:', chrome.runtime.lastError);

        // Show user-friendly notification
        if (interactive) {
          showAuthNotification(
            `Authentication error: ${chrome.runtime.lastError.message}`,
            'error',
          );
        }

        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!token) {
        if (interactive) {
          showAuthNotification('Failed to get authentication token. Please try again.', 'error');
        }
        reject(new Error('Failed to get auth token'));
        return;
      }

      if (interactive) {
        showAuthNotification('Successfully authenticated with Google', 'success');
      }

      resolve(token);
    });
  });
}

/**
 * Refresh the OAuth token if it's expired
 * @param {string} oldToken The expired token
 * @returns {Promise<string>} A new valid token
 */
export async function refreshToken(oldToken) {
  return new Promise((resolve, reject) => {
    chrome.identity.removeCachedAuthToken({ token: oldToken }, () => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) {
          console.error(
            'Token refresh failed:',
            chrome.runtime.lastError?.message || 'No token returned',
          );

          // Try one more time with interactive mode if silent refresh fails
          chrome.identity.getAuthToken({ interactive: true }, (interactiveToken) => {
            if (chrome.runtime.lastError || !interactiveToken) {
              showAuthNotification('Failed to refresh authentication token', 'error');
              reject(new Error('Failed to refresh token'));
            } else {
              showAuthNotification('Authentication refreshed', 'success');
              resolve(interactiveToken);
            }
          });
        } else {
          resolve(token);
        }
      });
    });
  });
}

/**
 * Handle API request with token refresh if needed
 * @param {string} url API endpoint
 * @param {Object} options Fetch options
 * @param {string} token Auth token
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTokenRefresh(url, options, token) {
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  };

  try {
    const response = await fetch(url, authOptions);

    // If unauthorized, try refreshing token
    if (response.status === 401) {
      const newToken = await refreshToken(token);
      authOptions.headers.Authorization = `Bearer ${newToken}`;
      return fetch(url, authOptions);
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * Check if the extension folder exists, create if not
 * @param {boolean} interactive Whether to show auth dialog if needed
 * @returns {Promise<string>} Folder ID
 */
export async function ensureBookDriveFolder(interactive = true) {
  try {
    // First check if we have a stored folder ID
    const stored = await new Promise((resolve) => {
      chrome.storage.local.get(['bookDriveFolderId'], (result) => {
        resolve(result.bookDriveFolderId);
      });
    });

    if (stored) {
      // Verify the folder still exists
      try {
        const token = await getAuthToken(false);
        const response = await fetchWithTokenRefresh(
          `${DRIVE_API}/files/${stored}?fields=id,name,trashed`,
          { method: 'GET' },
          token,
        );

        if (response.ok) {
          const folder = await response.json();
          if (!folder.trashed) {
            console.log(`Using existing ${FOLDER_NAME} folder:`, folder.name);
            showAuthNotification(`Using existing ${FOLDER_NAME} folder`, 'info');
            return stored;
          }
        }
      } catch (error) {
        console.warn('Stored folder ID is invalid, creating new folder');
      }
    }

    // Get auth token - this will prompt the user if needed
    const token = await getAuthToken(interactive);

    // Create a new folder
    const response = await fetchWithTokenRefresh(
      `${DRIVE_API}/files`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      },
      token,
    );

    if (!response.ok) {
      const errorMsg = `Failed to create folder: ${response.statusText}`;
      showAuthNotification(errorMsg, 'error');
      throw new Error(errorMsg);
    }

    const folder = await response.json();

    // Store the folder ID for future use
    chrome.storage.local.set({ bookDriveFolderId: folder.id });

    console.log(`Created new ${FOLDER_NAME} folder:`, folder.name);
    showAuthNotification(`Created ${FOLDER_NAME} folder successfully`, 'success');
    return folder.id;
  } catch (error) {
    console.error(`Failed to ensure ${FOLDER_NAME} folder:`, error);
    showAuthNotification(`Failed to create ${FOLDER_NAME} folder: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * List files in the BookDrive folder
 * @returns {Promise<Array>} List of files
 */
export async function listFiles() {
  try {
    const folderId = await ensureBookDriveFolder();
    const token = await getAuthToken(false);

    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const response = await fetchWithTokenRefresh(
      `${DRIVE_API}/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)`,
      { method: 'GET' },
      token,
    );

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Failed to list files:', error);
    throw error;
  }
}

/**
 * Create or update a file in the BookDrive folder
 * @param {string} filename File name
 * @param {Object|string} content File content
 * @param {string} [mimeType='application/json'] MIME type
 * @returns {Promise<Object>} Created/updated file metadata
 */
export async function saveFile(filename, content, mimeType = 'application/json') {
  try {
    const folderId = await ensureBookDriveFolder();
    const token = await getAuthToken(false);

    // Check if file already exists
    const query = encodeURIComponent(
      `name='${filename}' and '${folderId}' in parents and trashed=false`,
    );
    const searchResponse = await fetchWithTokenRefresh(
      `${DRIVE_API}/files?q=${query}&fields=files(id)`,
      { method: 'GET' },
      token,
    );

    if (!searchResponse.ok) {
      throw new Error(`Failed to search for file: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    const fileExists = searchData.files && searchData.files.length > 0;
    const fileId = fileExists ? searchData.files[0].id : null;

    // Prepare content
    const body = typeof content === 'string' ? content : JSON.stringify(content);

    if (fileExists) {
      // Update existing file
      const updateResponse = await fetchWithTokenRefresh(
        `${DRIVE_UPLOAD_API}/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': mimeType,
          },
          body,
        },
        token,
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update file: ${updateResponse.statusText}`);
      }

      return updateResponse.json();
    } else {
      // Create new file
      const metadata = {
        name: filename,
        parents: [folderId],
      };

      const boundary = '-------314159265358979323846';
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelimiter = '\r\n--' + boundary + '--';

      const multipartBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${mimeType}\r\n\r\n` +
        body +
        closeDelimiter;

      const createResponse = await fetchWithTokenRefresh(
        `${DRIVE_UPLOAD_API}/files?uploadType=multipart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartBody,
        },
        token,
      );

      if (!createResponse.ok) {
        throw new Error(`Failed to create file: ${createResponse.statusText}`);
      }

      return createResponse.json();
    }
  } catch (error) {
    console.error('Failed to save file:', error);
    throw error;
  }
}

/**
 * Read a file from the BookDrive folder
 * @param {string} filename File name
 * @returns {Promise<Object|string>} File content
 */
export async function readFile(filename) {
  try {
    const folderId = await ensureBookDriveFolder();
    const token = await getAuthToken(false);

    // Find the file
    const query = encodeURIComponent(
      `name='${filename}' and '${folderId}' in parents and trashed=false`,
    );
    const searchResponse = await fetchWithTokenRefresh(
      `${DRIVE_API}/files?q=${query}&fields=files(id,mimeType)`,
      { method: 'GET' },
      token,
    );

    if (!searchResponse.ok) {
      throw new Error(`Failed to search for file: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    if (!searchData.files || searchData.files.length === 0) {
      throw new Error(`File not found: ${filename}`);
    }

    const fileId = searchData.files[0].id;
    const mimeType = searchData.files[0].mimeType;

    // Download the file
    const downloadResponse = await fetchWithTokenRefresh(
      `${DRIVE_API}/files/${fileId}?alt=media`,
      { method: 'GET' },
      token,
    );

    if (!downloadResponse.ok) {
      throw new Error(`Failed to download file: ${downloadResponse.statusText}`);
    }

    // Parse content based on MIME type
    if (mimeType === 'application/json') {
      return downloadResponse.json();
    } else {
      return downloadResponse.text();
    }
  } catch (error) {
    console.error('Failed to read file:', error);
    throw error;
  }
}

/**
 * Delete a file from the BookDrive folder
 * @param {string} filename File name
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFile(filename) {
  try {
    const folderId = await ensureBookDriveFolder();
    const token = await getAuthToken(false);

    // Find the file
    const query = encodeURIComponent(
      `name='${filename}' and '${folderId}' in parents and trashed=false`,
    );
    const searchResponse = await fetchWithTokenRefresh(
      `${DRIVE_API}/files?q=${query}&fields=files(id)`,
      { method: 'GET' },
      token,
    );

    if (!searchResponse.ok) {
      throw new Error(`Failed to search for file: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    if (!searchData.files || searchData.files.length === 0) {
      throw new Error(`File not found: ${filename}`);
    }

    const fileId = searchData.files[0].id;

    // Delete the file
    const deleteResponse = await fetchWithTokenRefresh(
      `${DRIVE_API}/files/${fileId}`,
      { method: 'DELETE' },
      token,
    );

    return deleteResponse.ok;
  } catch (error) {
    console.error('Failed to delete file:', error);
    throw error;
  }
}

/**
 * Check if the user is authenticated
 * @returns {Promise<boolean>} Authentication status
 */
export async function isAuthenticated() {
  try {
    await getAuthToken(false);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Sign out and revoke the token
 * @returns {Promise<void>}
 */
export async function signOut() {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      if (token) {
        // Revoke token
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
          .then(() => {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              chrome.storage.local.remove(['bookDriveFolderId'], resolve);
            });
          })
          .catch(() => {
            // Even if revoke fails, remove from cache
            chrome.identity.removeCachedAuthToken({ token }, () => {
              chrome.storage.local.remove(['bookDriveFolderId'], resolve);
            });
          });
      } else {
        resolve();
      }
    });
  });
}
