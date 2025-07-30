# Team Mode

BookDrive's Team Mode enables multi-user collaboration on bookmark synchronization with role-based access control and team management features.

## Overview

Team Mode allows multiple users to collaborate on bookmark collections while maintaining security, privacy, and control over access permissions.

## Features

### 👥 Team Management
- **Member Management**: Add, remove, and update team members
- **Role-Based Access**: Admin, Editor, and Viewer roles
- **Team Invitations**: Invite new members via email
- **Member Profiles**: View member information and activity

### 🔐 Security & Permissions
- **Granular Permissions**: Control access at folder and bookmark level
- **Authentication**: Google account-based authentication
- **Session Management**: Secure session handling
- **Audit Logging**: Track all team activities

### 📊 Collaboration Tools
- **Shared Folders**: Create and manage shared bookmark folders
- **Real-Time Sync**: Real-time synchronization across team members
- **Conflict Resolution**: Team-specific conflict resolution
- **Activity Tracking**: Monitor team activities and changes

## Setting Up Team Mode

### Initial Setup
1. **Enable Team Mode**: Go to Options → Team Mode → Enable
2. **Create Team**: Set up initial team configuration
3. **Add Members**: Invite team members via email
4. **Set Permissions**: Configure role-based permissions

### Team Configuration
```javascript
const teamConfig = {
  name: 'Development Team',
  description: 'Bookmark collaboration for development team',
  defaultRole: 'viewer',
  allowPublicInvites: false,
  requireApproval: true
};
```

## Team Roles

### Admin Role
- **Full Control**: Complete access to all team features
- **Member Management**: Add, remove, and update team members
- **Permission Management**: Change team and folder permissions
- **Team Settings**: Modify team configuration and settings

### Editor Role
- **Content Management**: Create, edit, and delete bookmarks
- **Folder Access**: Access to assigned shared folders
- **Limited Settings**: View team settings (read-only)
- **No Member Management**: Cannot manage team members

### Viewer Role
- **Read-Only Access**: View bookmarks and folders only
- **No Modifications**: Cannot add, edit, or delete content
- **Limited Information**: Basic team information only
- **No Settings Access**: Cannot access team settings

## Member Management

### Adding Team Members
1. **Open Team Settings**: Go to Options → Team Mode
2. **Click "Add Member"**: Enter member's email address
3. **Select Role**: Choose appropriate role (Admin, Editor, Viewer)
4. **Send Invitation**: Member receives email invitation
5. **Member Accepts**: Member accepts invitation to join team

### Removing Team Members
1. **Open Member List**: View current team members
2. **Select Member**: Choose member to remove
3. **Click Remove**: Remove member from team
4. **Confirm Action**: Confirm removal and handle data

### Role Updates
1. **Select Member**: Choose member to update
2. **Change Role**: Select new role from dropdown
3. **Apply Changes**: Update member permissions
4. **Notify Member**: Member receives role change notification

## Team Collaboration Features

### Shared Folders
- **Create Folders**: Create shared bookmark folders
- **Permission Control**: Set folder-specific permissions
- **Member Access**: Control who can access each folder
- **Activity Tracking**: Monitor folder activity

### Real-Time Sync
- **Instant Updates**: Changes sync immediately across team
- **Conflict Detection**: Automatic conflict detection
- **Resolution Tools**: Built-in conflict resolution
- **Status Indicators**: Visual sync status indicators

### Team Notifications
- **Activity Alerts**: Get notified of team activities
- **Permission Changes**: Notified of permission updates
- **Member Updates**: Notified of member changes
- **Sync Status**: Notified of sync issues

## Security Features

### Authentication
- **Google OAuth2**: Secure Google account authentication
- **Session Management**: Secure session handling
- **Token Refresh**: Automatic token refresh
- **Logout Handling**: Secure logout and cleanup

### Permission System
- **Role-Based Access**: Granular role-based permissions
- **Folder Permissions**: Folder-specific access control
- **Inheritance**: Permission inheritance from parent folders
- **Override Capability**: Override inherited permissions

