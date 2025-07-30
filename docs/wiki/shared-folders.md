# Shared Folders

BookDrive's Shared Folders feature enables team collaboration by allowing multiple users to share and manage bookmark folders with granular permission controls.

## Overview

Shared Folders provide a secure way for teams to collaborate on bookmark collections while maintaining privacy and control over access permissions.

## Features

### 🔐 Permission Management
- **Role-Based Access**: Admin, Editor, and Viewer roles
- **Granular Permissions**: Control who can view, edit, or manage folders
- **Permission Inheritance**: Permissions cascade to subfolders
- **Dynamic Updates**: Real-time permission changes

### 👥 Team Collaboration
- **Member Management**: Add, remove, and update team members
- **Real-Time Notifications**: Get notified of folder changes
- **Activity Tracking**: Monitor folder activity and changes
- **Team Communication**: Built-in notification system

### 📁 Folder Operations
- **Create Folders**: Create new shared bookmark folders
- **Import Bookmarks**: Import bookmarks from various sources
- **Export Bookmarks**: Export bookmarks in multiple formats
- **Folder Organization**: Organize bookmarks in hierarchical structure

## Accessing Shared Folders

### From Popup
1. Open the BookDrive popup
2. Go to the **Settings** tab
3. Click **Shared Folders**

### From Options Page
1. Open the BookDrive options page
2. Navigate to **Team Mode**
3. Click **Manage Shared Folders**

## Shared Folders Interface

### Notifications Panel
- **Recent Activity**: Latest folder changes and updates
- **Team Notifications**: Notifications from team members
- **Permission Updates**: Changes to folder permissions
- **Activity Timeline**: Chronological activity feed

### Folders Grid
- **Folder Cards**: Visual representation of shared folders
- **Quick Actions**: Import, export, and manage options
- **Permission Indicators**: Visual permission status
- **Member Count**: Number of folder members

### Quick Actions
- **Create Folder**: Create new shared folder
- **Import Bookmarks**: Import bookmarks from file or text
- **Export Bookmarks**: Export bookmarks to file
- **Manage Permissions**: Update folder permissions

## Creating Shared Folders

### Basic Setup
1. **Click "Create Folder"** in the Shared Folders interface
2. **Enter Folder Name**: Provide a descriptive name
3. **Add Description**: Optional description for the folder
4. **Set Permissions**: Choose initial permission level

### Advanced Options
- **Encryption**: Enable folder-level encryption
- **Passphrase**: Set encryption passphrase
- **Member Invitations**: Invite team members during creation
- **Permission Templates**: Use predefined permission sets

### Folder Configuration
```javascript
const folderConfig = {
  name: 'Project Resources',
  description: 'Shared bookmarks for project collaboration',
  encryption: true,
  passphrase: 'secure-passphrase',
  permissions: {
    defaultRole: 'viewer',
    allowPublicAccess: false
  }
};
```

## Permission System

### Role Types

#### Admin Role
- **Full Control**: Create, edit, delete bookmarks
- **Member Management**: Add and remove team members
- **Permission Management**: Change folder permissions
- **Folder Settings**: Modify folder configuration

#### Editor Role
- **Content Management**: Add, edit, delete bookmarks
- **Limited Settings**: View folder settings
- **No Member Management**: Cannot manage team members
- **No Permission Changes**: Cannot modify permissions

#### Viewer Role
- **Read-Only Access**: View bookmarks only
- **No Modifications**: Cannot add, edit, or delete
- **Limited Information**: Basic folder information only

### Permission Inheritance
- **Parent Folders**: Permissions apply to all subfolders
- **Override Capability**: Subfolders can have different permissions
- **Cascade Updates**: Permission changes propagate down

## Member Management

### Adding Members
1. **Open Folder Details**: Click on a folder card
2. **Navigate to Members**: Go to the Members tab
3. **Click "Add Member"**: Enter email address
4. **Set Role**: Choose appropriate role
5. **Send Invitation**: Member receives notification

### Removing Members
1. **Open Member List**: View current members
2. **Click Remove**: Remove member from folder
3. **Confirm Action**: Confirm removal
4. **Update Permissions**: Adjust remaining member permissions

### Role Updates
1. **Select Member**: Choose member to update
2. **Change Role**: Select new role
3. **Apply Changes**: Update member permissions
4. **Notify Member**: Member receives role change notification

