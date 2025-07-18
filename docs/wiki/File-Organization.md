# File Organization and Naming Conventions

This document outlines the file organization and naming conventions used in the BookDrive extension project.

## Directory Structure

The BookDrive extension follows a modular directory structure to organize code logically and maintain separation of concerns:

### Core Directories

- **`src/`**: Contains all source code for the extension
  - **`assets/`**: Static assets like icons and images
  - **`background/`**: Background service worker scripts
  - **`backup-history/`**: Backup history viewer interface
  - **`config/`**: Configuration constants and settings
  - **`lib/`**: Core library modules and business logic
  - **`options/`**: Extension options page
  - **`popup/`**: Extension popup interface
  - **`types/`**: Type definitions and interfaces
  - **`utils/`**: Utility functions and helpers
  - **`__tests__/`**: Unit and integration tests

- **`docs/`**: Project documentation
  - **`wiki/`**: Wiki-style documentation for users and developers

- **`scripts/`**: Build and utility scripts

### File Organization Principles

1. **Separation of Concerns**: Each directory contains files related to a specific aspect of the application
2. **Modularity**: Code is organized into small, focused modules with clear responsibilities
3. **Discoverability**: Related files are grouped together to make them easy to find
4. **Scalability**: The structure allows for adding new features without major reorganization

## Naming Conventions

### Files and Directories

- Use **kebab-case** for directory and file names (e.g., `backup-history`, `error-handler.js`)
- Use descriptive names that clearly indicate the purpose of the file or directory
- Group related files in appropriately named directories
- Use consistent suffixes for specific file types:
  - `.test.js` for test files
  - `.html` for HTML templates
  - `.css` for stylesheets
  - `.js` for JavaScript files

### JavaScript Conventions

- Use **camelCase** for variable and function names
- Use **PascalCase** for class names and constructor functions
- Use **UPPER_SNAKE_CASE** for constants
- Prefix private methods and properties with an underscore (`_`)
- Use descriptive names that clearly indicate the purpose of the variable, function, or class

### Import/Export Patterns

- Each module should have a clear, well-defined public API
- Use named exports for most modules to allow for selective imports
- Use index files (`index.js`) to re-export from multiple files in a directory
- Organize imports in a consistent order:
  1. External libraries and dependencies
  2. Internal modules from other directories
  3. Local modules from the same directory
  4. CSS/asset imports

Example:
```javascript
// External dependencies
import { v4 as uuidv4 } from 'uuid';

// Internal modules
import { storage } from '../lib/index.js';
import { ERROR_CODES } from '../config/index.js';

// Local modules
import { validateBookmark } from './validation.js';
```

## Module Organization

### Core Library Modules

The `lib/` directory contains the core business logic of the extension, organized into focused modules:

- **Bookmark Management**: `bookmarks.js`
- **Google Drive Integration**: `drive.js`, `drive-auth.js`
- **Storage Management**: `storage.js`
- **Encryption**: `encryption.js`
- **Sync and Conflict Resolution**: `conflict-resolver.js`, `sync-preview.js`
- **Team Collaboration**: `team-manager.js`
- **Scheduling and Background Tasks**: `scheduler.js`, `alarm-manager.js`, `adaptive-scheduler.js`
- **Resource Monitoring**: `resource-monitor.js`
- **Backup Management**: `backup-metadata.js`
- **Notifications**: `notification-manager.js`

### Configuration

The `config/` directory centralizes all configuration settings:

- **Constants**: `constants.js` - Application-wide constants and default values
- **Exports**: `index.js` - Centralized export point for all configuration

### Type Definitions

The `types/` directory contains type definitions for key data structures:

- **Bookmark Types**: `bookmarks.js` - Bookmark-related type definitions
- **Sync Types**: `sync.js` - Sync-related type definitions
- **Mock Data**: `mocks.js` - Mock data for testing

### Utilities

The `utils/` directory contains general-purpose utility functions:

- **Error Handling**: `error-handler.js` - Error handling utilities
- **Performance**: `perf.js` - Performance tracking utilities

## Best Practices

1. **Keep files focused**: Each file should have a single responsibility
2. **Avoid circular dependencies**: Organize code to prevent circular imports
3. **Use index files**: Create index files to simplify imports from directories
4. **Document public APIs**: Add JSDoc comments to document functions and types
5. **Group related functionality**: Keep related code together in the same directory
6. **Follow consistent patterns**: Use the same patterns throughout the codebase
7. **Minimize dependencies**: Limit dependencies between modules when possible
8. **Test organization mirrors source**: Organize tests to mirror the source structure