# Updated File Structure

This document outlines the updated file structure for the BookDrive extension project.

## Core Library Structure

The `lib/` directory has been reorganized into subdirectories based on functionality:

```
src/lib/
├── auth/                       # Authentication-related modules
│   ├── drive-auth.js           # Google Drive authentication
│   └── index.js                # Re-exports
├── backup/                     # Backup-related modules
│   ├── backup-metadata.js      # Backup metadata handling
│   └── index.js                # Re-exports
├── scheduling/                 # Scheduling and background tasks
│   ├── scheduler.js            # Task scheduling
│   ├── alarm-manager.js        # Chrome alarm API wrapper
│   ├── adaptive-scheduler.js   # Adaptive scheduling system
│   ├── resource-monitor.js     # System resource monitoring
│   └── index.js                # Re-exports
├── storage/                    # Storage-related modules
│   ├── storage.js              # Chrome storage utilities
│   ├── drive.js                # Google Drive API integration
│   └── index.js                # Re-exports
├── sync/                       # Sync-related modules
│   ├── conflict-resolver.js    # Sync conflict resolution
│   ├── sync-preview.js         # Preview sync changes
│   └── index.js                # Re-exports
├── team/                       # Team collaboration modules
│   ├── team-manager.js         # Team collaboration features
│   └── index.js                # Re-exports
├── bookmarks.js                # Bookmark operations and management
├── encryption.js               # Client-side encryption utilities
├── notification-manager.js     # Notification handling
└── index.js                    # Main library exports
```

## Import Patterns

With the updated structure, imports should follow these patterns:

### Importing from the main library

```javascript
// Import everything
import * as lib from '../lib/index.js';

// Import specific modules
import { bookmarks, encryption } from '../lib/index.js';
```

### Importing from specific subdirectories

```javascript
// Import from sync modules
import { conflictResolver } from '../lib/sync/index.js';

// Import from storage modules
import { storage, drive } from '../lib/storage/index.js';
```

## Benefits of the New Structure

1. **Better Organization**: Related modules are grouped together
2. **Improved Discoverability**: Easier to find specific functionality
3. **Cleaner Imports**: Simplified import statements
4. **Scalability**: Easier to add new modules to specific areas
5. **Maintainability**: Clearer separation of concerns

## Migration Notes

The original files are still present in the root `lib/` directory for backward compatibility. Once all import references have been updated throughout the codebase, the original files can be removed.