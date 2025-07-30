import { downloadBookmarksFile, uploadBookmarksFile } from '../lib/drive';
import { getAuthToken } from '../lib/auth/drive-auth.js';

// Mock chrome API
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn(),
    getRedirectURL: jest.fn(),
  },
  runtime: {
    id: 'test-extension-id',
    getManifest: jest.fn(() => ({ oauth2: { client_id: 'test-client-id' } })),
  },
};

// Mock fetch
global.fetch = jest.fn();

describe('Drive Module', () => {
  let mockStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = {
      bookDriveAuthToken: 'test-token',
      bookDriveTokenExpiry: new Date(Date.now() + 3600000).toISOString(),
      bookDriveRefreshToken: 'test-refresh-token',
      bookDriveAuthMethod: 'chrome_identity',
    };

    // Mock navigator.userAgent to ensure getBrowserType() returns 'chrome'
    Object.defineProperty(navigator, 'userAgent', {
      value:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });

    // Mock chrome.storage.local
    chrome.storage.local.get.mockImplementation((key, callback) => {
      if (typeof key === 'object') {
        const result = {};
        Object.keys(key).forEach((k) => {
          result[k] = mockStorage[k] !== undefined ? mockStorage[k] : key[k];
        });
        if (callback) callback(result);
      } else {
        if (callback) callback({ [key]: mockStorage[key] || null });
      }
    });
    chrome.storage.local.set.mockImplementation((obj, callback) => {
      Object.keys(obj).forEach((key) => {
        mockStorage[key] = obj[key];
      });
      if (callback) callback();
    });

    // Mock chrome.storage.sync
    chrome.storage.sync.get.mockImplementation((key, callback) => {
      if (typeof key === 'object') {
        const result = {};
        Object.keys(key).forEach((k) => {
          result[k] = mockStorage[k] !== undefined ? mockStorage[k] : key[k];
        });
        if (callback) callback(result);
      } else {
        if (callback) callback({ [key]: mockStorage[key] || null });
      }
    });
    chrome.storage.sync.set.mockImplementation((obj, callback) => {
      Object.keys(obj).forEach((key) => {
        mockStorage[key] = obj[key];
      });
      if (callback) callback();
    });

    // Mock chrome.identity
    chrome.identity.getAuthToken.mockImplementation((details, callback) => {
      if (callback) callback('test-auth-token');
    });
    chrome.identity.removeCachedAuthToken.mockImplementation((details, callback) => {
      if (callback) callback();
    });
    chrome.identity.getRedirectURL.mockReturnValue('https://example.com/redirect');
  });

  it('gets auth token successfully', async () => {
    const token = await getAuthToken();
    expect(token).toBe('test-auth-token');
    expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
      { interactive: false },
      expect.any(Function),
    );
  });

  it('downloads bookmarks file', async () => {
    await downloadBookmarksFile('host');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('files'), expect.any(Object));
  });

  it('uploads bookmarks file', async () => {
    const mockData = [
      {
        id: '1',
        title: 'Test Bookmark',
        url: 'https://example.com',
        syncing: false,
      },
    ];
    await uploadBookmarksFile('host', mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('files'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }),
    );
  });
});
