# Naming Conventions

This document outlines the naming conventions used in the BookDrive extension project.

## File and Directory Naming

### General Rules

- Use **kebab-case** for all file and directory names
  - Example: `error-handler.js`, `backup-history`, `team-manager.js`
- Use lowercase letters for all file and directory names
- Use descriptive names that clearly indicate the purpose of the file or directory
- Avoid abbreviations unless they are widely understood
- Use consistent suffixes for specific file types

### File Extensions

- `.js` - JavaScript files
- `.html` - HTML files
- `.css` - CSS files
- `.json` - JSON files
- `.md` - Markdown documentation files
- `.test.js` - Test files

### Special Files

- `index.js` - Used for re-exporting from a directory
- `manifest.json` - Chrome extension manifest
- `README.md` - Project documentation
- `CHANGELOG.md` - Version history
- `LICENSE` - License information

### Directory Structure

- Use singular nouns for directories that contain a collection of similar items
  - Example: `lib`, `util`, `config`
- Use plural nouns for directories that contain multiple instances of the same type
  - Example: `assets`, `types`
- Group related files in appropriately named directories

## Code Naming Conventions

### JavaScript

#### Variables and Functions

- Use **camelCase** for variable and function names
  ```javascript
  const bookmarkCount = 42;
  function syncBookmarks() { /* ... */ }
  ```
- Use descriptive names that clearly indicate the purpose
- Boolean variables should be prefixed with `is`, `has`, `can`, etc.
  ```javascript
  const isActive = true;
  const hasPermission = checkPermission();
  ```
- Use verb phrases for function names
  ```javascript
  function createBookmark() { /* ... */ }
  function deleteFolder() { /* ... */ }
  ```

#### Classes and Constructors

- Use **PascalCase** for class names and constructor functions
  ```javascript
  class BookmarkManager { /* ... */ }
  function SyncEngine() { /* ... */ }
  ```
- Use noun phrases for class names
  ```javascript
  class DriveClient { /* ... */ }
  class ConflictResolver { /* ... */ }
  ```

#### Constants

- Use **UPPER_SNAKE_CASE** for constants
  ```javascript
  const MAX_RETRY_COUNT = 3;
  const DEFAULT_SYNC_INTERVAL = 60;
  ```
- Group related constants in objects
  ```javascript
  const ERROR_CODES = {
    NETWORK_ERROR: 'network-error',
    AUTH_FAILED: 'auth-failed',
    SYNC_CONFLICT: 'sync-conflict'
  };
  ```

#### Private Members

- Prefix private methods and properties with an underscore (`_`)
  ```javascript
  class SyncManager {
    constructor() {
      this._pendingChanges = [];
    }
    
    _processPendingChanges() {
      // Internal implementation
    }
    
    sync() {
      // Public API
      this._processPendingChanges();
    }
  }
  ```

### CSS

- Use **kebab-case** for CSS class names and IDs
  ```css
  .bookmark-item { /* ... */ }
  .sync-button { /* ... */ }
  #options-container { /* ... */ }
  ```
- Use BEM (Block Element Modifier) methodology for complex components
  ```css
  .bookmark-list { /* Block */ }
  .bookmark-list__item { /* Element */ }
  .bookmark-list__item--active { /* Modifier */ }
  ```

### HTML

- Use **kebab-case** for HTML IDs and classes
  ```html
  <div id="sync-container" class="sync-panel">
    <!-- ... -->
  </div>
  ```
- Use semantic HTML elements whenever possible
  ```html
  <header>, <nav>, <main>, <section>, <article>, <footer>
  ```

## Import/Export Patterns

### Import Order

Organize imports in a consistent order:

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

// CSS imports
import './styles.css';
```

### Export Patterns

- Use named exports for most modules to allow for selective imports
  ```javascript
  export function createBookmark() { /* ... */ }
  export function deleteBookmark() { /* ... */ }
  ```
- Use default exports sparingly and only for the main functionality of a module
  ```javascript
  export default class BookmarkManager { /* ... */ }
  ```
- Use index files to re-export from multiple files in a directory
  ```javascript
  // lib/index.js
  export * from './bookmarks.js';
  export * from './drive.js';
  export * from './storage.js';
  ```

## Documentation

### JSDoc Comments

- Use JSDoc comments to document functions, classes, and types
  ```javascript
  /**
   * Creates a new bookmark
   * @param {string} title - The title of the bookmark
   * @param {string} url - The URL of the bookmark
   * @param {string} [parentId] - The ID of the parent folder
   * @returns {Promise<BookmarkNode>} The created bookmark
   * @throws {Error} If the bookmark creation fails
   */
  async function createBookmark(title, url, parentId) {
    // Implementation
  }
  ```

### Markdown Documentation

- Use descriptive titles for documentation files
- Use proper Markdown formatting for headings, lists, code blocks, etc.
- Include examples and use cases where appropriate
- Keep documentation up-to-date with code changes