import {
  getAuthToken,
  downloadBookmarksFile,
  uploadBookmarksFile,
} from '../lib/drive';

describe('Drive Module', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock chrome.identity.getAuthToken
    (chrome.identity.getAuthToken as jest.Mock).mockImplementation((options: chrome.identity.TokenDetails | undefined, callback: (result: { token?: string }) => void) => {
      callback({ token: 'mock-token' });
    });

    // Mock fetch for API calls
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('files')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            files: [{
              id: 'mock-file-id',
              name: 'bookmarks.json',
            }],
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('gets auth token successfully', async () => {
    const token = await getAuthToken();
    expect(token).toBe('mock-token');
    expect(chrome.identity.getAuthToken).toHaveBeenCalledWith(
      { interactive: true },
      expect.any(Function)
    );
  });

  it('downloads bookmarks file', async () => {
    await downloadBookmarksFile('host');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('files'),
      expect.any(Object)
    );
  });

  it('uploads bookmarks file', async () => {
    const mockData = [{ 
      id: '1', 
      title: 'Test Bookmark',
      url: 'https://example.com',
      syncing: false
    }];
    await uploadBookmarksFile('host', mockData as unknown as chrome.bookmarks.BookmarkTreeNode[]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('files'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
  });
});
