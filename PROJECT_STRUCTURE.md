# BookDrive Project Structure

## 📁 Root Directory
```
bookdrive-extension/
├── 📄 README.md                    # Main project documentation
├── 📄 CHANGELOG.md                 # Version history and changes
├── 📄 CONTRIBUTING.md              # Contribution guidelines
├── 📄 LICENSE                      # GPL-3.0 license
├── 📄 DEPLOYMENT_GUIDE.md          # Deployment guide
├── 📄 BUILD.md                     # Build instructions
├── 📄 Troubleshooting.md           # Troubleshooting guide
├── 📄 RELEASE.md                   # Release process documentation
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📄 package.json                 # Node.js dependencies and scripts
├── 📄 package-lock.json            # Locked dependency versions
├── 📄 jest.config.cjs              # Jest testing configuration
├── 📄 jest.setup.js                # Jest setup and mocks
├── 📄 esbuild.config.cjs           # Build system configuration
├── 📄 babel.config.cjs             # Babel configuration
├── 📄 .eslintrc.json               # ESLint configuration
├── 📄 .prettierrc.json             # Prettier formatting rules
├── 📄 .gitignore                   # Git ignore patterns
└── 📁 [directories...]
```

## 📁 Source Code (`src/`)
```
src/
├── 📁 assets/                      # Extension icons and static assets
│   ├── 🖼️ icon16.png
│   ├── 🖼️ icon48.png
│   └── 🖼️ icon128.png
├── 📁 background/                  # Service worker (background script)
│   └── 📄 background.js            # Main background service worker
├── 📁 backup-history/              # Backup history viewer
│   ├── 📄 backup-history.html      # Backup history HTML
│   ├── 📄 backup-history.css       # Backup history styling
│   └── 📄 backup-history.js        # Backup history logic
├── 📁 config/                      # Configuration settings
│   ├── 📄 constants.js             # Application constants
│   └── 📄 index.js                 # Configuration exports
├── 📁 popup/                       # Extension popup interface
│   ├── 📄 popup.html               # Popup HTML structure
│   ├── 📄 popup.css                # Popup styling
│   └── 📄 popup.js                 # Popup logic and interactions
├── 📁 options/                     # Extension options/settings page
│   ├── 📄 options.html             # Options page HTML
│   └── 📄 options.js               # Options page logic
├── 📁 lib/                         # Core library modules
│   ├── 📄 adaptive-scheduler.js    # Adaptive scheduling system
│   ├── 📄 alarm-manager.js         # Chrome alarm API wrapper
│   ├── 📄 backup-metadata.js       # Backup metadata handling
│   ├── 📄 bookmarks.js             # Bookmark operations and management
│   ├── 📄 conflict-resolver.js     # Sync conflict resolution
│   ├── 📄 drive-auth.js            # Google Drive authentication
│   ├── 📄 drive.js                 # Google Drive API integration
│   ├── 📄 encryption.js            # Client-side encryption utilities
│   ├── 📄 index.js                 # Library exports
│   ├── 📄 notification-manager.js  # Notification handling
│   ├── 📄 resource-monitor.js      # System resource monitoring
│   ├── 📄 scheduler.js             # Task scheduling
│   ├── 📄 storage.js               # Chrome storage utilities
│   ├── 📄 sync-preview.js          # Sync preview functionality
│   └── 📄 team-manager.js          # Team collaboration features
├── 📁 types/                       # Type definitions
│   ├── 📄 bookmarks.js             # Bookmark-related types
│   ├── 📄 sync.js                  # Sync-related types
│   └── 📄 mocks.js                 # Mock data for testing
├── 📁 utils/                       # Utility functions
│   ├── 📄 error-handler.js         # Error handling utilities
│   ├── 📄 index.js                 # Utility exports
│   └── 📄 perf.js                  # Performance tracking
├── 📁 __tests__/                   # Unit tests
│   ├── 📄 adaptive-scheduler.test.js       # Adaptive scheduler tests
│   ├── 📄 alarm-manager-adaptive.test.js   # Adaptive alarm manager tests
│   ├── 📄 alarm-manager-extended.test.js   # Extended alarm manager tests
│   ├── 📄 alarm-manager.test.js            # Alarm manager tests
│   ├── 📄 backup-execution-integration.test.js # Backup execution tests
│   ├── 📄 backup-metadata-extended.test.js # Extended backup metadata tests
│   ├── 📄 backup-metadata.test.js          # Backup metadata tests
│   ├── 📄 backup-retry.test.js             # Backup retry tests
│   ├── 📄 bookmarks.test.js                # Bookmark functionality tests
│   ├── 📄 drive.test.js                    # Drive API tests
│   ├── 📄 notification-integration.test.js # Notification integration tests
│   ├── 📄 notification-manager.test.js     # Notification manager tests
│   ├── 📄 resource-adaptive-integration.test.js # Resource adaptive tests
│   ├── 📄 resource-monitor.test.js         # Resource monitor tests
│   ├── 📄 retention-policy-integration.test.js # Retention policy tests
│   ├── 📄 retention-policy.test.js         # Retention policy tests
│   ├── 📄 scheduler-backup-integration.test.js # Scheduler backup tests
│   ├── 📄 scheduler-extended.test.js       # Extended scheduler tests
│   ├── 📄 scheduler-integration.test.js    # Scheduler integration tests
│   └── 📄 scheduler.test.js                # Scheduler tests
└── 📄 manifest.json                # Chrome extension manifest
```

