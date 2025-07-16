import { exportBookmarksTree, exportBookmarksState } from '../lib/bookmarks';

const mockBookmarkTree = [
  {
    id: '1',
    title: 'Bookmarks Bar',
    syncing: false,
    children: [
      {
        id: '2',
        title: 'Example Folder',
        syncing: false,
        children: [
          {
            id: '3',
            title: 'Example Website',
            url: 'https://example.com',
            syncing: false,
          },
        ],
      },
    ],
  },
];

describe('Bookmarks Module', () => {
  beforeEach(() => {
    // Using the mock from jest.setup.js
    (chrome.bookmarks.getTree as jest.Mock).mockImplementation((callback: (results: chrome.bookmarks.BookmarkTreeNode[]) => void) => {
      callback(mockBookmarkTree);
    });
  });

  it('exports bookmarks tree', async () => {
    const tree = await exportBookmarksTree();
    expect(tree).toEqual(mockBookmarkTree);
    expect(chrome.bookmarks.getTree).toHaveBeenCalled();
  });

  it('exports bookmarks state with folders and bookmarks', async () => {
    // Mock for testing
    Object.defineProperty(navigator, 'userAgent', {
      value: 'MockBrowser',
      writable: true,
    });
    Object.defineProperty(navigator, 'platform', {
      value: 'MockOS',
      writable: true,
    });

    const state = await exportBookmarksState();
    
    expect(state).toHaveProperty('folders');
    expect(state).toHaveProperty('bookmarks');
    expect(state).toHaveProperty('device');
    expect(state).toHaveProperty('timestamp');
    expect(state).toHaveProperty('hash');
    expect(state.device).toContain('MockBrowser');
    expect(state.device).toContain('MockOS');
  });
});
