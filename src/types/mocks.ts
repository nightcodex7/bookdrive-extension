import type { BookmarkNode } from './bookmarks';

export const createMockBookmarkTree = (): BookmarkNode[] => [
  {
    id: '1',
    title: 'Root',
    children: [
      {
        id: '2',
        title: 'Folder 1',
        children: [
          {
            id: '3',
            title: 'Bookmark 1',
            url: 'https://example.com'
          }
        ]
      }
    ]
  }
];

export const createMockSyncLog = () => ({
  time: new Date().toISOString(),
  mode: 'host',
  status: 'success',
  bookmarkCount: 10
});

export const createMockTeamMember = () => ({
  email: 'test@example.com',
  deviceId: 'test-device',
  lastSync: new Date().toISOString(),
  role: 'member' as const
});

export const createMockConflict = () => ({
  id: 'test-conflict',
  local: {
    id: '1',
    title: 'Local Bookmark',
    url: 'https://local.example.com'
  },
  remote: {
    id: '1',
    title: 'Remote Bookmark',
    url: 'https://remote.example.com'
  },
  type: 'title' as const
});