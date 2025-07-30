# File Organization

This document outlines the organization and structure of the BookDrive extension codebase, providing guidelines for maintaining a clean and scalable architecture.

## Directory Structure

```
bookdrive-extension/
├── src/                          # Source code directory
│   ├── background/               # Service worker and background scripts
│   ├── popup/                   # Extension popup interface
│   ├── options/                 # Settings and configuration page
│   ├── analytics/               # Sync analytics dashboard
│   ├── conflict-resolution/     # Conflict resolution interface
│   ├── shared-folders/          # Team collaboration interface
│   ├── backup-history/          # Backup management interface
│   ├── lib/                     # Core libraries and modules
│   │   ├── auth/               # Authentication and OAuth2
│   │   ├── backup/             # Backup and compression
│   │   ├── encryption/         # Client-side encryption
│   │   ├── sync/               # Sync operations and optimization
│   │   ├── team/               # Team collaboration
│   │   ├── analytics/          # Analytics and monitoring
│   │   ├── scheduling/         # Adaptive scheduling
│   │   └── storage/            # Storage management
│   ├── types/                  # TypeScript definitions
│   ├── utils/                  # Utility functions
│   ├── assets/                 # Static assets (icons, images)
│   ├── config/                 # Configuration files
│   └── __tests__/              # Test files
├── docs/                        # Documentation
│   └── wiki/                   # Wiki documentation
├── scripts/                     # Build and utility scripts
├── dist/                        # Build output directory
├── .github/                     # GitHub configuration
├── .husky/                      # Git hooks
├── .cursor/                     # Cursor IDE configuration
├── .kiro/                       # Kiro IDE configuration
└── .oauth2-backup/              # OAuth2 backup files
```

## Core Directories

### `src/` - Source Code
The main source code directory containing all application logic and UI components.

#### `background/` - Service Worker
- **Purpose**: Background scripts that run continuously
- **Files**: Service worker, alarm management, background tasks
- **Key Components**:
  - `background.js`: Main service worker
  - `index.js`: Background script entry point

#### `popup/` - Extension Popup
- **Purpose**: Main extension popup interface
- **Files**: HTML, CSS, and JavaScript for popup UI
- **Key Components**:
  - `popup.html`: Popup structure
  - `popup.css`: Popup styling
  - `popup.js`: Popup logic

#### `options/` - Settings Page
- **Purpose**: Extension settings and configuration
- **Files**: HTML, CSS, and JavaScript for options page
- **Key Components**:
  - `options.html`: Options page structure
  - `options.css`: Options page styling
  - `options.js`: Options page logic

#### Feature-Specific Directories
- **`analytics/`**: Sync analytics dashboard
- **`conflict-resolution/`**: Conflict resolution interface
- **`shared-folders/`**: Team collaboration interface
- **`backup-history/`**: Backup management interface

### `lib/` - Core Libraries
The core library directory containing modular, reusable code.

#### `auth/` - Authentication
- **Purpose**: OAuth2 authentication and Google Drive API integration
- **Key Files**:
  - `drive-auth.template.js`: OAuth2 template
  - `index.js`: Authentication module exports

#### `backup/` - Backup System
- **Purpose**: Backup creation, compression, and management
- **Key Files**:
  - `backup-metadata.js`: Backup metadata management
  - `backup-compression.js`: Compression and versioning
  - `retention-policy.js`: Backup retention policies
  - `index.js`: Backup module exports

#### `encryption/` - Encryption
- **Purpose**: Client-side encryption and key management
- **Key Files**:
  - `encryption.js`: Core encryption functions
  - `index.js`: Encryption module exports

#### `sync/` - Synchronization
- **Purpose**: Bookmark synchronization and conflict resolution
- **Key Files**:
  - `sync-service.js`: Core sync service
  - `sync-preview.js`: Sync preview functionality
  - `conflict-resolver.js`: Conflict resolution
  - `sync-optimizer.js`: Performance optimization
  - `index.js`: Sync module exports

#### `team/` - Team Collaboration
- **Purpose**: Team mode and shared folder functionality
- **Key Files**:
  - `team-manager.js`: Team management
  - `shared-folders.js`: Shared folder operations
  - `index.js`: Team module exports

#### `analytics/` - Analytics
- **Purpose**: Sync analytics and monitoring
- **Key Files**:
  - `sync-analytics.js`: Analytics tracking and reporting
  - `index.js`: Analytics module exports

#### `scheduling/` - Scheduling
- **Purpose**: Adaptive scheduling and resource management
- **Key Files**:
  - `scheduler.js`: Core scheduling logic
  - `alarm-manager.js`: Alarm management
  - `adaptive-scheduler.js`: Adaptive scheduling
  - `resource-monitor.js`: Resource monitoring
  - `index.js`: Scheduling module exports

