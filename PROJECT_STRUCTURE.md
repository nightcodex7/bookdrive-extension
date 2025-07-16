# BookDrive Project Structure

## 📁 Root Directory
```
bookdrive-extension/
├── 📄 README.md                    # Main project documentation
├── 📄 CHANGELOG.md                 # Version history and changes
├── 📄 CONTRIBUTING.md              # Contribution guidelines
├── 📄 LICENSE                      # GPL-3.0 license
├── 📄 PRODUCTION_CHECKLIST.md      # Production readiness checklist
├── 📄 PROJECT_STRUCTURE.md         # This file
├── 📄 package.json                 # Node.js dependencies and scripts
├── 📄 package-lock.json            # Locked dependency versions
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 jest.config.js               # Jest testing configuration
├── 📄 jest.setup.js                # Jest setup and mocks
├── 📄 esbuild.config.js            # Build system configuration
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
│   ├── 🖼️ icon32.png
│   ├── 🖼️ icon48.png
│   ├── 🖼️ icon64.png
│   └── 🖼️ icon128.png
├── 📁 background/                  # Service worker (background script)
│   └── 📄 background.ts            # Main background service worker
├── 📁 popup/                       # Extension popup interface
│   ├── 📄 popup.html               # Popup HTML structure
│   ├── 📄 popup.css                # Popup styling
│   └── 📄 popup.ts                 # Popup logic and interactions
├── 📁 options/                     # Extension options/settings page
│   ├── 📄 options.html             # Options page HTML
│   └── 📄 options.ts               # Options page logic
├── 📁 lib/                         # Core library modules
│   ├── 📄 bookmarks.ts             # Bookmark operations and management
│   ├── 📄 drive.ts                 # Google Drive API integration
│   ├── 📄 storage.ts               # Chrome storage utilities
│   ├── 📄 encryption.ts            # Client-side encryption utilities
│   ├── 📄 conflict-resolver.ts     # Sync conflict resolution
│   ├── 📄 team-manager.ts          # Team collaboration features
│   └── 📄 sync-preview.ts          # Sync preview functionality
├── 📁 types/                       # TypeScript type definitions
│   ├── 📄 bookmarks.ts             # Bookmark-related types
│   ├── 📄 sync.ts                  # Sync-related types
│   └── 📄 mocks.ts                 # Mock data for testing
├── 📁 utils/                       # Utility functions
│   ├── 📄 perf.ts                  # Performance tracking
│   └── 📄 error-handler.ts         # Error handling utilities
├── 📁 __tests__/                   # Unit tests
│   ├── 📄 bookmarks.test.ts        # Bookmark functionality tests
│   └── 📄 drive.test.ts            # Drive API tests
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
├── 📄 setup_oauth2.sh              # OAuth2 setup script (Bash)
└── 📄 setup_oauth2.js              # OAuth2 setup script (Node.js)
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
- `background/background.ts` - Service worker for background operations
- `popup/popup.ts` - Main user interface logic
- `options/options.ts` - Settings page functionality

### **Library Modules**
- `lib/drive.ts` - Google Drive API integration and file operations
- `lib/bookmarks.ts` - Chrome bookmarks API wrapper and utilities
- `lib/storage.ts` - Chrome storage API helpers and settings management
- `lib/encryption.ts` - Client-side encryption using Web Crypto API

### **Advanced Features**
- `lib/conflict-resolver.ts` - Handles bookmark sync conflicts
- `lib/team-manager.ts` - Multi-user collaboration features
- `lib/sync-preview.ts` - Preview sync changes before applying

### **Build and Development**
- `esbuild.config.js` - Modern build system configuration
- `package.json` - Dependencies, scripts, and project metadata
- `tsconfig.json` - TypeScript compiler configuration
- `jest.config.js` - Testing framework setup

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