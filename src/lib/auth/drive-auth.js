// OAuth2 Configuration
const OAUTH2_CONFIG = {
  client_id: '334418543802-7nrfirqu0eofke7v822mscng2ouhlsfj.apps.googleusercontent.com', // Will be replaced from manifest
  client_secret: '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', // Client secret for OAuth2 flow
  redirect_uri: chrome.identity
    ? chrome.identity.getRedirectURL()
    : 'https://YOUR_EXTENSION_ID.chromiumapp.org/',
  scope:
    'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file',
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

/**
 * Get the correct redirect URI based on browser and context
 * @returns {string} Redirect URI
 */
function getRedirectUri() {
  const browserType = getBrowserType();

  if (browserType === 'chrome' && chrome.identity && chrome.identity.getRedirectURL) {
    // Use Chrome Identity API redirect URL (https://${chrome.runtime.id}.chromiumapp.org/)
    return chrome.identity.getRedirectURL();
  } else {
    // For Edge and other browsers, use the proper Chrome extension redirect URI pattern
    return `https://${chrome.runtime.id}.chromiumapp.org/`;
  }
}

/**
 * Generate random state parameter for OAuth2 security
 * @returns {string} Random state string
 */
function generateState() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get Google OAuth token using Chrome Identity API (Chrome browsers)
 * @param {boolean} interactive - Whether to show account picker
 * @returns {Promise<string>} OAuth token
 */
async function getAuthTokenChrome(interactive = false) {
  try {
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive }, (token) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError;
          console.error('Chrome Identity API error:', error);

          // Handle specific error cases
          if (error.message.includes('OAuth2 client not found')) {
            reject(new Error('OAuth2 client not configured. Please check your manifest.json'));
          } else if (error.message.includes('User not signed in')) {
            reject(new Error('User not signed in to Chrome'));
          } else {
            reject(new Error(`Chrome Identity API failed: ${error.message}`));
          }
          return;
        }
        resolve(token);
      });
    });

    // Store token and method
    await chrome.storage.local.set({
      [STORAGE_KEYS.AUTH_TOKEN]: token,
      [STORAGE_KEYS.AUTH_METHOD]: 'chrome_identity',
    });
    return token;
  } catch (error) {
    console.error('Chrome Identity API failed:', error);
    throw error;
  }
}

/**
 * Get Google OAuth token using fallback OAuth2 flow (non-Chrome browsers)
 * @param {boolean} interactive - Whether to show account picker
 * @returns {Promise<string>} OAuth token
 */
async function getAuthTokenFallback(interactive = false) {
  try {
    const clientId = await getOAuth2ClientId();
    const redirectUri = getRedirectUri();
    const state = generateState();
    const scope = OAUTH2_CONFIG.scope;

    // Store state for verification
    await chrome.storage.local.set({ oauth2_state: state });

    // Build authorization URL
    const authUrl = new URL(OAUTH2_CONFIG.auth_url);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', interactive ? 'consent' : 'none');

    // Open auth window
    const windowId = await new Promise((resolve, reject) => {
      chrome.windows.create(
        {
          url: authUrl.toString(),
          type: 'popup',
          width: 500,
          height: 600,
        },
        (window) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(window.id);
          }
        },
      );
    });

    // Wait for auth code
    const authCode = await waitForAuthCode(windowId, state);

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(authCode);

    // Store tokens
    await chrome.storage.local.set({
      [STORAGE_KEYS.AUTH_TOKEN]: tokens.access_token,
      [STORAGE_KEYS.REFRESH_TOKEN]: tokens.refresh_token,
      [STORAGE_KEYS.TOKEN_EXPIRY]: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      [STORAGE_KEYS.AUTH_METHOD]: 'oauth2_fallback',
    });

    return tokens.access_token;
  } catch (error) {
    console.error('OAuth2 fallback flow failed:', error);
    throw error;
  }
}

/**
 * Wait for OAuth2 authorization code from popup window
 * @param {number} windowId - Chrome window ID
 * @param {string} state - OAuth2 state parameter
 * @returns {Promise<string>} Authorization code
 */
async function waitForAuthCode(windowId, state) {
  return new Promise((resolve, reject) => {
    const listener = (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        const url = new URL(tab.url);

        // Check if this is our redirect URI
        if (url.origin === new URL(getRedirectUri()).origin) {
          const code = url.searchParams.get('code');
          const returnedState = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.windows.remove(windowId);
            reject(new Error(`OAuth2 error: ${error}`));
            return;
          }

          if (code && returnedState === state) {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.windows.remove(windowId);
            resolve(code);
            return;
          }
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Timeout after 5 minutes
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      chrome.windows.remove(windowId);
      reject(new Error('OAuth2 authorization timeout'));
    }, 300000);
  });
}

/**
 * Exchange authorization code for access and refresh tokens
 * @param {string} code - Authorization code
 * @returns {Promise<Object>} Token response
 */
