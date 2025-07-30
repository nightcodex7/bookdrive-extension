# Enhanced Bookmark Organization

BookDrive's Enhanced Bookmark Organization system provides advanced tools for organizing, managing, and discovering bookmarks. This system goes beyond basic bookmark management to offer intelligent smart folders, bulk operations, and sophisticated search capabilities.

## Overview

The Enhanced Bookmark Organization system includes advanced smart folders with 15+ rule types, bulk operations for efficient management, and advanced search with multi-criteria filtering. This system helps users organize large bookmark collections efficiently and discover relevant bookmarks quickly.

## Advanced Smart Folders

### Smart Folder Concepts

Smart folders are dynamic collections of bookmarks that automatically update based on defined rules. Unlike regular folders, smart folders don't store bookmarks directly but display bookmarks that match specific criteria.

### Rule Types

#### 1. Basic Rules
- **Title Contains**: Bookmarks with titles containing specific text
- **URL Contains**: Bookmarks with URLs containing specific text
- **Domain Match**: Bookmarks from specific domains
- **Date Range**: Bookmarks created or modified within a date range

#### 2. Advanced Rules
- **Regex Match**: Bookmarks matching regular expression patterns
- **Domain Match**: Bookmarks from specific domains or subdomains
- **Has Notes**: Bookmarks that have notes attached
- **Has Tags**: Bookmarks that have specific tags
- **No Tags**: Bookmarks without any tags
- **Favorite**: Bookmarks marked as favorites
- **Recently Added**: Bookmarks added within a time period
- **Recently Modified**: Bookmarks modified within a time period
- **Sync Status**: Bookmarks with specific sync status
- **Encryption Status**: Bookmarks with specific encryption status

### Smart Folder Operators

#### Comparison Operators
- **Equals**: Exact match
- **Not Equals**: Not matching exactly
- **Contains**: Contains the specified text
- **Not Contains**: Does not contain the specified text
- **Starts With**: Begins with the specified text
- **Ends With**: Ends with the specified text

#### Numeric Operators
- **Greater Than**: Numeric value greater than specified
- **Less Than**: Numeric value less than specified
- **Between**: Numeric value within a range
- **In**: Value is in a list of options
- **Not In**: Value is not in a list of options

#### Special Operators
- **Is Empty**: Field is empty or null
- **Is Not Empty**: Field has a value
- **Regex**: Matches regular expression pattern

## Creating Smart Folders

### Basic Smart Folder
```javascript
import { createAdvancedSmartFolder } from '../lib/bookmarks.js';

// Create a smart folder for work-related bookmarks
const workFolder = await createAdvancedSmartFolder('Work Bookmarks', [
  {
    field: 'title',
    operator: 'contains',
    value: 'work'
  },
  {
    field: 'domain',
    operator: 'in',
    value: ['company.com', 'work-tools.com']
  }
]);
```

### Advanced Smart Folder
```javascript
// Create a smart folder for recently added tech articles
const techArticles = await createAdvancedSmartFolder('Recent Tech Articles', [
  {
    field: 'domain',
    operator: 'regex',
    value: '.*\\.(tech|dev|io|com)$'
  },
  {
    field: 'dateAdded',
    operator: 'greater_than',
    value: Date.now() - (7 * 24 * 60 * 60 * 1000) // Last 7 days
  },
  {
    field: 'tags',
    operator: 'contains',
    value: 'technology'
  }
], {
  autoUpdate: true,
  updateInterval: 3600000, // Update every hour
  sortBy: 'dateAdded',
  sortOrder: 'desc'
});
```

### Complex Smart Folder with Multiple Rules
```javascript
// Create a smart folder for important unread articles
const importantUnread = await createAdvancedSmartFolder('Important Unread', [
  {
    field: 'tags',
    operator: 'contains',
    value: 'important'
  },
  {
    field: 'notes',
    operator: 'is_not_empty'
  },
  {
    field: 'dateAdded',
    operator: 'greater_than',
    value: Date.now() - (30 * 24 * 60 * 60 * 1000) // Last 30 days
  }
], {
  autoUpdate: true,
  updateInterval: 1800000, // Update every 30 minutes
  maxResults: 50,
  sortBy: 'dateAdded',
  sortOrder: 'desc'
});
```

## Bulk Operations

### Bulk Tag Management

#### Add Tags to Multiple Bookmarks
```javascript
import { bulkAddTags } from '../lib/bookmarks.js';

// Add 'work' tag to selected bookmarks
await bulkAddTags(['bookmark-1', 'bookmark-2', 'bookmark-3'], ['work', 'important']);
```

#### Remove Tags from Multiple Bookmarks
```javascript
import { bulkRemoveTags } from '../lib/bookmarks.js';

// Remove 'old' tag from selected bookmarks
await bulkRemoveTags(['bookmark-1', 'bookmark-2'], ['old', 'outdated']);
```

### Bulk Bookmark Management

