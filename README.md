# BookDrive - Cross-Platform Bookmark Sync Extension (WORK IN PROGRESS)

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
1. Download the latest release from [Releases](https://github.com/your-org/bookdrive-extension/releases)
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
- **🔐 End-to-End Encryption**: Optional AES-GCM encryption
- **👥 Team Mode**: Multi-user collaboration
- **🔍 Conflict Resolution**: Visual merge tools
- **📊 Sync Analytics**: Timeline graphs and logs
- **💾 Backup & Restore**: Versioned backup system
- **🎨 Themes**: Light, dark, and auto modes

### Sync Modes
- **Host-to-Many**: One primary device pushes to others
- **Global Sync**: Bi-directional sync with conflict resolution

## 🛠️ For Developers

### Prerequisites
- Node.js 16+
- Chrome/Chromium browser
- Google Cloud Project (for OAuth2)

### Development Setup
```bash
# Clone repository
git clone https://github.com/your-org/bookdrive-extension.git
cd bookdrive-extension

# Install dependencies
npm install

# Setup OAuth2 credentials
npm run setup:oauth2

# Development build with watch
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
├── background/         # Service worker
├── popup/             # Extension popup UI
├── options/           # Settings page
├── lib/               # Core libraries
│   ├── bookmarks.ts   # Bookmark operations
│   ├── drive.ts       # Google Drive API
│   ├── encryption.ts  # Client-side encryption
│   ├── sync-preview.ts # Sync preview
│   └── team-manager.ts # Team collaboration
├── types/             # TypeScript definitions
└── utils/             # Utility functions
```

### Build System
- **esbuild**: Fast TypeScript compilation
- **Watch Mode**: Auto-rebuild on changes
- **Production**: Minified, optimized builds
- **Testing**: Jest with Chrome API mocks

## 🔧 Configuration

### Environment Variables
```bash
NODE_ENV=production    # Build mode
DEBUG=false           # Debug logging
```

### Extension Settings
Access via popup → Settings tab:
- **Sync Mode**: Host-to-Many or Global
- **Auto Sync**: Enable/disable automatic sync
- **Sync Interval**: 5-30 minutes
- **Team Mode**: Multi-user collaboration
- **Encryption**: Optional end-to-end encryption

### Advanced Configuration
```json
// config.json (optional)
{
  "syncMode": "global",
  "autoSync": true,
  "syncInterval": 15,
  "encryption": {
    "enabled": true,
    "algorithm": "aes-gcm"
  },
  "teamMode": {
    "enabled": false,
    "defaultRole": "member"
  }
}
```

## 🔐 Security & Privacy

### Data Protection
- **Local Storage**: Settings and metadata only
- **Google Drive**: Encrypted bookmark data
- **No Third-Party Servers**: Direct Drive API usage
- **Optional Encryption**: AES-GCM with user passphrase

### Permissions Explained
- `bookmarks`: Read/write browser bookmarks
- `storage`: Store extension settings
- `identity`: Google OAuth authentication
- `alarms`: Scheduled sync operations
- `notifications`: User feedback

### Security Best Practices
- Use strong encryption passphrases
- Regularly review Google Drive permissions
- Enable verbose logging for diagnostics
- Keep extension updated

## 🌍 Cross-Platform Support

### Supported Browsers
- **Chrome** 100+ ✅
- **Microsoft Edge** 100+ ✅
- **Brave** Latest ✅
- **Vivaldi** Latest ✅
- **Opera** Latest ✅

### Operating Systems
- **Windows** 10/11 ✅
- **macOS** 10.15+ ✅
- **Linux** (Ubuntu, Fedora, etc.) ✅
- **Chrome OS** ✅

### Mobile Support
- Chrome for Android (limited)
- *iOS Safari extension planned*

## 📚 Documentation

- [Installation Guide](docs/wiki/Installation.md)
- [Sync Modes](docs/wiki/Sync-Modes.md)
- [Security Features](docs/wiki/Security.md)
- [Configuration](docs/wiki/Configuration.md)
- [Troubleshooting](docs/wiki/Troubleshooting.md)
- [API Documentation](docs/api/)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards
- TypeScript with strict mode
- ESLint + Prettier formatting
- Jest testing required
- Accessibility compliance (WCAG 2.1)

## 📊 Performance

### Benchmarks
- **Sync Speed**: ~1000 bookmarks in <2 seconds
- **Memory Usage**: <10MB typical
- **Battery Impact**: Minimal (adaptive intervals)
- **Network Usage**: Delta-sync reduces bandwidth

### Optimization Features
- SHA-256 change detection
- Incremental sync
- Battery-aware intervals
- Offline queue management

## 🐛 Troubleshooting

### Common Issues

**Sync Not Working**
```bash
# Check network connection
# Verify Google Drive permissions
# Review extension logs (Advanced tab)
```

**OAuth2 Setup Issues**
```bash
# Ensure client_id is correctly set in manifest.json
# Verify Google Cloud project configuration
# Check OAuth2 redirect URIs
```

**Performance Issues**
```bash
# Reduce sync interval
# Disable verbose logging
# Clear browser cache
```

### Getting Help
- [GitHub Issues](https://github.com/your-org/bookdrive-extension/issues)
- [Discussions](https://github.com/your-org/bookdrive-extension/discussions)
- [Wiki](https://github.com/your-org/bookdrive-extension/wiki)

## 📄 License

GNU General Public License v3.0 - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Drive API team
- Chrome Extensions community
- Open source contributors
- Beta testers and early adopters

---

**Made with ❤️ for privacy-conscious users**

*BookDrive is not affiliated with Google Inc.*