## Import and Export

### Import Options
- **File Import**: Import from HTML, JSON, or CSV files
- **Text Import**: Paste bookmark data directly
- **URL Import**: Import from URL lists
- **Browser Import**: Import from browser bookmarks

### Export Options
- **HTML Export**: Standard bookmark format
- **JSON Export**: Structured data format
- **CSV Export**: Spreadsheet-compatible format
- **Text Export**: Plain text URL list

### Import Process
```javascript
// Import bookmarks from text
const bookmarks = parseBookmarksFromText(textInput);
await addBookmarksToSharedFolder(folderId, bookmarks);
```

## Notifications System

### Notification Types
- **Folder Created**: New folder creation notifications
- **Member Added**: New member join notifications
- **Permission Changed**: Permission update notifications
- **Bookmarks Added**: New bookmark notifications
- **Bookmarks Modified**: Bookmark change notifications

### Notification Settings
- **Email Notifications**: Receive email alerts
- **In-App Notifications**: Browser notification alerts
- **Notification Frequency**: Control notification frequency
- **Notification Filters**: Filter by notification type

## Security Features

### Encryption
- **Folder-Level Encryption**: Encrypt entire folder contents
- **Passphrase Protection**: Secure passphrase-based encryption
- **Key Derivation**: PBKDF2 key derivation for security
- **Secure Storage**: Encrypted storage in Google Drive

### Access Control
- **Authentication Required**: Google account authentication
- **Permission Validation**: Server-side permission checks
- **Session Management**: Secure session handling
- **Audit Logging**: Track access and changes

## API Reference

### Shared Folder Functions
```javascript
import {
  createSharedFolder,
  getSharedFolders,
  addBookmarksToSharedFolder,
  removeBookmarksFromSharedFolder,
  updateSharedFolderPermission
} from '../lib/team/shared-folders.js';

// Create a new shared folder
const folder = await createSharedFolder({
  name: 'Team Resources',
  description: 'Shared bookmarks for the team',
  members: ['user1@example.com', 'user2@example.com']
});

// Get all shared folders
const folders = await getSharedFolders();

// Add bookmarks to folder
await addBookmarksToSharedFolder(folderId, bookmarks);
```

### Permission Functions
```javascript
// Update folder permission
await updateSharedFolderPermission(folderId, userEmail, 'editor');

// Check folder access
const hasAccess = await hasFolderAccess(folderId, userEmail);

// Get folder permission
const permission = await getFolderPermission(folderId, userEmail);
```

### Notification Functions
```javascript
// Get pending notifications
const notifications = await getPendingNotifications();

// Notify team members
await notifyTeamMembers(folderId, 'bookmarks_added', {
  count: 5,
  addedBy: 'user@example.com'
});
```

## Best Practices

### Folder Organization
- **Clear Naming**: Use descriptive folder names
- **Logical Structure**: Organize folders hierarchically
- **Regular Cleanup**: Remove outdated bookmarks
- **Documentation**: Add descriptions to folders

### Permission Management
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Regular Reviews**: Periodically review permissions
- **Role Templates**: Use predefined role templates
- **Audit Trails**: Keep track of permission changes

### Team Collaboration
- **Communication**: Communicate folder changes to team
- **Guidelines**: Establish bookmark organization guidelines
- **Training**: Train team members on proper usage
- **Feedback**: Collect feedback on folder organization

## Troubleshooting

### Folder Access Issues
1. **Check Permissions**: Verify user has proper permissions
2. **Authentication**: Ensure user is properly authenticated
3. **Network Connection**: Check internet connectivity
4. **Browser Cache**: Clear browser cache if needed

### Import/Export Problems
1. **File Format**: Verify file format is supported
2. **File Size**: Check if file size is within limits
3. **Encoding**: Ensure proper text encoding
4. **Permissions**: Check folder write permissions

### Notification Issues
1. **Notification Settings**: Verify notification preferences
2. **Browser Permissions**: Check browser notification permissions
3. **Email Settings**: Verify email notification settings
4. **Network Issues**: Check network connectivity

## Related Documentation

- **[Team Mode](team.md)** - Team collaboration overview
- **[Conflict Resolution](conflict-resolution.md)** - Resolving sync conflicts
- **[Analytics](analytics.md)** - Monitoring folder activity
- **[Security](Security.md)** - Security features and best practices 