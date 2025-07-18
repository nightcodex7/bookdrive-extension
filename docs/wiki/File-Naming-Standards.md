# File Naming Standards

This document outlines the standardized file naming conventions implemented across the BookDrive extension project.

## Overview

Consistent file naming is essential for maintainability, readability, and collaboration. This document describes the standards applied to all files in the BookDrive project and provides guidelines for future development.

## File Naming Principles

### General Rules

1. **Use kebab-case for all file and directory names**
   - Example: `error-handler.js`, `backup-history`, `setup-oauth2.js`
   - Exception: Special files like `README.md`, `LICENSE`, etc.

2. **Use descriptive names that clearly indicate purpose**
   - Good: `conflict-resolver.js`, `backup-metadata.js`
   - Avoid: `utils1.js`, `helper.js`

3. **Avoid abbreviations unless widely understood**
   - Good: `notification-manager.js`
   - Avoid: `notif-mgr.js`

4. **Use consistent suffixes for specific file types**
   - `.js` - JavaScript files
   - `.html` - HTML files
   - `.css` - CSS files
   - `.json` - JSON files
   - `.md` - Markdown documentation files
   - `.test.js` - Test files

## Directory Structure

The project follows a modular directory structure with clear separation of concerns:

```
src/
├── assets/                  # Static assets
├── background/              # Background service worker
├── backup-history/          # Backup history viewer
├── config/                  # Configuration settings
├── lib/                     # Core library modules
│   ├── auth/                # Authentication modules
│   ├── backup/              # Backup modules
│   ├── scheduling/          # Scheduling modules
│   ├── storage/             # Storage modules
│   ├── sync/                # Sync modules
│   └── team/                # Team modules
├── options/                 # Options page
├── popup/                   # Popup interface
├── types/                   # Type definitions
├── utils/                   # Utility functions
└── __tests__/               # Unit tests
```

## Specific Naming Conventions

### JavaScript Files

- Use kebab-case for all JavaScript files
- Name should clearly indicate the file's purpose
- Examples:
  - `error-handler.js`
  - `backup-metadata.js`
  - `setup-oauth2.js`

### HTML and CSS Files

- Use kebab-case for HTML and CSS files
- Name should match the associated JavaScript file when applicable
- Examples:
  - `popup.html` and `popup.css` pair with `popup.js`
  - `options.html` pairs with `options.js`
  - `backup-history.html` and `backup-history.css` pair with `backup-history.js`

### Test Files

- Basic tests: Use the pattern `[module].test.js`
  - Example: `bookmarks.test.js`, `drive.test.js`
- Specialized tests: Use the pattern `[module]-[descriptor].test.js`
  - Example: `alarm-manager-extended.test.js`, `backup-metadata-extended.test.js`
- Integration tests: Use the pattern `[module]-integration.test.js`
  - Example: `notification-integration.test.js`, `scheduler-integration.test.js`

### Documentation Files

- **Root-level documentation**: Use UPPERCASE for root-level documentation files
  - Example: `README.md`, `CONTRIBUTING.md`, `LICENSE`
- **Wiki documentation**: Use Title-Case with hyphens for wiki documentation files
  - Example: `File-Organization.md`, `Naming-Conventions.md`

### Configuration Files

- Use kebab-case for configuration files
- Follow standard naming conventions for configuration files when applicable
- Examples:
  - `.eslintrc.json`
  - `.prettierrc.json`
  - `package.json`
  - `manifest.json`

### Shell Scripts

- Use kebab-case for all shell scripts
- Examples:
  - `setup-oauth2.sh`
  - `build-extension.sh`

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
import { storage } from '../lib/storage/index.js';
import { ERROR_CODES } from '../config/index.js';

// Local modules
import { validateBookmark } from './validation.js';

// CSS imports
import './styles.css';
```

### Export Patterns

- Use named exports for most modules to allow for selective imports
- Use index files to re-export from multiple files in a directory
- Example:
  ```javascript
  // lib/sync/index.js
  export * from './conflict-resolver.js';
  export * from './sync-preview.js';
  ```

## Benefits of Standardized Naming

1. **Improved Readability**: Consistent naming makes the codebase easier to read and understand
2. **Better Maintainability**: Standardized naming reduces cognitive load when navigating the codebase
3. **Easier Collaboration**: Team members can quickly understand the purpose of files
4. **Reduced Errors**: Consistent naming reduces the chance of errors when referencing files
5. **Automated Processing**: Standardized naming enables more reliable automated processing of files

## Implementation Notes

This standardized naming convention has been implemented across the entire project. Key changes include:

1. Converting snake_case files to kebab-case:
   - `setup_oauth2.js` → `setup-oauth2.js`
   - `setup_oauth2.sh` → `setup-oauth2.sh`

2. Reorganizing the lib directory into subdirectories:
   - `auth/` - Authentication-related modules
   - `backup/` - Backup-related modules
   - `scheduling/` - Scheduling and background tasks
   - `storage/` - Storage-related modules
   - `sync/` - Sync-related modules
   - `team/` - Team collaboration modules

3. Updating import paths to reflect the new structure:
   - `../lib/storage.js` → `../lib/storage/storage.js`
   - `../lib/resource-monitor.js` → `../lib/scheduling/resource-monitor.js`
   - `../lib/scheduler.js` → `../lib/scheduling/scheduler.js`

4. Creating index.js files in each subdirectory to simplify imports