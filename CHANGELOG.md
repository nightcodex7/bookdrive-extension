# Changelog

All notable changes to BookDrive will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-07-17

### Beta Release
This is the first beta release of BookDrive with core functionality for testing.

## [Unreleased] - Future 1.0.0 Release

### Added
- Initial release of BookDrive extension
- Two-way bookmark synchronization using Google Drive
- Host-to-Many and Global Sync modes
- End-to-end encryption with AES-GCM
- Team collaboration features
- Conflict resolution system with visual interface
- Sync preview functionality
- Cross-platform support (Chrome, Edge, Brave, Vivaldi)
- Offline sync queue with automatic retry
- Performance monitoring and analytics
- Dark/light theme support with auto-detection
- Comprehensive backup and restore system
- OAuth2 authentication with Google Drive
- Real-time sync with debounced bookmark changes
- Battery-aware sync intervals
- Verbose logging and diagnostics
- Settings export/import functionality
- Manual backup creation and restoration
- Drive cleanup tools
- Responsive popup UI with accessibility support

### Security
- Manifest V3 compliance
- Content Security Policy implementation
- Minimal permissions model
- Client-side encryption with user-controlled passphrases
- No third-party server dependencies
- Secure token handling

### Performance
- Delta-based synchronization with SHA-256 hashing
- Efficient memory usage with cleanup routines
- Optimized network requests with retry logic
- Background processing with service worker
- Lazy loading of UI components

### Documentation
- Comprehensive README with quick start guide
- Wiki documentation for all features
- Cross-platform compatibility guide
- Security and privacy documentation
- Developer contribution guidelines
- Production deployment checklist

### Developer Experience
- TypeScript codebase with strict typing
- Modern build system with esbuild
- Comprehensive test suite with Jest
- ESLint and Prettier configuration
- GitHub Actions CI/CD pipeline
- Automated packaging for Chrome Web Store

## [Unreleased]

### Planned
- iOS Safari extension support
- Enhanced mobile compatibility
- Advanced conflict resolution strategies
- Bookmark organization tools
- Import/export from other bookmark managers
- Enhanced team management features
- Performance optimizations
- Additional encryption algorithms

---

For more details about each release, see the [GitHub Releases](https://github.com/your-org/bookdrive-extension/releases) page.