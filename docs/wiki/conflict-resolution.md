# Conflict Resolution

BookDrive's Conflict Resolution system helps you manage and resolve conflicts that occur during bookmark synchronization.

## Overview

When multiple devices modify the same bookmarks simultaneously, conflicts can arise. The Conflict Resolution feature provides tools to identify, analyze, and resolve these conflicts efficiently.

## Understanding Conflicts

### What Causes Conflicts?
- **Simultaneous Edits**: Multiple devices editing the same bookmark
- **Network Issues**: Interrupted sync operations
- **Version Mismatches**: Different versions of the same bookmark
- **Sync Mode Differences**: Conflicts between Host-to-Many and Global Sync modes

### Conflict Types
- **Title Conflicts**: Different titles for the same URL
- **URL Conflicts**: Same title but different URLs
- **Folder Conflicts**: Same bookmark in different folders
- **Mixed Conflicts**: Multiple properties changed simultaneously

## Accessing Conflict Resolution

### From Popup
1. Open the BookDrive popup
2. Go to the **Settings** tab
3. Click **Resolve Conflicts**

### From Options Page
1. Open the BookDrive options page
2. Navigate to **Sync Settings**
3. Click **Resolve Conflicts**

## Conflict Resolution Interface

### Conflict Summary
- **Total Conflicts**: Number of conflicts detected
- **Conflict Types**: Breakdown by conflict category
- **Severity Levels**: Low, medium, and high priority conflicts
- **Progress Tracking**: Visual progress indicator

### Conflict List
- **Conflict Cards**: Individual cards for each conflict
- **Conflict Details**: Title, URL, and change information
- **Resolution Options**: Available resolution strategies
- **Preview**: Side-by-side comparison of changes

### Resolution Strategies

#### Auto Resolve
- **Local Wins**: Keep local changes, discard remote changes
- **Remote Wins**: Keep remote changes, discard local changes
- **Merge**: Intelligently combine both versions
- **Skip**: Leave conflict unresolved for manual handling

#### Manual Resolution
- **Visual Merge**: Side-by-side comparison tool
- **Selective Merging**: Choose specific properties to keep
- **Custom Resolution**: Create custom merged version

## Resolution Strategies

### 1. Local Wins Strategy
```javascript
// Keep local version, discard remote
const resolvedBookmark = {
  ...localBookmark,
  lastModified: Date.now()
};
```

**Use When:**
- Local changes are more recent
- Remote changes are outdated
- You want to preserve local work

### 2. Remote Wins Strategy
```javascript
// Keep remote version, discard local
const resolvedBookmark = {
  ...remoteBookmark,
  lastModified: Date.now()
};
```

**Use When:**
- Remote changes are more recent
- Local changes are outdated
- You want to sync with team changes

### 3. Merge Strategy
```javascript
// Intelligently merge both versions
const resolvedBookmark = {
  title: localBookmark.title || remoteBookmark.title,
  url: localBookmark.url || remoteBookmark.url,
  parentId: localBookmark.parentId || remoteBookmark.parentId,
  lastModified: Date.now()
};
```

**Use When:**
- Both versions have valuable changes
- Changes don't conflict directly
- You want to preserve all information

### 4. Manual Strategy
```javascript
// User manually selects what to keep
const resolvedBookmark = {
  title: userSelectedTitle,
  url: userSelectedUrl,
  parentId: userSelectedParentId,
  lastModified: Date.now()
};
```

**Use When:**
- Complex conflicts require human judgment
- You need to review all changes
- Automated strategies aren't suitable

## Conflict Analysis

### Severity Assessment
- **Low**: Minor changes, easy to resolve
- **Medium**: Moderate conflicts, may need review
- **High**: Complex conflicts, requires manual resolution

### Conflict Categories
- **Title Only**: Only the bookmark title changed
- **URL Only**: Only the bookmark URL changed
- **Folder Only**: Only the bookmark location changed
- **Mixed**: Multiple properties changed

### Recommendations
- **Auto-resolve**: Suggested for low-severity conflicts
- **Manual Review**: Recommended for high-severity conflicts
- **Team Coordination**: Advised for team-shared bookmarks

## API Reference

### Conflict Resolution Functions
```javascript
import { 
  resolveConflicts, 
  CONFLICT_STRATEGIES,
  generateConflictSummary 
} from '../lib/sync/conflict-resolver.js';

// Resolve conflicts using a strategy
const resolvedConflicts = await resolveConflicts(conflicts, CONFLICT_STRATEGIES.MERGE);

// Generate conflict summary
const summary = generateConflictSummary(conflicts);
```

### Available Strategies
- `CONFLICT_STRATEGIES.LOCAL_WINS`: Keep local changes
- `CONFLICT_STRATEGIES.REMOTE_WINS`: Keep remote changes
- `CONFLICT_STRATEGIES.MERGE`: Merge both versions
- `CONFLICT_STRATEGIES.MANUAL`: Manual resolution

### Conflict Object Structure
```javascript
{
  id: 'bookmark-123',
  type: 'title_conflict',
  severity: 'medium',
  local: {
    title: 'Local Title',
    url: 'https://example.com',
    lastModified: 1640995200000
  },
  remote: {
    title: 'Remote Title',
    url: 'https://example.com',
    lastModified: 1640995300000
  },
  recommendations: ['merge', 'manual']
}
```

## Best Practices

### Prevention
- **Regular Sync**: Sync frequently to minimize conflicts
- **Team Communication**: Coordinate changes with team members
- **Clear Ownership**: Establish clear ownership of shared bookmarks

### Resolution
- **Review Before Resolving**: Always review conflicts before resolving
- **Use Appropriate Strategy**: Choose the right strategy for each conflict
- **Document Decisions**: Keep track of resolution decisions

### Team Collaboration
- **Team Coordination**: Coordinate with team members on shared bookmarks
- **Role-based Access**: Use role-based permissions to reduce conflicts
- **Shared Folders**: Use shared folders for team collaboration

## Troubleshooting

### Conflicts Not Detected
1. **Check Sync Status**: Ensure sync is running properly
2. **Verify Permissions**: Check file permissions
3. **Review Logs**: Check sync logs for errors

### Resolution Not Applied
1. **Check Network**: Ensure stable internet connection
2. **Verify Permissions**: Check Google Drive permissions
3. **Retry Resolution**: Try resolving conflicts again

### Performance Issues
1. **Limit Batch Size**: Process conflicts in smaller batches
2. **Clear Cache**: Clear browser cache if needed
3. **Check Storage**: Ensure sufficient storage space

## Related Documentation

- **[Sync Modes](Sync-Modes.md)** - Understanding sync modes
- **[Team Mode](team.md)** - Team collaboration features
- **[Shared Folders](shared-folders.md)** - Shared folder management
- **[Troubleshooting](Troubleshooting.md)** - Common issues and solutions 