## 📁 Documentation (`docs/`)
```
docs/
└── 📁 wiki/                        # Wiki documentation
    ├── 📄 Home.md                   # Wiki home page
    ├── 📄 Installation.md           # Installation guide
    ├── 📄 Quick-Start.md            # Quick start tutorial
    ├── 📄 Configuration.md          # Configuration guide
    ├── 📄 Security.md               # Security features
    ├── 📄 Sync-Modes.md             # Sync modes explanation
    ├── 📄 Cross-Platform.md         # Cross-platform support
    ├── 📄 Troubleshooting.md        # Troubleshooting guide
    └── 📄 _Sidebar.md               # Wiki navigation sidebar
```

## 📁 Scripts (`scripts/`)
```
scripts/
├── 📄 copy-assets.js              # Copy assets to dist folder
├── 📄 copy-manifest.js            # Copy and process manifest to dist
├── 📄 create-package.js           # Create extension package
├── 📄 setup-oauth2.js             # OAuth2 setup script (Node.js)
└── 📄 setup-oauth2.sh             # OAuth2 setup script (Bash)
```

## 📁 GitHub Workflows (`.github/`)
```
.github/
└── 📁 workflows/
    └── 📄 ci.yml                    # Continuous Integration pipeline
```

## 📁 Build Output (`dist/`) - Generated
```
dist/                               # Generated during build
├── 📁 assets/                      # Copied static assets
├── 📁 background/
│   └── 📄 background.js            # Compiled background script
├── 📁 backup-history/
│   ├── 📄 backup-history.html      # Copied backup history HTML
│   ├── 📄 backup-history.css       # Copied backup history CSS
│   └── 📄 backup-history.js        # Compiled backup history script
├── 📁 popup/
│   ├── 📄 popup.html               # Copied popup HTML
│   ├── 📄 popup.css                # Copied popup CSS
│   └── 📄 popup.js                 # Compiled popup script
├── 📁 options/
│   ├── 📄 options.html             # Copied options HTML
│   └── 📄 options.js               # Compiled options script
└── 📄 manifest.json                # Copied manifest
```

## 🔧 Key Files Explained

### **Core Extension Files**
- `manifest.json` - Extension configuration and permissions
- `background/background.js` - Service worker for background operations
- `popup/popup.js` - Main user interface logic
- `options/options.js` - Settings page functionality

### **Library Modules**
- `lib/drive.js` - Google Drive API integration and file operations
- `lib/bookmarks.js` - Chrome bookmarks API wrapper and utilities
- `lib/storage.js` - Chrome storage API helpers and settings management
- `lib/encryption.js` - Client-side encryption using Web Crypto API

### **Advanced Features**
- `lib/conflict-resolver.js` - Handles bookmark sync conflicts
- `lib/team-manager.js` - Multi-user collaboration features
- `lib/sync-preview.js` - Preview sync changes before applying
- `lib/adaptive-scheduler.js` - Adaptive scheduling based on system resources
- `lib/backup-metadata.js` - Backup versioning and management

### **Configuration**
- `config/constants.js` - Application constants and default values
- `config/index.js` - Centralized configuration exports

### **Type Definitions**
- `types/bookmarks.js` - Bookmark-related type definitions
- `types/sync.js` - Sync-related type definitions
- `types/mocks.js` - Mock data for testing

### **Build and Development**
- `esbuild.config.cjs` - Modern build system configuration
- `package.json` - Dependencies, scripts, and project metadata
- `jest.config.cjs` - Testing framework setup

### **Documentation**
- `README.md` - Main project documentation
- `docs/wiki/` - Comprehensive user and developer guides
- `CONTRIBUTING.md` - Guidelines for contributors

## 🚀 Build Process

1. **Development**: `npm run dev` - Watch mode with hot reload
2. **Production**: `npm run build:prod` - Optimized production build
3. **Package**: `npm run package` - Create Chrome Web Store package
4. **Test**: `npm test` - Run unit tests

## 📦 Distribution

The extension is distributed as:
- **Chrome Web Store**: Official distribution channel
- **Manual Installation**: Load unpacked from `dist/` folder
- **GitHub Releases**: Versioned ZIP packages

## 🔒 Security

- **Manifest V3**: Latest Chrome extension security model
- **CSP**: Strict Content Security Policy
- **Minimal Permissions**: Only required permissions requested
- **Client-Side Encryption**: Optional end-to-end encryption