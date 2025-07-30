# Advanced Conflict Resolution

BookDrive's Advanced Conflict Resolution system provides intelligent and flexible strategies for resolving bookmark synchronization conflicts. This system goes beyond basic conflict resolution to offer multiple resolution strategies with intelligent analysis and user preference support.

## Overview

The Advanced Conflict Resolution system implements 5 different resolution strategies, each designed for specific conflict scenarios and user preferences. The system automatically analyzes conflicts and can resolve them intelligently or present options to users.

## Resolution Strategies

### 1. Intelligent Merge Strategy
**Default Strategy**: Automatically combines local and remote versions intelligently.

**How it works**:
- Analyzes content similarity between local and remote versions
- Preserves unique information from both versions
- Merges titles, URLs, and metadata intelligently
- Handles folder structures and hierarchies

**Best for**: Most conflict scenarios where both versions contain valuable information.

### 2. Timestamp-Based Resolution
Uses timestamps and user activity patterns to determine the most recent or relevant version.

**How it works**:
- Compares modification timestamps
- Considers user activity patterns
- Respects timezone differences
- Handles clock synchronization issues

**Best for**: Conflicts where recency is the primary factor.

### 3. Content-Aware Resolution
Analyzes content similarity and completeness to determine the best version.

**How it works**:
- Calculates content similarity scores
- Evaluates completeness of bookmark data
- Considers URL validity and accessibility
- Analyzes metadata quality

**Best for**: Conflicts where content quality varies significantly.

### 4. User Preference Resolution
Respects user-defined conflict preferences and settings.

**How it works**:
- Uses user-configured default preferences
- Learns from previous conflict resolutions
- Applies user-defined rules
- Maintains consistency with user choices

**Best for**: Users with specific preferences for conflict resolution.

### 5. Auto-Resolve Strategy
Automatically resolves low-severity conflicts without user intervention.

**How it works**:
- Categorizes conflicts by severity
- Auto-resolves low and medium severity conflicts
- Escalates high and critical conflicts to user
- Maintains resolution history

**Best for**: Reducing user intervention for minor conflicts.

## Conflict Types

### 1. Title Only Conflicts
- **Description**: Only the bookmark title differs between versions
- **Severity**: Low
- **Resolution**: Usually auto-resolved with intelligent merge

### 2. URL Only Conflicts
- **Description**: Only the bookmark URL differs between versions
- **Severity**: Medium
- **Resolution**: Content-aware analysis to determine valid URL

### 3. Folder Only Conflicts
- **Description**: Only the folder location differs between versions
- **Severity**: Low
- **Resolution**: Preserves both locations or merges intelligently

### 4. Mixed Conflicts
- **Description**: Multiple fields differ between versions
- **Severity**: Medium to High
- **Resolution**: Intelligent merge or user intervention

### 5. Deletion Conflicts
- **Description**: One version deleted, other modified
- **Severity**: High
- **Resolution**: User decision required

### 6. Duplicate Conflicts
- **Description**: Same bookmark exists in multiple locations
- **Severity**: Low
- **Resolution**: Auto-merge or user choice

### 7. Permission Conflicts
- **Description**: Access permission differences
- **Severity**: Critical
- **Resolution**: Always requires user intervention

## Conflict Severity Levels

### Low Severity
- Minor metadata differences
- Duplicate bookmarks
- Folder location changes
- **Auto-resolution**: Enabled by default

### Medium Severity
- URL changes
- Title modifications
- Mixed field conflicts
- **Auto-resolution**: Optional, based on user preferences

### High Severity
- Deletion conflicts
- Significant content changes
- **Auto-resolution**: Disabled, requires user intervention

### Critical Severity
- Permission conflicts
- Security-related issues
- **Auto-resolution**: Never auto-resolved

## Configuration

### Strategy Selection
```javascript
// Set default resolution strategy
const strategy = CONFLICT_STRATEGIES.INTELLIGENT_MERGE;

// Configure resolution options
const options = {
  autoResolveLowSeverity: true,
  autoResolveMediumSeverity: false,
  userPreferences: {
    preferLocal: false,
    preferRemote: false,
    mergeStrategy: 'intelligent'
  }
};
```

### User Preferences
```javascript
// Configure user preferences
const userPreferences = {
  defaultStrategy: CONFLICT_STRATEGIES.INTELLIGENT_MERGE,
  autoResolveThreshold: CONFLICT_SEVERITY.LOW,
  preserveHistory: true,
  notifyOnResolution: true
};
```

## Usage Examples

### Basic Conflict Resolution
```javascript
import { resolveConflictsAdvanced } from '../lib/sync/conflict-resolver.js';

// Resolve conflicts with default strategy
const resolved = await resolveConflictsAdvanced(conflicts);
```

