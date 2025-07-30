# Enhanced Team Management

BookDrive's Enhanced Team Management system provides granular permissions, detailed activity logging, and advanced team collaboration features. This system goes beyond basic team management to offer comprehensive control over team access, detailed audit trails, and sophisticated permission management.

## Overview

The Enhanced Team Management system implements a hierarchical permission system with 6 permission levels, detailed activity logging with multiple log levels, and comprehensive team management capabilities. It provides fine-grained control over team resources and maintains detailed audit trails for security and compliance.

## Permission System

### Permission Levels

#### 1. None Permission
- **Description**: No access to the resource
- **Actions**: Cannot view, edit, or interact with the resource
- **Use Case**: Explicitly deny access to specific users
- **Default**: Not assigned by default

#### 2. View Permission
- **Description**: Read-only access to the resource
- **Actions**: Can view but cannot modify
- **Use Case**: General audience, observers, stakeholders
- **Scope**: Resource-level access

#### 3. Comment Permission
- **Description**: Can view and add comments
- **Actions**: View + comment on resources
- **Use Case**: Reviewers, feedback providers
- **Scope**: Resource-level with comment capabilities

#### 4. Edit Permission
- **Description**: Can modify the resource content
- **Actions**: View, edit, add, remove content
- **Use Case**: Contributors, editors, team members
- **Scope**: Resource-level with modification capabilities

#### 5. Manage Permission
- **Description**: Can manage the resource and its settings
- **Actions**: All edit actions + resource management
- **Use Case**: Team leads, project managers
- **Scope**: Resource-level with management capabilities

#### 6. Admin Permission
- **Description**: Full administrative control
- **Actions**: All actions including permission management
- **Use Case**: Team admins, system administrators
- **Scope**: Full resource control

### Resource Types

#### 1. Team Resources
- **Description**: Team-level resources and settings
- **Examples**: Team configuration, member management
- **Permission Scope**: Team-wide permissions

#### 2. Folder Resources
- **Description**: Bookmark folders and collections
- **Examples**: Shared folders, smart folders
- **Permission Scope**: Folder-level permissions

#### 3. Bookmark Resources
- **Description**: Individual bookmarks
- **Examples**: Specific bookmarks, bookmark metadata
- **Permission Scope**: Bookmark-level permissions

#### 4. Collection Resources
- **Description**: Public collections and shared content
- **Examples**: Public collections, shared lists
- **Permission Scope**: Collection-level permissions

#### 5. Backup Resources
- **Description**: Backup files and restoration points
- **Examples**: Backup files, restore points
- **Permission Scope**: Backup-level permissions

#### 6. Analytics Resources
- **Description**: Analytics data and reports
- **Examples**: Team analytics, performance reports
- **Permission Scope**: Analytics-level permissions

### Permission Scopes

#### 1. Global Permissions
- **Description**: Apply to all resources of a type
- **Use Case**: Default permissions for new resources
- **Example**: All team members can view all folders

#### 2. Resource Permissions
- **Description**: Specific to individual resources
- **Use Case**: Fine-grained control over specific resources
- **Example**: Specific folder access for certain members

#### 3. Inherited Permissions
- **Description**: Inherited from parent resources
- **Use Case**: Hierarchical permission structure
- **Example**: Folder permissions inherited from team

#### 4. Temporary Permissions
- **Description**: Time-limited access permissions
- **Use Case**: Temporary access for specific tasks
- **Example**: Guest access for a limited time

## Setting Permissions

### Basic Permission Assignment
```javascript
import { setUserPermission } from '../lib/team/enhanced-team-manager.js';

// Grant view permission to a user for a specific folder
await setUserPermission('user@example.com', 'folder', 'folder-123', PERMISSION_LEVELS.VIEW);

// Grant edit permission to a user for a collection
await setUserPermission('user@example.com', 'collection', 'collection-456', PERMISSION_LEVELS.EDIT);
```

### Advanced Permission Management
```javascript
// Grant multiple permissions at once
await setUserPermission('user@example.com', 'folder', 'folder-123', PERMISSION_LEVELS.EDIT, {
  scope: PERMISSION_SCOPES.RESOURCE,
  expiresAt: new Date('2024-12-31'),
  reason: 'Project collaboration',
  grantedBy: 'admin@example.com'
});

// Grant team-wide permissions
await setUserPermission('user@example.com', 'team', 'team-123', PERMISSION_LEVELS.MANAGE, {
  scope: PERMISSION_SCOPES.GLOBAL,
  inherited: true
});
```

### Permission Inheritance
```javascript
// Set up permission inheritance
await setUserPermission('user@example.com', 'team', 'team-123', PERMISSION_LEVELS.VIEW, {
  scope: PERMISSION_SCOPES.INHERITED,
  inheritFrom: 'parent-team-456'
});
```

## Getting and Checking Permissions

### Getting User Permissions
```javascript
import { getUserPermissions, hasPermission } from '../lib/team/enhanced-team-manager.js';

// Get all permissions for a user
const permissions = await getUserPermissions('user@example.com');
console.log('User permissions:', permissions);

// Get permissions for specific resource type
const folderPermissions = await getUserPermissions('user@example.com', {
  resourceType: 'folder',
  includeInherited: true
});
```

