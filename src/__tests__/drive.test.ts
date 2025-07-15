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
    chrome.identity.getAuthToken.mockImplementation((options: chrome.identity.TokenDetails | undefined, callback: (result: { token?: string }) => void) => {
      callback({ token: 'mock-token' });
    });

    // Mock fetch for API calls
    global.fetch = jest.fn().mockImplementation((url) => {
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
    const mockData = { test: 'data' };
    await uploadBookmarksFile('host', mockData as chrome.bookmarks.BookmarkTreeNode[]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('files'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    );
  });
});