async function exchangeCodeForTokens(code) {
  const clientId = await getOAuth2ClientId();
  const clientSecret = OAUTH2_CONFIG.client_secret;
  const redirectUri = getRedirectUri();

  const response = await fetch(OAUTH2_CONFIG.token_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<string>} New access token
 */
async function refreshAccessToken(refreshToken) {
  const clientId = await getOAuth2ClientId();
  const clientSecret = OAUTH2_CONFIG.client_secret;

  const response = await fetch(OAUTH2_CONFIG.token_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokens = await response.json();

  // Update stored tokens
  await chrome.storage.local.set({
    [STORAGE_KEYS.AUTH_TOKEN]: tokens.access_token,
    [STORAGE_KEYS.TOKEN_EXPIRY]: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
  });

  return tokens.access_token;
}

// Storage keys for OAuth2 tokens
const STORAGE_KEYS = {
  AUTH_TOKEN: 'bookDriveAuthToken',
  REFRESH_TOKEN: 'bookDriveRefreshToken',
  TOKEN_EXPIRY: 'bookDriveTokenExpiry',
  AUTH_METHOD: 'bookDriveAuthMethod',
  USER_INFO: 'bookDriveUserInfo',
};

/**
 * Get Google OAuth token with automatic method selection
 * @param {boolean} interactive - Whether to show account picker
 * @returns {Promise<string>} OAuth token
 */
export async function getAuthToken(interactive = false) {
  try {
    // Check if we have a valid stored token
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRY,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.AUTH_METHOD,
    ]);

    if (stored[STORAGE_KEYS.AUTH_TOKEN] && stored[STORAGE_KEYS.TOKEN_EXPIRY]) {
      const expiry = new Date(stored[STORAGE_KEYS.TOKEN_EXPIRY]);
      if (expiry > new Date()) {
        return stored[STORAGE_KEYS.AUTH_TOKEN];
      }

      // Token expired, try to refresh
      if (
        stored[STORAGE_KEYS.REFRESH_TOKEN] &&
        stored[STORAGE_KEYS.AUTH_METHOD] === 'oauth2_fallback'
      ) {
        try {
          return await refreshAccessToken(stored[STORAGE_KEYS.REFRESH_TOKEN]);
        } catch (error) {
          console.error('Token refresh failed, will re-authenticate:', error);
        }
      }
    }

    // Get new token using appropriate method
    if (isChromeIdentitySupported()) {
      return await getAuthTokenChrome(interactive);
    } else {
      return await getAuthTokenFallback(interactive);
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
    throw error;
  }
}

/**
 * Get user information from Google
 * @param {string} token - OAuth token
 * @returns {Promise<Object>} User information
 */
export async function getUserInfo(token) {
  try {
    const response = await fetch(OAUTH2_CONFIG.userinfo_url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    const userInfo = await response.json();

    // Store user info
    await chrome.storage.local.set({ [STORAGE_KEYS.USER_INFO]: userInfo });

    return userInfo;
  } catch (error) {
    console.error('Failed to get user info:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Authentication status
 */
export async function isAuthenticated() {
  try {
    const stored = await chrome.storage.local.get([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRY,
    ]);

    if (!stored[STORAGE_KEYS.AUTH_TOKEN] || !stored[STORAGE_KEYS.TOKEN_EXPIRY]) {
      return false;
    }

    const expiry = new Date(stored[STORAGE_KEYS.TOKEN_EXPIRY]);
    return expiry > new Date();
  } catch (error) {
    console.error('Failed to check authentication status:', error);
    return false;
  }
}

/**
 * Sign in user
 * @returns {Promise<Object>} User information
 */
export async function signIn() {
  try {
    const token = await getAuthToken(true);
    const userInfo = await getUserInfo(token);
    return userInfo;
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
}

/**
 * Sign out user
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    // Clear stored tokens and user info
    await chrome.storage.local.remove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRY,
      STORAGE_KEYS.AUTH_METHOD,
      STORAGE_KEYS.USER_INFO,
    ]);

    // Remove cached token from Chrome Identity API
    if (chrome.identity && chrome.identity.removeCachedAuthToken) {
      const clientId = await getOAuth2ClientId();
      await new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ client_id: clientId }, resolve);
      });
    }
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
}

/**
 * Get stored user information
 * @returns {Promise<Object|null>} Stored user information
 */
export async function getStoredUserInfo() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.USER_INFO);
    return result[STORAGE_KEYS.USER_INFO] || null;
  } catch (error) {
    console.error('Failed to get stored user info:', error);
    return null;
  }
}

/**
 * Ensure BookDrive folder exists in Google Drive
 * @param {boolean} createIfMissing - Whether to create folder if missing
 * @returns {Promise<string|null>} Folder ID or null
 */
export async function ensureBookDriveFolder(createIfMissing = true) {
  try {
    const token = await getAuthToken();

    // Check if folder already exists
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?' +
        'q=name="BookDrive" and mimeType="application/vnd.google-apps.folder" and trashed=false',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to check folder existence: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    if (!createIfMissing) {
      return null;
    }

    // Create folder
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'BookDrive',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create folder: ${createResponse.statusText}`);
    }

    const folder = await createResponse.json();
    return folder.id;
  } catch (error) {
    console.error('Failed to ensure BookDrive folder:', error);
    throw error;
  }
}

/**
 * Get browser compatibility information
 * @returns {Object} Compatibility information
 */
export function getBrowserCompatibility() {
  const browserType = getBrowserType();
  const chromeIdentitySupported = isChromeIdentitySupported();

  return {
    browserType,
    chromeIdentitySupported,
    recommendedMethod: chromeIdentitySupported ? 'chrome_identity' : 'oauth2_fallback',
    features: {
      chromeIdentity: chromeIdentitySupported,
      oauth2Fallback: true,
      storage: typeof chrome !== 'undefined' && chrome.storage,
      windows: typeof chrome !== 'undefined' && chrome.windows,
      tabs: typeof chrome !== 'undefined' && chrome.tabs,
    },
  };
}
