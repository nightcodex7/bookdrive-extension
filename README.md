# BookDrive - Cross-Platform Bookmark Sync Extension

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-blue)](https://chrome.google.com/webstore)
[![Build Status](https://img.shields.io/badge/Build-Passing-green)](#)

> **Privacy-first bookmark synchronization using your own Google Drive**

BookDrive is a cross-platform browser extension that synchronizes bookmarks across devices using Google Drive as the backend. No third-party servers, complete privacy control, and optional end-to-end encryption.

## 🚀 Quick Start

### Installation

#### Option 1: Chrome Web Store (Recommended)
*Coming Soon - Currently in review*

#### Option 2: Manual Installation
1. Download the latest release from [Releases](https://github.com/nightcodex7/bookdrive-extension/releases)
2. Extract the ZIP file
3. Open Chrome → Extensions → Enable Developer Mode
4. Click "Load Unpacked" → Select the extracted folder

### Setup (2 minutes)
1. **Get OAuth2 Credentials**:
   ```bash
   # Run the setup script
   npm run setup:oauth2
   # Follow the interactive prompts
   ```

2. **Configure Extension**:
   - Open BookDrive popup
   - Sign in with Google
   - Choose sync mode (Host-to-Many or Global Sync)
   - Done! 🎉

## ✨ Features

### Core Functionality
- **🔄 Two-Way Sync**: Real-time bookmark synchronization
- **🔒 Privacy-First**: Your data stays in your Google Drive
- **🌐 Cross-Platform**: Works on Chrome, Edge, Brave, Vivaldi
- **⚡ Offline Support**: Queued sync when connection returns

### Advanced Features
- **🔐 End-to-End Encryption**: Optional AES-GCM encryption with passphrase
- **👥 Team Mode**: Multi-user collaboration with role-based access
- **🔍 Advanced Conflict Resolution**: 5 resolution strategies with intelligent analysis
- **📊 Sync Analytics**: Timeline graphs, performance metrics, and detailed logs
- **💾 Backup & Restore**: Versioned backup system with scheduled backups and compression
- **🎨 Themes**: Light, dark, and auto modes with persistent preferences
- **📁 Shared Folders**: Team collaboration with permission enforcement
- **🔄 Sync Preview**: Preview changes before committing to sync
- **📈 Performance Optimization**: Delta compression, smart retry mechanisms, and caching

### 🆕 **NEW: Advanced Conflict Resolution Strategies**
- **Intelligent Merge**: Automatically combines local and remote versions intelligently
- **Timestamp-Based Resolution**: Uses timestamps and user activity patterns
- **Content-Aware Resolution**: Analyzes content similarity and completeness
- **User Preference Resolution**: Respects user-defined conflict preferences
- **Auto-Resolve Strategy**: Automatically resolves low-severity conflicts
- **Conflict Categorization**: Categorizes conflicts by type and severity
- **Resolution History**: Tracks all conflict resolutions for audit purposes

### 🆕 **NEW: Enhanced Bookmark Organization**
- **Advanced Smart Folders**: 15+ rule types with complex operators
- **Bulk Operations**: Bulk add/remove tags, move bookmarks, delete bookmarks
- **Advanced Search**: Multi-criteria search with logical operators
- **Smart Folder Auto-updates**: Automatic updates with configurable intervals
- **Advanced Rule Types**: Regex matching, domain matching, date ranges
- **Sorting and Pagination**: Advanced sorting and result limiting

### 🆕 **NEW: Public Collections Infrastructure**
- **Collection Management**: Create, update, delete public collections
- **Visibility Levels**: Private, unlisted, public, team collections
- **Permission System**: Granular permissions for collections
- **Sharing Functionality**: Share links and access control
- **Collection Forking**: Fork existing collections
- **Search and Discovery**: Search public collections
- **Statistics and Analytics**: Collection usage statistics

### 🆕 **NEW: Team Dashboards and Analytics**
- **Team Dashboard**: Comprehensive team activity overview
- **Performance Metrics**: Sync success rates, conflict resolution times
- **Collaboration Insights**: Top contributors, popular folders
- **Activity Logging**: Detailed activity tracking
- **Member Statistics**: Individual and team-wide statistics
- **Report Generation**: Automated analytics reports
- **Data Export**: Export analytics in multiple formats

### 🆕 **NEW: Enhanced Team Management**
- **Granular Permissions**: 6 permission levels with resource-level control
- **Permission Inheritance**: Hierarchical permission inheritance
- **Detailed Activity Logs**: Comprehensive activity logging
- **Permission Management**: Grant, revoke, and manage permissions
- **Activity Analytics**: Team-wide activity analysis
- **Security Events**: Security and audit event tracking
- **Member Activity Summary**: Individual member activity reports

### 🆕 **NEW: Additional Encryption Options**
- **Multiple Algorithms**: AES-GCM, AES-CBC, AES-CTR, RSA-OAEP, ECDH
- **Key Derivation Functions**: PBKDF2, HKDF, Argon2, Scrypt
- **Hash Algorithms**: SHA-256, SHA-384, SHA-512
- **Advanced Configuration**: Configurable iterations, salt lengths
- **Key Management**: Key generation, export, import
- **Security Validation**: Configuration validation and recommendations
- **Hybrid Encryption**: Support for asymmetric encryption

### Sync Modes
- **Host-to-Many**: One primary device pushes to others
- **Global Sync**: Bi-directional sync with conflict resolution

### Team Collaboration Features
- **Role-Based Access**: Admin, Editor, and Viewer roles
- **Shared Bookmark Folders**: Create and manage shared folders
- **Real-Time Notifications**: Team activity notifications
- **Permission Enforcement**: Granular control over folder access
- **Member Management**: Add, remove, and update team members

### Analytics & Monitoring
- **Sync Timeline**: Visual timeline of sync activities
- **Performance Metrics**: Sync speed, success rates, and error tracking
- **Error Analysis**: Detailed error reporting and recommendations
- **Export Capabilities**: Export analytics data for external analysis
- **Log Management**: Verbose logging with export and clear options

### Backup & Recovery
- **Scheduled Backups**: Automated backup scheduling
- **Incremental Backups**: Store only changes between backups
- **Compression**: Gzip compression for storage optimization
- **Retention Policies**: Configurable backup retention rules
- **Backup History**: Visual backup timeline and management

## 🛠️ For Developers

### Prerequisites
- Node.js 18+
- Chrome/Chromium browser
- Google Cloud Project (for OAuth2)

### Development Setup
```bash
# Clone repository
git clone https://github.com/nightcodex7/bookdrive-extension.git
cd bookdrive-extension

# Install dependencies
npm install

# Setup OAuth2 credentials
npm run setup:oauth2

# Development build with watch (includes automatic OAuth2 injection)
npm run watch

# Production build
npm run build:prod

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Project Structure
```
src/
├── background/           # Service worker
├── popup/               # Extension popup UI
├── options/             # Settings page
├── analytics/           # Sync analytics dashboard
├── conflict-resolution/ # Conflict resolution interface
├── shared-folders/      # Team collaboration interface
├── backup-history/      # Backup management interface
├── lib/                 # Core libraries
│   ├── auth/           # Authentication and OAuth2
│   ├── backup/         # Backup and compression
│   ├── encryption/     # Client-side encryption
│   │   └── advanced-encryption.js # Advanced encryption options
│   ├── sync/           # Sync operations and optimization
│   │   └── conflict-resolver.js # Advanced conflict resolution
│   ├── team/           # Team collaboration
│   │   ├── enhanced-team-manager.js # Enhanced team management
│   │   └── team-analytics.js # Team dashboards and analytics
│   ├── analytics/      # Analytics and monitoring
│   ├── scheduling/     # Adaptive scheduling
│   └── storage/        # Storage management
├── public-collections.js # Public collections infrastructure
├── bookmarks.js        # Enhanced bookmark organization
├── types/              # TypeScript definitions
└── utils/              # Utility functions
```

### Build System
- **esbuild**: Fast TypeScript compilation
- **Watch Mode**: Auto-rebuild on changes
- **Production**: Minified, optimized builds
- **Testing**: Jest with Chrome API mocks

## 🔐 Authentication & Security

### Cross-Browser Compatibility
BookDrive provides seamless Google Sign-In across all major browsers:

- **Chrome**: Uses native `chrome.identity` API for trusted Google account picker
- **Edge/Firefox/Safari**: Uses secure OAuth2 fallback with popup authentication
- **No Manual Setup**: Works out-of-the-box with browser session accounts

### Production Deployment
For production deployment to eliminate the "unverified app" warning:

1. **Complete Google OAuth API Verification**:
   - Submit your extension for Google's OAuth API verification process
   - This is required for Chrome Web Store deployment
   - See [Google's OAuth API verification guide](https://developers.google.com/identity/protocols/oauth2/web-application#verification)

2. **Update Client ID**:
   - Replace the placeholder client ID in `manifest.json` with your verified OAuth2 credentials
   - Ensure proper redirect URIs are configured

3. **Security Best Practices**:
   - Never store client secrets in extension code
   - Use HTTPS for all API communications
   - Implement proper token refresh and revocation

### Privacy & Data Handling
- **No Server Storage**: All data is stored in your Google Drive
- **Local Processing**: Bookmark operations happen locally
- **Optional Encryption**: End-to-end encryption available
- **Minimal Permissions**: Only requests necessary browser permissions

### OAuth2 Compliance & Verification
BookDrive is designed to comply with Google's OAuth2 verification requirements:

#### ✅ **No Verification Required**
BookDrive uses only **non-sensitive scopes** that do not require Google's OAuth app verification:
- `https://www.googleapis.com/auth/userinfo.email` - Access to user's email address
- `https://www.googleapis.com/auth/drive.appdata` - Access to app-specific data in Google Drive

#### 🔒 **Scope Categories**
- **Non-sensitive**: These scopes are categorized as non-sensitive by Google
- **No verification needed**: Can be published without completing Google's verification process
- **Privacy-respecting**: Minimal access to user data

#### 📋 **Verification Options**
1. **No Verification**: Extension works immediately with non-sensitive scopes
2. **Brand Verification**: Optional lightweight verification for app name and logo display
3. **Full Verification**: Required only if adding sensitive or restricted scopes later

#### 🚀 **Production Ready**
- **Immediate Deployment**: No verification delays
- **Chrome Web Store**: Ready for submission
- **User Trust**: Transparent about data access and usage

### 🔄 Automatic OAuth2 Credential Injection

BookDrive includes an automatic OAuth2 credential injection system that ensures credentials are always up-to-date during builds:

#### **How It Works**
- **Automatic Injection**: Credentials from `oauth2_config.json` are automatically injected during build
- **Safe Process**: Original files are backed up and restored after build
- **No Manual Management**: No need to manually update credential files

#### **Available Commands**
```bash
# Automatic injection during build (recommended)
npm run build        # Development build with injection
npm run build:prod   # Production build with injection
npm run dev          # Watch mode with injection

# Manual credential management
npm run oauth2:inject    # Manually inject credentials
npm run oauth2:cleanup   # Restore original files
```

#### **Security Features**
- ✅ **No Credentials in Git**: Actual credentials never reach version control
- ✅ **Automatic Cleanup**: Original files always restored after build
- ✅ **Backup Protection**: Files backed up before modification
- ✅ **Error Handling**: Build fails if credentials cannot be injected

For detailed information, see [OAUTH2_AUTOMATIC_INJECTION.md](OAUTH2_AUTOMATIC_INJECTION.md).

## 📋 Configuration

### Environment Variables
- `NODE_ENV`: Development or Production
- `GOOGLE_CLIENT_ID`: Your OAuth2 client ID (for production)

### Build Modes
- **Development**: `npm run watch` - Hot reload with source maps
- **Production**: `npm run build:prod` - Optimized production build

## 🔧 Troubleshooting

### Common Issues
1. **"OAuth2 credentials not configured"**: Run `npm run setup:oauth2`
2. **"Sign-in failed"**: Check browser compatibility and network connection
3. **"Authentication timeout"**: Try signing in again or check browser settings

### Browser Support
- **Chrome 100+**: Full native integration
- **Edge 100+**: OAuth2 fallback authentication
- **Firefox 100+**: OAuth2 fallback authentication
- **Safari 15+**: OAuth2 fallback authentication

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📈 Performance

- **Fast Sync**: Optimized algorithms for quick bookmark synchronization
- **Efficient Storage**: Minimal local storage usage
- **Background Processing**: Non-blocking sync operations
- **Smart Caching**: Intelligent caching for better performance
- **Delta Compression**: Only sync changes for faster transfers
- **Adaptive Scheduling**: Smart scheduling based on system resources

## 🚨 Troubleshooting

### Extension Issues
- **Extension not loading**: Check manifest.json and build output
- **Authentication errors**: Verify OAuth2 credentials and browser compatibility
- **Sync failures**: Check network connection and Google Drive permissions

### Development Issues
- **Build errors**: Run `npm install` and check Node.js version
- **Test failures**: Ensure all dependencies are installed
- **Linting errors**: Run `npm run lint` to identify issues

## 📝 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Drive API for secure cloud storage
- Chrome Extensions API for cross-browser compatibility
- Material Design 3 for modern UI components
- Chart.js for analytics visualization
- Open source community for inspiration and support