### Checking Permissions
```javascript
// Check if user has specific permission
const canEdit = await hasPermission(PERMISSION_LEVELS.EDIT, 'folder', 'folder-123', {
  userId: 'user@example.com'
});

// Check multiple permissions
const permissions = await checkMultiplePermissions('user@example.com', [
  { level: PERMISSION_LEVELS.VIEW, resourceType: 'folder', resourceId: 'folder-123' },
  { level: PERMISSION_LEVELS.EDIT, resourceType: 'collection', resourceId: 'collection-456' }
]);
```

### Permission Analysis
```javascript
// Analyze user permissions
const analysis = await analyzeUserPermissions('user@example.com', {
  includeInherited: true,
  includeTemporary: true,
  includeConflicts: true
});
```

## Activity Logging

### Log Levels

#### 1. Info Level
- **Description**: General information and normal operations
- **Examples**: User login, bookmark added, sync completed
- **Use Case**: General activity tracking

#### 2. Warning Level
- **Description**: Potential issues or unusual activities
- **Examples**: Sync conflicts, permission denied, quota warnings
- **Use Case**: Monitoring for potential issues

#### 3. Error Level
- **Description**: Errors and failures
- **Examples**: Sync failures, authentication errors, system errors
- **Use Case**: Error tracking and debugging

#### 4. Security Level
- **Description**: Security-related events
- **Examples**: Permission changes, access attempts, security violations
- **Use Case**: Security monitoring and audit

#### 5. Audit Level
- **Description**: Audit trail events
- **Examples**: Configuration changes, system modifications, admin actions
- **Use Case**: Compliance and audit requirements

### Recording Activities
```javascript
import { logDetailedActivity } from '../lib/team/enhanced-team-manager.js';

// Log information activity
await logDetailedActivity('user_login', {
  userId: 'user@example.com',
  timestamp: new Date(),
  device: 'Chrome Extension',
  ipAddress: '192.168.1.1'
}, LOG_LEVELS.INFO);

// Log security activity
await logDetailedActivity('permission_granted', {
  targetUser: 'user@example.com',
  resourceType: 'folder',
  resourceId: 'folder-123',
  permission: PERMISSION_LEVELS.EDIT,
  grantedBy: 'admin@example.com',
  reason: 'Project collaboration'
}, LOG_LEVELS.SECURITY);
```

### Getting Activity Logs
```javascript
import { getDetailedActivityLogs } from '../lib/team/enhanced-team-manager.js';

// Get all activity logs
const logs = await getDetailedActivityLogs();

// Get filtered activity logs
const filteredLogs = await getDetailedActivityLogs({
  level: LOG_LEVELS.SECURITY,
  userId: 'user@example.com',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  resourceType: 'folder'
});
```

## Team Configuration

### Getting Team Configuration
```javascript
import { getEnhancedTeamConfig } from '../lib/team/enhanced-team-manager.js';

// Get current team configuration
const config = await getEnhancedTeamConfig();
console.log('Team configuration:', config);
```

### Updating Team Configuration
```javascript
import { updateEnhancedTeamConfig } from '../lib/team/enhanced-team-manager.js';

// Update team configuration
await updateEnhancedTeamConfig({
  defaultPermissions: {
    newMembers: PERMISSION_LEVELS.VIEW,
    newFolders: PERMISSION_LEVELS.EDIT,
    newCollections: PERMISSION_LEVELS.COMMENT
  },
  securitySettings: {
    requireApproval: true,
    auditAllActions: true,
    logRetentionDays: 365
  },
  collaborationSettings: {
    allowGuestAccess: false,
    maxTeamSize: 50,
    allowExternalSharing: true
  }
});
```

## Member Activity Analysis

### Getting Member Activity Summary
```javascript
import { getMemberActivitySummary } from '../lib/team/enhanced-team-manager.js';

// Get activity summary for a member
const summary = await getMemberActivitySummary('user@example.com', {
  period: 'last_30_days',
  includeDetails: true,
  includeTrends: true
});
```

### Team Activity Analytics
```javascript
import { getTeamActivityAnalytics } from '../lib/team/enhanced-team-manager.js';

// Get team-wide activity analytics
const analytics = await getTeamActivityAnalytics({
  period: 'last_90_days',
  includeMemberBreakdown: true,
  includePermissionAnalysis: true,
  includeSecurityEvents: true
});
```

## Security and Audit

### Security Monitoring
```javascript
// Monitor security events
const securityEvents = await getDetailedActivityLogs({
  level: LOG_LEVELS.SECURITY,
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
});

// Analyze security patterns
const securityAnalysis = await analyzeSecurityPatterns(securityEvents);
```

### Audit Trail
```javascript
// Generate audit report
const auditReport = await generateAuditReport({
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  includeAllLevels: true,
  includeUserDetails: true,
  format: 'pdf'
});
```

## Permission Management Workflows

