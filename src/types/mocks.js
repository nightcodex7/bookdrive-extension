/**
 * Mock data for testing
 */

/**
 * Sample bookmark tree for testing
 * @type {import('./bookmarks').BookmarkTree}
 */
export const mockBookmarkTree = {
  roots: {
    bookmark_bar: {
      id: '1',
      title: 'Bookmarks Bar',
      children: [
        {
          id: '2',
          parentId: '1',
          index: 0,
          title: 'Google',
          url: 'https://www.google.com',
          dateAdded: Date.now().toString(),
        },
        {
          id: '3',
          parentId: '1',
          index: 1,
          title: 'Dev Folder',
          dateAdded: Date.now().toString(),
          dateGroupModified: Date.now().toString(),
          children: [
            {
              id: '4',
              parentId: '3',
              index: 0,
              title: 'GitHub',
              url: 'https://github.com',
              dateAdded: Date.now().toString(),
            },
            {
              id: '5',
              parentId: '3',
              index: 1,
              title: 'Stack Overflow',
              url: 'https://stackoverflow.com',
              dateAdded: Date.now().toString(),
            },
          ],
        },
      ],
    },
    other: {
      id: '6',
      title: 'Other Bookmarks',
      children: [],
    },
  },
};

/**
 * Sample sync config for testing
 * @type {import('./sync').SyncConfig}
 */
export const mockSyncConfig = {
  mode: 'host-to-many',
  autoSync: true,
  syncInterval: 60,
  syncOnStartup: true,
  syncOnBookmarkChange: true,
  notifyOnSync: true,
  deviceName: 'Test Device',
  deviceRole: 'host',
  lastSyncTime: Date.now().toString(),
};

/**
 * Sample device info for testing
 * @type {import('./sync').DeviceInfo}
 */
export const mockDeviceInfo = {
  id: 'device-123',
  name: 'Test Device',
  role: 'host',
  lastSyncTime: Date.now().toString(),
  lastSeen: Date.now().toString(),
  browserInfo: 'Chrome 100.0.0.0',
  osInfo: 'Windows 10',
};

export {};
