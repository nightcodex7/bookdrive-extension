/**
 * Google Drive Authentication with Enhanced Cross-Browser Compatibility
 * Provides seamless Google Sign-In using Chrome Identity API or fallback OAuth2 flow
 *
 * NOTE: For production deployment, complete Google's OAuth API verification process
 * to eliminate the "unverified app" warning. This extension uses the browser's
 * native Google account manager for secure authentication.
 *
 * TEMPLATE FILE: Replace YOUR_OAUTH2_CLIENT_ID with your actual client ID
 */

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: 'bookDriveAuthToken',
  USER_INFO: 'bookDriveUserInfo',
  FOLDER_ID: 'bookDriveFolderId',
  AUTH_METHOD: 'bookDriveAuthMethod',
  REFRESH_TOKEN: 'bookDriveRefreshToken',
  TOKEN_EXPIRY: 'bookDriveTokenExpiry',
};

// OAuth2 Configuration
const OAUTH2_CONFIG = {
  client_id: 'YOUR_OAUTH2_CLIENT_ID.apps.googleusercontent.com', // Replace with your actual client ID
  redirect_uri: chrome.identity
    ? chrome.identity.getRedirectURL()
    : 'https://oauth-redirect.googleusercontent.com/r/bookdrive-extension',
  scope:
    'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.file',
  auth_url: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_url: 'https://oauth2.googleapis.com/token',
  userinfo_url: 'https://www.googleapis.com/oauth2/v3/userinfo',
};

// Browser detection with enhanced accuracy
function getBrowserType() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Edg/')) return 'edge';
  if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) return 'chrome';
  if (userAgent.includes('Firefox/')) return 'firefox';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome/')) return 'safari';
  return 'unknown';
}

// Enhanced Chrome Identity API support check
function isChromeIdentitySupported() {
  return (
    typeof chrome !== 'undefined' &&
    chrome.identity &&
    chrome.identity.getAuthToken &&
    typeof chrome.identity.getAuthToken === 'function' &&
    getBrowserType() === 'chrome'
  );
}

/**
 * Get OAuth2 client ID from manifest with enhanced error handling
 * @returns {Promise<string>} OAuth2 client ID
 */
async function getOAuth2ClientId() {
  try {
    // Try to get from manifest
    const manifest = chrome.runtime.getManifest();
    if (
      manifest.oauth2 &&
      manifest.oauth2.client_id &&
      manifest.oauth2.client_id !== 'YOUR_OAUTH2_CLIENT_ID.apps.googleusercontent.com'
    ) {
      return manifest.oauth2.client_id;
    }

    // Fallback to stored value or default
    const result = await chrome.storage.local.get('oauth2_client_id');
    return result.oauth2_client_id || OAUTH2_CONFIG.client_id;
  } catch (error) {
    console.error('Failed to get OAuth2 client ID:', error);
    return OAUTH2_CONFIG.client_id;
  }
}

// ... rest of the file remains the same as the original ...
