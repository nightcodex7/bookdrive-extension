/**
 * Tests for Google Drive API implementation
 */

import * as driveApi from '../lib/drive.js';

// Mock chrome.identity API
global.chrome = {
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn(),
  },
  runtime: {
    lastError: null,
  },
};

// Mock fetch API
global.fetch = jest.fn();

describe('Google Drive API', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    global.chrome.runtime.lastError = null;
    
    // Default successful auth token response
    global.chrome.identity.getAuthToken.mockImplementation((options, callback) => {
      callback('test-token');
    });
    
    // Default successful fetch response
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
  });
  
  describe('getAuthToken', () => {
    it('should return a token when successful', async () => {
      const token = await driveApi.getAuthToken();
      expect(token).toBe('test-token');
      expect(global.chrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: false },
        expect.any(Function)
      );
    });
    
    it('should handle chrome runtime errors', async () => {
      global.chrome.runtime.lastError = { message: 'Auth error' };
      
      await expect(driveApi.getAuthToken()).rejects.toThrow('Auth error');
    });
    
    it('should handle missing token', async () => {
      global.chrome.identity.getAuthToken.mockImplementation((options, callback) => {
        callback(null);
      });
      
      await expect(driveApi.getAuthToken()).rejects.toThrow('Failed to get auth token');
    });
    
    it('should use interactive mode when specified', async () => {
      await driveApi.getAuthToken(true);
      expect(global.chrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: true },
        expect.any(Function)
      );
    });
  });
  
  describe('refreshAuthToken', () => {
    it('should remove cached token and get a new one', async () => {
      const newToken = await driveApi.refreshAuthToken('old-token');
      
      expect(global.chrome.identity.removeCachedAuthToken).toHaveBeenCalledWith(
        { token: 'old-token' },
        expect.any(Function)
      );
      
      expect(global.chrome.identity.getAuthToken).toHaveBeenCalledWith(
        { interactive: true },
        expect.any(Function)
      );
      
      expect(newToken).toBe('test-token');
    });
  });
  
  describe('createFolder', () => {
    it('should create a folder successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'folder-123', name: 'Test Folder' }),
      });
      
      const result = await driveApi.createFolder('Test Folder', null, 'test-token');
      
      expect(result).toEqual({ id: 'folder-123', name: 'Test Folder' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
          body: expect.stringContaining('Test Folder'),
        })
      );
    });
    
    it('should handle API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });
      
      await expect(driveApi.createFolder('Test Folder', null, 'test-token'))
        .rejects.toThrow('API request failed: 400 Bad Request');
    });
    
    it('should handle authentication errors and refresh token', async () => {
      // First call fails with 401, second call succeeds
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      }).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'folder-123', name: 'Test Folder' }),
      });
      
      const result = await driveApi.createFolder('Test Folder', null, 'test-token');
      
      expect(result).toEqual({ id: 'folder-123', name: 'Test Folder' });
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.chrome.identity.removeCachedAuthToken).toHaveBeenCalled();
    });
  });
  
  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'file-123', name: 'test.json' }),
      });
      
      const result = await driveApi.uploadFile('test.json', { data: 'test' }, 'folder-123', 'test-token');
      
      expect(result).toEqual({ id: 'file-123', name: 'test.json' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
    
    it('should validate content', async () => {
      await expect(driveApi.uploadFile('test.json', null, 'folder-123', 'test-token'))
        .rejects.toThrow('File content cannot be empty');
    });
  });
  
  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: 'test content' }),
      });
      
      const result = await driveApi.downloadFile('file-123', 'test-token');
      
      expect(result).toEqual({ data: 'test content' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/file-123?alt=media',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
    
    it('should validate fileId', async () => {
      await expect(driveApi.downloadFile('', 'test-token'))
        .rejects.toThrow('File ID cannot be empty');
    });
  });
  
  describe('listFiles', () => {
    it('should list files in a folder', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          files: [
            { id: 'file-1', name: 'file1.json' },
            { id: 'file-2', name: 'file2.json' },
          ],
        }),
      });
      
      const result = await driveApi.listFiles('folder-123', 'test-token');
      
      expect(result).toEqual([
        { id: 'file-1', name: 'file1.json' },
        { id: 'file-2', name: 'file2.json' },
      ]);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/drive/v3/files'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
    
    it('should handle pagination', async () => {
      // First page with nextPageToken
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'file-1', name: 'file1.json' }],
          nextPageToken: 'next-page',
        }),
      });
      
      // Second page without nextPageToken
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'file-2', name: 'file2.json' }],
        }),
      });
      
      const result = await driveApi.listFiles('folder-123', 'test-token');
      
      expect(result).toEqual([
        { id: 'file-1', name: 'file1.json' },
        { id: 'file-2', name: 'file2.json' },
      ]);
      
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch.mock.calls[1][0]).toContain('pageToken=next-page');
    });
    
    it('should validate folderId', async () => {
      await expect(driveApi.listFiles('', 'test-token'))
        .rejects.toThrow('Folder ID cannot be empty');
    });
  });
  
  describe('findOrCreateBookDriveFolder', () => {
    it('should return existing folder ID if found', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'bookdrive-folder' }],
        }),
      });
      
      const result = await driveApi.findOrCreateBookDriveFolder('test-token');
      
      expect(result).toBe('bookdrive-folder');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    
    it('should create folder if not found', async () => {
      // First call returns empty files array
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ files: [] }),
      });
      
      // Second call (createFolder) returns new folder
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: 'new-bookdrive-folder' }),
      });
      
      const result = await driveApi.findOrCreateBookDriveFolder('test-token');
      
      expect(result).toBe('new-bookdrive-folder');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('uploadBookmarksFile', () => {
    it('should upload bookmarks with metadata', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'bookmarks-file' }),
      });
      
      const bookmarks = [
        { title: 'Folder', children: [
          { title: 'Bookmark', url: 'https://example.com' }
        ]},
      ];
      
      const result = await driveApi.uploadBookmarksFile(bookmarks, 'folder-123', 'test-token');
      
      expect(result).toEqual({ id: 'bookmarks-file' });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Check that the request body contains metadata
      const requestBody = global.fetch.mock.calls[0][1].body;
      expect(requestBody).toContain('metadata');
      expect(requestBody).toContain('version');
      expect(requestBody).toContain('timestamp');
      expect(requestBody).toContain('bookmarkCount');
    });
    
    it('should validate inputs', async () => {
      await expect(driveApi.uploadBookmarksFile(null, 'folder-123', 'test-token'))
        .rejects.toThrow('Bookmarks data cannot be empty');
        
      await expect(driveApi.uploadBookmarksFile({}, '', 'test-token'))
        .rejects.toThrow('Folder ID cannot be empty');
    });
  });
  
  describe('downloadBookmarksFile', () => {
    it('should handle new format with metadata', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: { bookmarks: [{ title: 'Test' }] },
          metadata: { version: '1.0' },
        }),
      });
      
      const result = await driveApi.downloadBookmarksFile('file-123', 'test-token');
      
      expect(result).toEqual({ bookmarks: [{ title: 'Test' }] });
    });
    
    it('should handle old format without metadata', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ bookmarks: [{ title: 'Test' }] }),
      });
      
      const result = await driveApi.downloadBookmarksFile('file-123', 'test-token');
      
      expect(result).toEqual({ bookmarks: [{ title: 'Test' }] });
    });
  });
});