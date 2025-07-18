import { getAuthToken, downloadBookmarksFile, uploadBookmarksFile } from '../lib/drive';

describe('Drive Module', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock chrome.identity.getAuthToken
    global.chrome = {
      identity: {
        getAuthToken: jest.fn((options, callback) => {
          callback('mock-token');
        }),
        removeCachedAuthToken: jest.fn(),
      },
      runtime: {
        lastError: null,
      },
    };

    // Mock fetch for API calls
    global.fetch.mockImplementation((url) => {
      if (url.includes('files')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              files: [
                {
                  id: 'mock-file-id',
                  name: 'bookmarks.json',
                },
              ],
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
