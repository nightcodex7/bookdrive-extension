# OAuth2 Local Setup Guide

## 🔐 **Setting Up OAuth2 Credentials Locally**

This guide explains how to configure your OAuth2 credentials locally without exposing them to the GitHub repository.

## 🚨 **Important Security Note**

**Never commit your actual OAuth2 credentials to Git!** The repository uses placeholders to keep credentials secure.

## 📋 **Prerequisites**

1. **Google Cloud Project**: You need a Google Cloud Project with OAuth2 API enabled
2. **OAuth2 Client ID**: Create an OAuth2 client ID for Chrome Extension
3. **OAuth2 Client Secret**: Get the client secret for your OAuth2 client

## 🔧 **Step-by-Step Setup**

### **Step 1: Create OAuth2 Credentials in Google Cloud Console**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Click "Create Credentials" → "OAuth client ID"
4. Configure the OAuth consent screen if prompted
5. Set up OAuth2 client:
   - **Application Type**: Chrome App
   - **Name**: BookDrive Extension
   - **Extension ID**: `ajkofadmedmmckhnjeelnjlmcpmfmohp`

### **Step 2: Configure OAuth2 Client Settings**

#### **Authorized Redirect URIs**
```
https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/
```

#### **Authorized JavaScript Origins**
**Leave this field EMPTY** - Chrome extensions don't need JavaScript origins

#### **Scopes**
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/drive.appdata`

### **Step 3: Run the Setup Script**

```bash
npm run setup:oauth2
```

The script will prompt you for:
- **OAuth2 Client ID**: Your client ID from Google Cloud Console
- **OAuth2 Client Secret**: Your client secret from Google Cloud Console

### **Step 4: Verify Configuration**

After running the setup script, verify that:

1. **`oauth2_config.json`** is created with your credentials
2. **`src/manifest.json`** has your actual client ID
3. **`src/lib/auth/drive-auth.js`** has your actual credentials

## 📁 **Files Created/Modified**

### **Local Files (NOT committed to Git)**
- ✅ `oauth2_config.json` - Contains your actual credentials
- ✅ `src/manifest.json` - Updated with your client ID
- ✅ `src/lib/auth/drive-auth.js` - Updated with your credentials

### **Template Files (Safe for Git)**
- ✅ `src/manifest.template.json` - Contains placeholders
- ✅ `src/lib/auth/drive-auth.template.js` - Contains placeholders

## 🔒 **Security Measures**

### **Git Protection**
The following files are excluded from Git via `.gitignore`:
```
# OAuth and sensitive credentials
src/manifest.json
src/lib/auth/drive-auth.js
oauth2_config.json
.env.oauth
secrets.json
```

### **Template Files**
Template files with placeholders are safe to commit:
```
!src/manifest.template.json
!src/lib/auth/drive-auth.template.js
```

## 🧪 **Testing the Setup**

### **1. Build the Extension**
```bash
npm run build
```

### **2. Load in Chrome**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### **3. Test Authentication**
1. Click the BookDrive extension icon
2. Click "Sign in with Google"
3. Should open native Google account picker
4. Select your account and authenticate

## 🔄 **For New Developers**

### **Clone and Setup**
```bash
# Clone the repository
git clone https://github.com/nightcodex7/bookdrive-extension.git
cd bookdrive-extension

# Install dependencies
npm install

# Set up OAuth2 credentials
npm run setup:oauth2

# Build the extension
npm run build
```

### **What the Setup Script Does**
1. Prompts for your OAuth2 credentials
2. Validates the client ID format
3. Creates `oauth2_config.json` with your credentials
4. Updates source files with actual credentials
5. Keeps credentials local and secure

## 🚫 **Common Issues**

### **"Invalid Client ID format"**
- Ensure your client ID ends with `.apps.googleusercontent.com`
- Copy the full client ID from Google Cloud Console

### **"Error 400: redirect_uri_mismatch"**
- Verify the redirect URI in Google Cloud Console matches exactly:
  ```
  https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/
  ```

### **"Error 400: invalid_request"**
- Ensure your OAuth2 client is configured as "Chrome App" type
- Don't add JavaScript origins for Chrome extensions

## 📚 **Related Documentation**

- [OAUTH2_JAVASCRIPT_ORIGINS_FIX.md](OAUTH2_JAVASCRIPT_ORIGINS_FIX.md) - JavaScript origins configuration
- [OAUTH2_REDIRECT_URI_SETUP.md](OAUTH2_REDIRECT_URI_SETUP.md) - Redirect URI setup
- [OAUTH2_COMPLIANCE.md](OAUTH2_COMPLIANCE.md) - OAuth2 compliance and verification
- [SECURITY.md](SECURITY.md) - Security best practices

---

**Status**: ✅ **Secure Local Setup**  
**Git Safety**: ✅ **Credentials Protected**  
**Developer Friendly**: ✅ **Automated Setup Script** 