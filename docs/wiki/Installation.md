# Installation Guide

## Prerequisites
- Google Chrome (Version 100+)
- Google Account
- OAuth2 Client ID

## Method 1: Chrome Web Store (Recommended)
1. Visit the Chrome Web Store
2. Search for "BookDrive"
3. Click "Add to Chrome"

## Method 2: Manual Installation
1. Clone the repository
   ```bash
   git clone https://github.com/your-org/bookdrive-extension.git
   ```

2. Install dependencies
   ```bash
   cd bookdrive-extension
   npm install
   ```

3. Configure OAuth2
   ```bash
   npm run setup:oauth2
   ```

4. Load as Unpacked Extension
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer Mode"
   - Click "Load Unpacked"
   - Select the `src/` directory

## OAuth2 Configuration
1. Create a Google Cloud Project
2. Enable Google Drive API
3. Generate OAuth2 Client ID
4. Add Client ID to `manifest.json`

## Troubleshooting
- Ensure all dependencies are installed
- Check Chrome console for detailed logs
- Verify OAuth2 credentials