#### `storage/` - Storage Management
- **Purpose**: Local and remote storage operations
- **Key Files**:
  - `storage.js`: Core storage functions
  - `drive.js`: Google Drive storage
  - `index.js`: Storage module exports

### `types/` - Type Definitions
- **Purpose**: TypeScript definitions and type checking
- **Key Files**:
  - `bookmarks.js`: Bookmark type definitions
  - `sync.js`: Sync-related types
  - `mocks.js`: Mock type definitions
  - `index.js`: Type module exports

### `utils/` - Utility Functions
- **Purpose**: Common utility functions and helpers
- **Key Files**:
  - `error-handler.js`: Error handling utilities
  - `perf.js`: Performance utilities
  - `index.js`: Utility module exports

## File Naming Conventions

### JavaScript Files
- **Modules**: Use kebab-case (e.g., `sync-service.js`)
- **Components**: Use kebab-case (e.g., `popup.js`, `options.js`)
- **Utilities**: Use kebab-case (e.g., `error-handler.js`)

### HTML Files
- **Pages**: Use kebab-case (e.g., `popup.html`, `options.html`)
- **Components**: Use descriptive names (e.g., `conflict-resolution.html`)

### CSS Files
- **Stylesheets**: Match HTML file names (e.g., `popup.css`, `options.css`)
- **Components**: Use kebab-case (e.g., `conflict-resolution.css`)

### Asset Files
- **Icons**: Use descriptive names with size (e.g., `icon16.png`, `icon48.png`)
- **Images**: Use kebab-case (e.g., `logo.png`)

## Module Organization

### Import/Export Structure
Each module should have a clear import/export structure:

```javascript
// Import dependencies
import { someFunction } from './dependency.js';

// Module functions
export function moduleFunction() {
  // Implementation
}

// Default export (if applicable)
export default ModuleClass;
```

### Index Files
Each directory should have an `index.js` file that exports all public modules:

```javascript
// Export all modules from this directory
export * from './module1.js';
export * from './module2.js';
export * from './module3.js';
```

## Configuration Files

### Root Level
- **`manifest.template.json`**: Extension manifest template
- **`package.json`**: Node.js package configuration
- **`esbuild.config.cjs`**: Build configuration
- **`jest.config.cjs`**: Test configuration

### Documentation
- **`README.md`**: Main project documentation
- **`CHANGELOG.md`**: Version history and changes
- **`CONTRIBUTING.md`**: Contribution guidelines
- **`SECURITY.md`**: Security information

## Build and Scripts

### `scripts/` Directory
- **Build Scripts**: Asset copying, manifest generation
- **Setup Scripts**: OAuth2 setup and configuration
- **Utility Scripts**: Development and maintenance tools

### Build Output
- **`dist/`**: Production build output
- **`.oauth2-backup/`**: OAuth2 credential backups

## Testing Structure

### `__tests__/` Directory
- **Unit Tests**: Individual module tests
- **Integration Tests**: Cross-module functionality tests
- **Test Utilities**: Test helpers and mocks

## Documentation Structure

### `docs/wiki/` Directory
- **User Guides**: Feature documentation and tutorials
- **Developer Guides**: Development and contribution guides
- **Reference**: API documentation and technical references

## Best Practices

### File Organization
1. **Logical Grouping**: Group related files in appropriate directories
2. **Clear Hierarchy**: Maintain clear directory hierarchy
3. **Consistent Naming**: Use consistent naming conventions
4. **Modular Structure**: Keep modules focused and single-purpose

### Code Organization
1. **Separation of Concerns**: Separate UI, logic, and data layers
2. **Dependency Management**: Minimize cross-module dependencies
3. **Error Handling**: Implement consistent error handling
4. **Documentation**: Include inline documentation for complex logic

### Maintenance
1. **Regular Cleanup**: Remove unused files and dependencies
2. **Version Control**: Use meaningful commit messages
3. **Code Review**: Review changes for organization and structure
4. **Documentation Updates**: Keep documentation in sync with code

## Migration Guidelines

### Adding New Features
1. **Create Feature Directory**: Add new feature-specific directory if needed
2. **Update Index Files**: Export new modules from index files
3. **Update Documentation**: Add feature documentation to wiki
4. **Update Build Scripts**: Include new files in build process

### Refactoring
1. **Plan Changes**: Plan refactoring changes in advance
2. **Update Imports**: Update all import statements
3. **Test Thoroughly**: Ensure all functionality works after refactoring
4. **Update Documentation**: Reflect changes in documentation

## Related Documentation

- **[File Naming Standards](File-Naming-Standards.md)** - Detailed naming conventions
- **[Naming Conventions](Naming-Conventions.md)** - Code and file naming rules
- **[Project Structure Summary](Project-Structure-Summary.md)** - High-level project overview
- **[Updated File Structure](Updated-File-Structure.md)** - Current file organization