### Data Protection
- **Encryption**: Optional end-to-end encryption
- **Secure Storage**: Encrypted storage in Google Drive
- **Access Logging**: Track all access and changes
- **Data Isolation**: Team data isolation

## API Reference

### Team Management Functions
```javascript
import {
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateMemberRole,
  isTeamAdmin
} from '../lib/team/team-manager.js';

// Get all team members
const members = await getTeamMembers();

// Add a new team member
await addTeamMember('user@example.com', 'editor');

// Remove a team member
await removeTeamMember('user@example.com');

// Update member role
await updateMemberRole('user@example.com', 'admin');

// Check if user is team admin
const isAdmin = await isTeamAdmin('user@example.com');
```

### Team Information Functions
```javascript
// Get current user information
const userInfo = await getCurrentUserInfo();

// Get or create device ID
const deviceId = await getOrCreateDeviceId();

// Create initial team
await createInitialTeam(teamConfig);
```

### Shared Folder Functions
```javascript
import {
  createSharedFolder,
  getSharedFolders,
  addBookmarksToSharedFolder
} from '../lib/team/shared-folders.js';

// Create shared folder
const folder = await createSharedFolder({
  name: 'Team Resources',
  members: ['user1@example.com', 'user2@example.com']
});

// Get shared folders
const folders = await getSharedFolders();

// Add bookmarks to shared folder
await addBookmarksToSharedFolder(folderId, bookmarks);
```

## Configuration Options

### Team Settings
- **Team Name**: Display name for the team
- **Team Description**: Description of team purpose
- **Default Role**: Default role for new members
- **Public Invites**: Allow public team invitations
- **Approval Required**: Require approval for new members

### Sync Settings
- **Sync Frequency**: How often to sync with team
- **Conflict Resolution**: Default conflict resolution strategy
- **Notification Settings**: Team activity notifications
- **Auto-Sync**: Automatic sync on changes

### Security Settings
- **Encryption**: Enable team data encryption
- **Session Timeout**: Session timeout duration
- **Audit Logging**: Enable detailed audit logging
- **Access Controls**: Granular access control settings

## Best Practices

### Team Organization
- **Clear Roles**: Define clear roles and responsibilities
- **Documentation**: Document team processes and guidelines
- **Regular Reviews**: Periodically review team membership
- **Communication**: Maintain open communication channels

### Security
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Regular Audits**: Regularly audit team access and permissions
- **Secure Communication**: Use secure channels for team communication
- **Data Backup**: Regular backup of team data

### Collaboration
- **Folder Organization**: Organize shared folders logically
- **Naming Conventions**: Use consistent naming conventions
- **Version Control**: Track changes and versions
- **Conflict Resolution**: Establish conflict resolution procedures

## Troubleshooting

### Team Access Issues
1. **Check Authentication**: Verify Google account authentication
2. **Verify Permissions**: Check team and folder permissions
3. **Network Connection**: Ensure stable internet connection
4. **Browser Cache**: Clear browser cache if needed

### Member Management Issues
1. **Email Verification**: Ensure member email is correct
2. **Invitation Status**: Check invitation status and expiration
3. **Role Permissions**: Verify role has necessary permissions
4. **Team Settings**: Check team configuration settings

### Sync Problems
1. **Sync Status**: Check sync status and logs
2. **Conflict Resolution**: Resolve any pending conflicts
3. **Network Issues**: Check network connectivity
4. **Permission Issues**: Verify folder access permissions

### Performance Issues
1. **Team Size**: Consider team size and performance impact
2. **Sync Frequency**: Adjust sync frequency if needed
3. **Data Volume**: Monitor data volume and storage usage
4. **Resource Usage**: Check system resource usage

## Related Documentation

- **[Shared Folders](shared-folders.md)** - Managing shared bookmark folders
- **[Conflict Resolution](conflict-resolution.md)** - Resolving team conflicts
- **[Analytics](analytics.md)** - Monitoring team activities
- **[Security](Security.md)** - Security features and best practices
- **[Configuration](Configuration.md)** - Team configuration settings 