### New Member Onboarding
```javascript
// Onboard new team member
async function onboardNewMember(userEmail, role) {
  // Add member to team
  await addTeamMember(userEmail, role);
  
  // Set default permissions based on role
  const defaultPermissions = getDefaultPermissionsForRole(role);
  for (const permission of defaultPermissions) {
    await setUserPermission(userEmail, permission.resourceType, permission.resourceId, permission.level);
  }
  
  // Log onboarding activity
  await logDetailedActivity('member_onboarded', {
    userEmail,
    role,
    permissions: defaultPermissions
  }, LOG_LEVELS.INFO);
}
```

### Project Collaboration Setup
```javascript
// Set up project collaboration
async function setupProjectCollaboration(projectId, teamMembers) {
  // Create project folder
  const projectFolder = await createProjectFolder(projectId);
  
  // Grant permissions to team members
  for (const member of teamMembers) {
    await setUserPermission(member.email, 'folder', projectFolder.id, member.permission);
  }
  
  // Log project setup
  await logDetailedActivity('project_setup', {
    projectId,
    teamMembers: teamMembers.map(m => m.email),
    folderId: projectFolder.id
  }, LOG_LEVELS.INFO);
}
```

## Best Practices

### 1. Permission Design
- **Principle of Least Privilege**: Grant minimum necessary permissions
- **Role-Based Access**: Use roles to group permissions
- **Regular Review**: Review and update permissions regularly
- **Documentation**: Document permission policies and procedures

### 2. Security Management
- **Audit Trails**: Maintain comprehensive audit trails
- **Security Monitoring**: Monitor for security events
- **Access Control**: Implement strict access controls
- **Incident Response**: Have procedures for security incidents

### 3. Team Management
- **Clear Roles**: Define clear roles and responsibilities
- **Communication**: Maintain open communication about permissions
- **Training**: Train team members on permission policies
- **Escalation**: Have clear escalation procedures

### 4. Compliance
- **Data Protection**: Ensure compliance with data protection regulations
- **Audit Requirements**: Meet audit and compliance requirements
- **Documentation**: Maintain required documentation
- **Regular Reviews**: Conduct regular compliance reviews

## Troubleshooting

### Common Issues

1. **Permission denied errors**
   - Check user permissions
   - Verify resource access
   - Check permission inheritance
   - Review permission conflicts

2. **Activity logs not recording**
   - Check logging configuration
   - Verify log levels
   - Check storage capacity
   - Review system permissions

3. **Team configuration issues**
   - Verify configuration settings
   - Check for conflicts
   - Review inheritance rules
   - Validate configuration data

4. **Performance issues**
   - Optimize permission checks
   - Implement caching
   - Reduce log verbosity
   - Optimize queries

### Debugging
```javascript
// Enable debug logging
const debugOptions = {
  verbose: true,
  logPermissions: true,
  logActivities: true,
  logSecurity: true
};

// Get debug information
const debugInfo = await getTeamDebugInfo();
console.log('Debug info:', debugInfo);
```

## API Reference

### Main Functions

#### `setUserPermission(userId, resourceType, resourceId, permission, options)`
Sets a user permission for a specific resource.

**Parameters**:
- `userId`: User ID or email
- `resourceType`: Type of resource
- `resourceId`: Resource ID
- `permission`: Permission level
- `options`: Additional options

**Returns**: Promise resolving to permission object

#### `getUserPermissions(userId, options)`
Gets all permissions for a user.

**Parameters**:
- `userId`: User ID or email
- `options`: Retrieval options

**Returns**: Promise resolving to user permissions

#### `hasPermission(permission, resourceType, resourceId, options)`
Checks if user has specific permission.

**Parameters**:
- `permission`: Permission level to check
- `resourceType`: Resource type
- `resourceId`: Resource ID
- `options`: Check options

**Returns**: Promise resolving to boolean

#### `logDetailedActivity(action, data, level, options)`
Logs detailed activity.

**Parameters**:
- `action`: Action performed
- `data`: Activity data
- `level`: Log level
- `options`: Logging options

**Returns**: Promise resolving to logged activity

### Constants

#### `PERMISSION_LEVELS`
Available permission levels:
- `NONE`
- `VIEW`
- `COMMENT`
- `EDIT`
- `MANAGE`
- `ADMIN`

#### `RESOURCE_TYPES`
Available resource types:
- `TEAM`
- `FOLDER`
- `BOOKMARK`
- `COLLECTION`
- `BACKUP`
- `ANALYTICS`

#### `PERMISSION_SCOPES`
Available permission scopes:
- `GLOBAL`
- `RESOURCE`
- `INHERITED`
- `TEMPORARY`

#### `LOG_LEVELS`
Available log levels:
- `INFO`
- `WARNING`
- `ERROR`
- `SECURITY`
- `AUDIT`

## Integration

The Enhanced Team Management system integrates with:
- **Team Analytics**: Activity tracking and analysis
- **Permission System**: Granular access control
- **Audit System**: Comprehensive audit trails
- **Security System**: Security monitoring and alerts
- **User Interface**: Team management interface 