### Custom Strategy Resolution
```javascript
// Use timestamp-based resolution
const resolved = await resolveConflictsAdvanced(
  conflicts,
  CONFLICT_STRATEGIES.TIMESTAMP_BASED,
  { preferRecent: true }
);
```

### User Preference Resolution
```javascript
// Use user preferences
const resolved = await resolveConflictsAdvanced(
  conflicts,
  CONFLICT_STRATEGIES.USER_PREFERENCE,
  { userPreferences: getUserPreferences() }
);
```

## Conflict Analysis

### Similarity Calculation
The system calculates similarity between conflicting versions using:
- **String similarity**: Levenshtein distance for titles and URLs
- **Content analysis**: Domain extraction and validation
- **Metadata comparison**: Tags, notes, and other attributes
- **Structural analysis**: Folder hierarchy and organization

### Change Summary
For each conflict, the system provides:
- **Change type**: What fields have changed
- **Change magnitude**: How significant the changes are
- **Impact assessment**: Potential impact of resolution choices
- **Recommendation**: Suggested resolution approach

## Resolution History

### Tracking
All conflict resolutions are tracked for:
- **Audit purposes**: Complete history of all resolutions
- **Learning**: Improve future conflict resolution
- **User preferences**: Understand user resolution patterns
- **Analytics**: Conflict frequency and resolution success rates

### History Management
```javascript
// Get resolution history
const history = await getResolutionHistory();

// Clear history
await clearResolutionHistory();

// Export history
const exported = await exportResolutionHistory();
```

## Best Practices

### 1. Strategy Selection
- Use **Intelligent Merge** for most scenarios
- Use **Timestamp-Based** when recency is important
- Use **Content-Aware** for quality-focused resolution
- Use **User Preference** for consistent user experience
- Use **Auto-Resolve** to reduce user intervention

### 2. Configuration
- Set appropriate auto-resolution thresholds
- Configure user preferences based on usage patterns
- Enable resolution history for learning
- Set up notifications for important conflicts

### 3. Monitoring
- Monitor conflict frequency and types
- Track resolution success rates
- Analyze user resolution patterns
- Adjust strategies based on feedback

## Troubleshooting

### Common Issues

1. **Too many conflicts**
   - Check sync frequency settings
   - Review conflict resolution strategy
   - Consider adjusting auto-resolution thresholds

2. **Incorrect resolutions**
   - Review user preferences
   - Check conflict analysis accuracy
   - Adjust similarity thresholds

3. **Performance issues**
   - Limit conflict analysis depth
   - Optimize similarity calculations
   - Use caching for repeated analysis

### Debugging
```javascript
// Enable debug logging
const debugOptions = {
  verbose: true,
  logAnalysis: true,
  logResolutions: true
};

// Get detailed conflict information
const conflictInfo = await analyzeConflict(conflict);
console.log('Conflict analysis:', conflictInfo);
```

## API Reference

### Main Functions

#### `resolveConflictsAdvanced(conflicts, strategy, options)`
Resolves conflicts using the specified strategy.

**Parameters**:
- `conflicts`: Array of conflict objects
- `strategy`: Resolution strategy (default: INTELLIGENT_MERGE)
- `options`: Configuration options

**Returns**: Promise resolving to resolved conflicts

#### `analyzeConflict(conflict)`
Analyzes a single conflict for detailed information.

**Parameters**:
- `conflict`: Conflict object to analyze

**Returns**: Promise resolving to conflict analysis

#### `getResolutionHistory()`
Retrieves the complete resolution history.

**Returns**: Promise resolving to resolution history array

### Constants

#### `CONFLICT_STRATEGIES`
Available resolution strategies:
- `INTELLIGENT_MERGE`
- `TIMESTAMP_BASED`
- `CONTENT_AWARE`
- `USER_PREFERENCE`
- `AUTO_RESOLVE`

#### `CONFLICT_SEVERITY`
Conflict severity levels:
- `LOW`
- `MEDIUM`
- `HIGH`
- `CRITICAL`

#### `CONFLICT_TYPES`
Conflict type definitions:
- `TITLE_ONLY`
- `URL_ONLY`
- `FOLDER_ONLY`
- `MIXED`
- `DELETION`
- `DUPLICATE`
- `PERMISSION`

## Integration

The Advanced Conflict Resolution system integrates with:
- **Sync Service**: Automatic conflict detection and resolution
- **User Interface**: Conflict resolution dialogs and preferences
- **Analytics**: Conflict tracking and resolution metrics
- **Team Features**: Conflict resolution in team environments
- **Backup System**: Conflict resolution history preservation 