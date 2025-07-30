// Jest setup file for BookDrive extension tests

// Mock Chrome APIs
const createChromeMock = () => ({
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (key === 'bookDriveAuthToken') result[key] = 'test-token';
            if (key === 'bookDriveTokenExpiry') result[key] = Date.now() + 3600000;
            if (key === 'bookDriveRefreshToken') result[key] = 'refresh-token';
            if (key === 'bookDriveAuthMethod') result[key] = 'chrome_identity';
            if (key === 'bookDriveUserInfo') result[key] = { email: 'test@example.com' };
            if (key === 'bookDriveFolderId') result[key] = 'folder-123';
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            if (key === 'bookDriveAuthToken') result[key] = 'test-token';
            if (key === 'bookDriveTokenExpiry') result[key] = Date.now() + 3600000;
            if (key === 'bookDriveRefreshToken') result[key] = 'refresh-token';
            if (key === 'bookDriveAuthMethod') result[key] = 'chrome_identity';
            if (key === 'bookDriveUserInfo') result[key] = { email: 'test@example.com' };
            if (key === 'bookDriveFolderId') result[key] = 'folder-123';
          });
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((data, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
    sync: {
      get: jest.fn((keys, callback) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (key === 'bookDriveAuthToken') result[key] = 'test-token';
            if (key === 'bookDriveTokenExpiry') result[key] = Date.now() + 3600000;
            if (key === 'bookDriveRefreshToken') result[key] = 'refresh-token';
            if (key === 'bookDriveAuthMethod') result[key] = 'chrome_identity';
            if (key === 'bookDriveUserInfo') result[key] = { email: 'test@example.com' };
            if (key === 'bookDriveFolderId') result[key] = 'folder-123';
          });
        } else if (typeof keys === 'object') {
          Object.keys(keys).forEach(key => {
            if (key === 'bookDriveAuthToken') result[key] = 'test-token';
            if (key === 'bookDriveTokenExpiry') result[key] = Date.now() + 3600000;
            if (key === 'bookDriveRefreshToken') result[key] = 'refresh-token';
            if (key === 'bookDriveAuthMethod') result[key] = 'chrome_identity';
            if (key === 'bookDriveUserInfo') result[key] = { email: 'test@example.com' };
            if (key === 'bookDriveFolderId') result[key] = 'folder-123';
          });
        }
        if (callback) callback(result);
        return Promise.resolve(result);
      }),
      set: jest.fn((data, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) callback();
        return Promise.resolve();
      }),
    },
  },
  identity: {
    getAuthToken: jest.fn((options, callback) => {
      if (callback) callback('mock-token');
      return Promise.resolve('mock-token');
    }),
    removeCachedAuthToken: jest.fn((options, callback) => {
      if (callback) callback();
      return Promise.resolve();
    }),
    getRedirectURL: jest.fn(() => 'https://mock-redirect-url.com'),
  },
  runtime: {
    lastError: null,
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    sendMessage: jest.fn((message, callback) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    }),
    getManifest: jest.fn(() => ({
      oauth2: {
        client_id: 'test-client-id.apps.googleusercontent.com',
      },
    })),
  },
  alarms: {
    create: jest.fn((name, alarmInfo) => Promise.resolve()),
    clear: jest.fn((name) => Promise.resolve(true)),
    get: jest.fn((name) => Promise.resolve(null)),
    getAll: jest.fn(() => Promise.resolve([])),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  bookmarks: {
    get: jest.fn(() => Promise.resolve([])),
    create: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
    update: jest.fn(() => Promise.resolve({ id: 'mock-id' })),
    remove: jest.fn(() => Promise.resolve()),
    getTree: jest.fn(() => Promise.resolve([])),
  },
  tabs: {
    query: jest.fn(() => Promise.resolve([])),
    create: jest.fn(() => Promise.resolve({ id: 'mock-tab-id' })),
    onUpdated: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  windows: {
    create: jest.fn((options, callback) => {
      const result = { id: 'mock-window-id' };
      if (callback) callback(result);
      return Promise.resolve(result);
    }),
  },
});

// Set up global chrome mock
global.chrome = createChromeMock();

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock navigator APIs
global.navigator = {
  ...global.navigator,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  onLine: true,
  getBattery: jest.fn().mockResolvedValue({
    charging: true,
    level: 0.8,
    chargingTime: 3600,
    dischargingTime: Infinity,
  }),
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlinkMax: 10,
    downlink: 5,
    rtt: 50,
    saveData: false,
  },
};

// Allow setting onLine property for testing
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  configurable: true,
  value: true,
});

// Mock performance API
global.performance = {
  ...global.performance,
  memory: {
    totalJSHeapSize: 100000000,
    usedJSHeapSize: 50000000,
    jsHeapSizeLimit: 200000000,
  },
  now: jest.fn(() => Date.now()),
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(() => callback(performance.now()), 16);
  return 1;
});

// Mock Date.now() for consistent testing - Fixed date: July 17, 2025, 12:00:00
const originalDateNow = Date.now;
const mockDate = new Date(2025, 6, 17, 12, 0, 0); // July 17, 2025, 12:00:00

Date.now = jest.fn(() => mockDate.getTime());

// Mock Date constructor for consistent testing
const RealDate = global.Date;
global.Date = class extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      return new RealDate(mockDate);
    }
    return new RealDate(...args);
  }
  
  static now() {
    return mockDate.getTime();
  }
};

// Keep the real toISOString method
global.Date.prototype.toISOString = RealDate.prototype.toISOString;

// Restore original Date after tests
afterAll(() => {
  Date.now = originalDateNow;
  global.Date = RealDate;
});
