# OAuth2 Automatic Credential Injection

## Overview

The BookDrive extension now includes an automatic OAuth2 credential injection system that ensures credentials are always up-to-date during the build process. This system automatically fetches credentials from `oauth2_config.json` and injects them into the source files before building, then restores the original files afterward.

## How It Works

### 1. Automatic Injection During Build

When you run any build command (`npm run build`, `npm run dev`, `npm run watch`), the system:

1. **Loads OAuth2 Configuration**: Reads `oauth2_config.json` from the root directory
2. **Creates Backups**: Backs up original source files to `.oauth2-backup/`
3. **Injects Credentials**: Updates `src/manifest.json` and `src/lib/auth/drive-auth.js` with actual credentials
4. **Builds Extension**: Runs the normal build process with injected credentials
5. **Restores Files**: Automatically restores original files from backup after build

### 2. File Structure

```
bookdrive-extension/
├── oauth2_config.json          # Local OAuth2 credentials (not in Git)
├── .oauth2-backup/             # Backup directory (not in Git)
│   ├── manifest.json.backup
│   └── drive-auth.js.backup
├── src/
│   ├── manifest.json           # Gets injected with credentials during build
│   └── lib/auth/drive-auth.js  # Gets injected with credentials during build
└── scripts/
    └── inject-oauth2.js        # Injection script
```

### 3. Security Features

- **No Credentials in Git**: Actual credentials are never committed to version control
- **Automatic Cleanup**: Original files are always restored after build
- **Backup System**: Original files are backed up before modification
- **Error Handling**: Build fails if credentials cannot be injected
- **Graceful Shutdown**: Credentials are cleaned up even if build is interrupted

## Usage

### Initial Setup

1. **Configure OAuth2 Credentials**:
   ```bash
   npm run setup:oauth2
   ```

2. **Build with Automatic Injection**:
   ```bash
   npm run build        # Development build
   npm run build:prod   # Production build
   npm run dev          # Watch mode
   ```

### Manual Commands

- **Inject Credentials Manually**:
  ```bash
  npm run oauth2:inject
  ```

- **Cleanup/Restore Original Files**:
  ```bash
  npm run oauth2:cleanup
  ```

### Build Process Flow

```
npm run build
    ↓
🔐 Inject OAuth2 credentials from oauth2_config.json
    ↓
📦 Create backups of original files
    ↓
📝 Update src/manifest.json with client_id and scopes
    ↓
📝 Update src/lib/auth/drive-auth.js with client_id, client_secret, redirect_uri, scope
    ↓
🔨 Run esbuild build process
    ↓
🧹 Restore original files from backup
    ↓
✅ Build complete
```

## Configuration

### oauth2_config.json Structure

```json
{
  "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
  "client_secret": "YOUR_CLIENT_SECRET",
  "extension_id": "YOUR_EXTENSION_ID",
  "redirect_uri": "https://YOUR_EXTENSION_ID.chromiumapp.org/",
  "scopes": [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/drive.file"
  ]
}
```

### Files Modified During Injection

#### src/manifest.json
```json
{
  "oauth2": {
    "client_id": "ACTUAL_CLIENT_ID",  // ← Injected
    "scopes": [                       // ← Injected
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/drive.appdata",
      "https://www.googleapis.com/auth/drive.file"
    ]
  }
}
```

#### src/lib/auth/drive-auth.js
```javascript
const OAUTH2_CONFIG = {
  client_id: 'ACTUAL_CLIENT_ID',           // ← Injected
  client_secret: 'ACTUAL_CLIENT_SECRET',   // ← Injected
  redirect_uri: 'ACTUAL_REDIRECT_URI',     // ← Injected
  scope: 'ACTUAL_SCOPES_STRING',           // ← Injected
  // ... other config
};
```

## Error Handling

### Common Issues

1. **Missing oauth2_config.json**:
   ```
   ❌ OAuth2 configuration file not found
   💡 Please run: npm run setup:oauth2
   ```

2. **Invalid Configuration**:
   ```
   ❌ Invalid OAuth2 configuration
   Missing fields: client_id, client_secret
   ```

3. **Build Failure**:
   ```
   ❌ Failed to inject OAuth2 credentials. Build aborted.
   ```

### Recovery

If the build process is interrupted:

1. **Manual Cleanup**:
   ```bash
   npm run oauth2:cleanup
   ```

2. **Re-run Setup**:
   ```bash
   npm run setup:oauth2
   npm run build
   ```

## Benefits

### For Developers

- **No Manual Credential Management**: Credentials are automatically handled during build
- **Consistent Environment**: All builds use the same credential injection process
- **Safe Development**: Original files are always preserved
- **Easy Setup**: New developers just need to run `npm run setup:oauth2`

### For Security

- **No Credentials in Repository**: Sensitive data never reaches Git
- **Automatic Cleanup**: Credentials are removed after build
- **Backup Protection**: Original files are always recoverable
- **Error Prevention**: Build fails if credentials are missing

### For CI/CD

- **Reproducible Builds**: Same injection process in all environments
- **Secure Deployment**: Credentials can be injected from environment variables
- **Clean Artifacts**: Built extension contains actual credentials, source remains clean

## Integration with Existing Workflow

The automatic injection system integrates seamlessly with existing development workflows:

- **Development**: `npm run dev` automatically handles credentials
- **Testing**: `npm run test` works with injected credentials
- **Building**: `npm run build` and `npm run build:prod` include injection
- **Packaging**: `npm run package` includes credential injection
- **Release**: `npm run release` includes full credential injection and cleanup

## Troubleshooting

### Build Still Fails with "OAuth2 credentials not configured"

1. **Check oauth2_config.json exists**:
   ```bash
   ls -la oauth2_config.json
   ```

2. **Verify configuration is valid**:
   ```bash
   node -e "console.log(JSON.stringify(require('./oauth2_config.json'), null, 2))"
   ```

3. **Re-run setup**:
   ```bash
   npm run setup:oauth2
   ```

4. **Manual injection test**:
   ```bash
   npm run oauth2:inject
   ```

### Files Not Restored After Build

1. **Check backup directory**:
   ```bash
   ls -la .oauth2-backup/
   ```

2. **Manual restore**:
   ```bash
   npm run oauth2:cleanup
   ```

3. **Check file permissions**:
   ```bash
   ls -la src/manifest.json src/lib/auth/drive-auth.js
   ```

## Future Enhancements

- **Environment Variable Support**: Inject credentials from environment variables
- **Multiple Environment Support**: Different credentials for dev/staging/prod
- **Credential Validation**: Validate credentials before injection
- **Build Optimization**: Cache injected credentials for faster builds 