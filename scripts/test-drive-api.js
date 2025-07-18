/**
 * Manual test script for Google Drive API implementation
 * 
 * This script can be used to manually test the Google Drive API implementation
 * in a browser environment. It's not meant to be run directly with Node.js.
 * 
 * Usage:
 * 1. Build the extension
 * 2. Load the extension in Chrome
 * 3. Open the extension popup
 * 4. Open Chrome DevTools
 * 5. Copy and paste this script into the console
 * 6. Run the tests by calling the test functions
 */

// Import the drive API module
import * as driveApi from '../lib/drive.js';

/**
 * Test authentication
 */
async function testAuth() {
  console.log('Testing authentication...');
  
  try {
    // Get auth token (interactive)
    const token = await driveApi.getAuthToken(true);
    console.log('✅ Got auth token:', token.substring(0, 10) + '...');
    
    return token;
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    throw error;
  }
}

/**
 * Test folder operations
 */
async function testFolders(token) {
  console.log('\nTesting folder operations...');
  
  try {
    // Find or create BookDrive folder
    const folderId = await driveApi.findOrCreateBookDriveFolder(token);
    console.log('✅ BookDrive folder ID:', folderId);
    
    // Create a test folder
    const testFolder = await driveApi.createFolder('BookDrive_Test_' + Date.now(), folderId, token);
    console.log('✅ Created test folder:', testFolder.id);
    
    return { mainFolderId: folderId, testFolderId: testFolder.id };
  } catch (error) {
    console.error('❌ Folder operations failed:', error);
    throw error;
  }
}

/**
 * Test file operations
 */
async function testFiles(token, folderId) {
  console.log('\nTesting file operations...');
  
  try {
    // Create test data
    const testData = {
      title: 'Test Bookmarks',
      timestamp: new Date().toISOString(),
      bookmarks: [
        {
          title: 'Test Folder',
          children: [
            { title: 'Google', url: 'https://www.google.com' },
            { title: 'GitHub', url: 'https://www.github.com' }
          ]
        }
      ]
    };
    
    // Upload file
    const uploadedFile = await driveApi.uploadFile(
      'test_bookmarks_' + Date.now() + '.json',
      testData,
      folderId,
      token
    );
    console.log('✅ Uploaded file:', uploadedFile.id);
    
    // List files
    const files = await driveApi.listFiles(folderId, token);
    console.log(`✅ Listed ${files.length} files in folder`);
    
    // Download file
    const downloadedData = await driveApi.downloadFile(uploadedFile.id, token);
    console.log('✅ Downloaded file:', downloadedData);
    
    return uploadedFile.id;
  } catch (error) {
    console.error('❌ File operations failed:', error);
    throw error;
  }
}

/**
 * Test bookmark operations
 */
async function testBookmarks(token, folderId) {
  console.log('\nTesting bookmark operations...');
  
  try {
    // Create test bookmarks
    const testBookmarks = [
      {
        title: 'Bookmarks Bar',
        children: [
          { title: 'Google', url: 'https://www.google.com' },
          { 
            title: 'Development',
            children: [
              { title: 'GitHub', url: 'https://www.github.com' },
              { title: 'Stack Overflow', url: 'https://stackoverflow.com' }
            ]
          }
        ]
      }
    ];
    
    // Upload bookmarks
    const uploadedFile = await driveApi.uploadBookmarksFile(testBookmarks, folderId, token);
    console.log('✅ Uploaded bookmarks file:', uploadedFile.id);
    
    // Download bookmarks
    const downloadedBookmarks = await driveApi.downloadBookmarksFile(uploadedFile.id, token);
    console.log('✅ Downloaded bookmarks:', downloadedBookmarks);
    
    return uploadedFile.id;
  } catch (error) {
    console.error('❌ Bookmark operations failed:', error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    console.log('=== Google Drive API Tests ===');
    
    // Test authentication
    const token = await testAuth();
    
    // Test folder operations
    const { mainFolderId, testFolderId } = await testFolders(token);
    
    // Test file operations
    const fileId = await testFiles(token, testFolderId);
    
    // Test bookmark operations
    const bookmarksFileId = await testBookmarks(token, mainFolderId);
    
    console.log('\n✅ All tests passed!');
    
    return {
      token,
      mainFolderId,
      testFolderId,
      fileId,
      bookmarksFileId
    };
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
  }
}

// Export test functions
window.testDriveApi = {
  testAuth,
  testFolders,
  testFiles,
  testBookmarks,
  runAllTests
};

console.log('Drive API test functions loaded. Run tests with window.testDriveApi.runAllTests()');