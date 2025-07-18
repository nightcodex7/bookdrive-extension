# Google Drive API Integration

This document describes how BookDrive integrates with Google Drive API for storing and retrieving bookmark data.

## Authentication

BookDrive uses Chrome's Identity API for OAuth2 authentication with Google Drive. This provides a secure way to access Google Drive without requiring users to enter their credentials directly into the extension.

### Authentication Flow

1. The extension requests an OAuth2 token from Chrome using `chrome.identity.getAuthToken`
2. Chrome handles the OAuth2 flow, including user consent if needed
3. The extension receives a token that can be used to make authenticated requests to Google Drive API
4. If a token expires or becomes invalid, the extension automatically refreshes it

### Setting Up OAuth2

To set up OAuth2 for development:

1. Run the setup script: `node scripts/setup-oauth2.js`
2. Follow the prompts to create a Google Cloud project and OAuth2 client ID
3. The script will update the manifest.json file with your client ID

## API Operations

### Folder Management

- `createFolder(name, parentId, token)`: Creates a folder in Google Drive
- `findOrCreateBookDriveFolder(token)`: Finds or creates the main BookDrive folder

### File Operations

- `uploadFile(name, content, parentId, token)`: Uploads a file to Google Drive
- `downloadFile(fileId, token)`: Downloads a file from Google Drive
- `listFiles(folderId, token, query, pageSize)`: Lists files in a folder with pagination support

### Bookmark-Specific Operations

- `uploadBookmarksFile(bookmarks, folderId, token)`: Uploads bookmarks with metadata
- `downloadBookmarksFile(fileId, token)`: Downloads and processes bookmarks file

## Error Handling

The API implementation includes comprehensive error handling:

- Authentication errors: Automatically refreshes tokens when they expire
- Rate limiting: Detects and handles rate limit errors with appropriate messages
- Quota exceeded: Provides clear error messages when quota is exceeded
- Network errors: Includes retry mechanisms for transient errors
- Validation: Validates inputs before making API calls

## Best Practices

The implementation follows these best practices:

1. **Token Management**: Securely manages OAuth2 tokens and handles expiration
2. **Pagination**: Supports pagination for listing files to handle large collections
3. **Metadata**: Adds metadata to bookmark files for versioning and statistics
4. **Validation**: Validates all inputs before making API calls
5. **Error Handling**: Provides specific error messages for different failure scenarios

## Testing

The Google Drive API implementation includes comprehensive tests in `src/__tests__/drive-api.test.js`. These tests cover:

- Authentication flows
- File and folder operations
- Error handling and recovery
- Edge cases and validation

Run the tests with: `npm test -- drive-api.test.js`