#### Move Multiple Bookmarks
```javascript
import { bulkMoveBookmarks } from '../lib/bookmarks.js';

// Move bookmarks to a specific folder
await bulkMoveBookmarks(['bookmark-1', 'bookmark-2'], 'folder-123');
```

#### Delete Multiple Bookmarks
```javascript
import { bulkDeleteBookmarks } from '../lib/bookmarks.js';

// Delete multiple bookmarks
await bulkDeleteBookmarks(['bookmark-1', 'bookmark-2', 'bookmark-3']);
```

## Advanced Search

### Search Criteria

The advanced search system supports multiple criteria with logical operators:

#### Basic Search
```javascript
import { advancedSearch } from '../lib/bookmarks.js';

// Search for bookmarks with 'javascript' in title or URL
const results = await advancedSearch({
  query: 'javascript',
  fields: ['title', 'url']
});
```

#### Multi-Criteria Search
```javascript
// Search for work-related bookmarks from the last month
const results = await advancedSearch({
  criteria: [
    {
      field: 'title',
      operator: 'contains',
      value: 'work'
    },
    {
      field: 'dateAdded',
      operator: 'greater_than',
      value: Date.now() - (30 * 24 * 60 * 60 * 1000)
    }
  ],
  operator: 'AND'
});
```

#### Complex Search with Tags
```javascript
// Search for bookmarks with specific tags and domains
const results = await advancedSearch({
  criteria: [
    {
      field: 'tags',
      operator: 'contains',
      value: 'programming'
    },
    {
      field: 'domain',
      operator: 'in',
      value: ['github.com', 'stackoverflow.com']
    }
  ],
  operator: 'AND',
  sortBy: 'dateAdded',
  sortOrder: 'desc',
  limit: 20
});
```

### Search Options

#### Sorting Options
- **Sort By**: title, url, dateAdded, dateModified, domain, tags
- **Sort Order**: asc (ascending), desc (descending)

#### Pagination Options
- **Limit**: Maximum number of results
- **Offset**: Number of results to skip
- **Page**: Page number for pagination

#### Filter Options
- **Include Folders**: Include folder information
- **Include Tags**: Include tag information
- **Include Notes**: Include note information
- **Include Metadata**: Include additional metadata

## Smart Folder Management

### Updating Smart Folders
```javascript
import { updateSmartFolder } from '../lib/bookmarks.js';

// Update smart folder rules
await updateSmartFolder('smart-folder-123', [
  {
    field: 'title',
    operator: 'contains',
    value: 'updated-search-term'
  }
], {
  autoUpdate: true,
  updateInterval: 1800000
});
```

### Getting Smart Folder Information
```javascript
import { getSmartFolderById, getSmartFolders } from '../lib/bookmarks.js';

// Get all smart folders
const allFolders = await getSmartFolders();

// Get specific smart folder
const folder = await getSmartFolderById('smart-folder-123');
```

### Deleting Smart Folders
```javascript
import { deleteSmartFolder } from '../lib/bookmarks.js';

// Delete a smart folder
await deleteSmartFolder('smart-folder-123');
```

## Auto-Update Features

### Automatic Updates
Smart folders can be configured to update automatically:

```javascript
// Create smart folder with auto-update
const autoUpdateFolder = await createAdvancedSmartFolder('Auto Update Folder', rules, {
  autoUpdate: true,
  updateInterval: 300000, // Update every 5 minutes
  updateOnChange: true, // Update when bookmarks change
  backgroundUpdate: true // Update in background
});
```

### Update Triggers
- **Time-based**: Regular intervals (every 5 minutes, hourly, daily)
- **Event-based**: When bookmarks are added, modified, or deleted
- **Manual**: User-triggered updates
- **Background**: Updates while extension is idle

## Performance Optimization

### Caching
- **Smart Folder Results**: Cached for quick access
- **Search Results**: Cached with expiration
- **Metadata**: Cached bookmark metadata

### Lazy Loading
- **Large Results**: Load results in chunks
- **Pagination**: Load results page by page
- **Background Processing**: Process updates in background

### Indexing
- **Search Index**: Maintain search index for fast queries
- **Tag Index**: Index tags for quick tag-based searches
- **Domain Index**: Index domains for domain-based filtering

## Usage Examples

### Workflow Examples

#### 1. Research Project Organization
```javascript
// Create smart folder for research project
const researchFolder = await createAdvancedSmartFolder('Research Project', [
  {
    field: 'tags',
    operator: 'contains',
    value: 'research'
  },
  {
    field: 'dateAdded',
    operator: 'greater_than',
    value: Date.now() - (90 * 24 * 60 * 60 * 1000) // Last 90 days
  }
], {
  autoUpdate: true,
  updateInterval: 3600000, // Hourly updates
  sortBy: 'dateAdded',
  sortOrder: 'desc'
});

// Add research tag to relevant bookmarks
await bulkAddTags(selectedBookmarks, ['research']);
```

