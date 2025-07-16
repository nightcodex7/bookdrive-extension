// Mock Chrome API for testing
global.chrome = {
  bookmarks: {
    getTree: jest.fn().mockImplementation(callback => callback([])),
    create: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    getChildren: jest.fn(),
    removeTree: jest.fn(),
  },
  identity: {
    getAuthToken: jest.fn().mockImplementation((details, callback) => {
      if (typeof callback === 'function') {
        callback({ token: 'mock-token' });
      }
      return Promise.resolve({ token: 'mock-token' });
    }),
    removeCachedAuthToken: jest.fn(),
    launchWebAuthFlow: jest.fn(),
  },
  storage: {
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn(),
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
};

// Mock fetch for API calls
global.fetch = jest.fn().mockImplementation((url) => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve('{}'),
  });
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