#### 2. Content Curation
```javascript
// Create smart folder for curated content
const curatedFolder = await createAdvancedSmartFolder('Curated Content', [
  {
    field: 'notes',
    operator: 'is_not_empty'
  },
  {
    field: 'tags',
    operator: 'contains',
    value: 'curated'
  }
], {
  autoUpdate: true,
  updateInterval: 1800000, // Every 30 minutes
  sortBy: 'dateModified',
  sortOrder: 'desc'
});
```

#### 3. Learning Management
```javascript
// Create smart folder for learning resources
const learningFolder = await createAdvancedSmartFolder('Learning Resources', [
  {
    field: 'domain',
    operator: 'in',
    value: ['coursera.org', 'udemy.com', 'edx.org', 'khanacademy.org']
  },
  {
    field: 'dateAdded',
    operator: 'greater_than',
    value: Date.now() - (365 * 24 * 60 * 60 * 1000) // Last year
  }
], {
  autoUpdate: true,
  updateInterval: 7200000, // Every 2 hours
  sortBy: 'dateAdded',
  sortOrder: 'desc'
});
```

## Best Practices

### 1. Smart Folder Design
- **Keep Rules Simple**: Avoid overly complex rule combinations
- **Use Specific Criteria**: Be specific with search terms and domains
- **Consider Performance**: Limit the number of rules for better performance
- **Regular Maintenance**: Review and update smart folders regularly

### 2. Bulk Operations
- **Batch Size**: Process bookmarks in reasonable batch sizes
- **Confirmation**: Always confirm before bulk deletions
- **Backup**: Backup important bookmarks before bulk operations
- **Testing**: Test bulk operations on a small subset first

### 3. Search Optimization
- **Use Indexes**: Leverage indexed fields for faster searches
- **Limit Results**: Use pagination for large result sets
- **Cache Results**: Cache frequently used search results
- **Optimize Queries**: Use specific criteria instead of broad searches

### 4. Performance
- **Auto-update Intervals**: Set reasonable update intervals
- **Background Processing**: Use background updates when possible
- **Lazy Loading**: Implement lazy loading for large collections
- **Caching**: Cache frequently accessed data

## Troubleshooting

### Common Issues

1. **Smart folders not updating**
   - Check auto-update settings
   - Verify update intervals
   - Check for background processing errors

2. **Search results not accurate**
   - Review search criteria
   - Check operator usage
   - Verify field names and values

3. **Bulk operations failing**
   - Check bookmark permissions
   - Verify bookmark IDs
   - Check for network connectivity

4. **Performance issues**
   - Reduce number of rules
   - Increase update intervals
   - Use pagination for large results

### Debugging
```javascript
// Enable debug logging
const debugOptions = {
  verbose: true,
  logQueries: true,
  logUpdates: true
};

// Test smart folder rules
const testResults = await testSmartFolderRules(rules, sampleBookmarks);
console.log('Test results:', testResults);
```

## API Reference

### Main Functions

#### `createAdvancedSmartFolder(name, rules, options)`
Creates a new advanced smart folder.

**Parameters**:
- `name`: Smart folder name
- `rules`: Array of rule objects
- `options`: Configuration options

**Returns**: Promise resolving to created smart folder

#### `getSmartFolderBookmarks(rules, options)`
Gets bookmarks matching smart folder rules.

**Parameters**:
- `rules`: Array of rule objects
- `options`: Search and display options

**Returns**: Promise resolving to matching bookmarks

#### `advancedSearch(criteria, options)`
Performs advanced search on bookmarks.

**Parameters**:
- `criteria`: Search criteria object
- `options`: Search options

**Returns**: Promise resolving to search results

#### `bulkAddTags(bookmarkIds, tags)`
Adds tags to multiple bookmarks.

**Parameters**:
- `bookmarkIds`: Array of bookmark IDs
- `tags`: Array of tags to add

**Returns**: Promise resolving to operation result

### Constants

#### `SMART_FOLDER_RULES`
Available rule types:
- `TITLE_CONTAINS`
- `URL_CONTAINS`
- `DOMAIN_MATCH`
- `REGEX_MATCH`
- `HAS_NOTES`
- `HAS_TAGS`
- `FAVORITE`
- `RECENTLY_ADDED`
- `RECENTLY_MODIFIED`
- `SYNC_STATUS`
- `ENCRYPTION_STATUS`

#### `SMART_FOLDER_OPERATORS`
Available operators:
- `EQUALS`
- `NOT_EQUALS`
- `CONTAINS`
- `NOT_CONTAINS`
- `STARTS_WITH`
- `ENDS_WITH`
- `GREATER_THAN`
- `LESS_THAN`
- `BETWEEN`
- `IN`
- `NOT_IN`
- `IS_EMPTY`
- `IS_NOT_EMPTY`
- `REGEX`

## Integration

The Enhanced Bookmark Organization system integrates with:
- **Sync Service**: Smart folders sync across devices
- **Team Features**: Shared smart folders for team collaboration
- **Analytics**: Usage analytics for smart folders and searches
- **Backup System**: Smart folder configurations backed up
- **User Interface**: Intuitive interface for managing smart folders 