# OAuth2 Redirect URI Configuration

## 🔧 Extension ID
**Extension ID**: `ajkofadmedmmckhnjeelnjlmcpmfmohp`

## 🔗 Redirect URIs Used

### 1. Chrome Browser (Primary)
- **Redirect URI**: `https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/`
- **Method**: Uses `chrome.identity.getRedirectURL()` for seamless authentication
- **Flow**: Native Google account picker integration

### 2. Edge/Firefox/Other Browsers (Fallback)
- **Redirect URI**: `https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/`
- **Method**: OAuth2 popup window with manual redirect handling
- **Flow**: Secure OAuth2 authentication with popup window

## 🛠️ Google Cloud Console Configuration

### Required Redirect URIs
In your Google Cloud Console OAuth2 client configuration, add these redirect URIs:

1. **Primary**: `https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/`
2. **Fallback**: `https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/`

### Setup Steps
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Find your OAuth 2.0 Client ID: `YOUR_OAUTH2_CLIENT_ID.apps.googleusercontent.com`
4. Click "Edit" (pencil icon)
5. In "Authorized redirect URIs", add:
   ```
   https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/
   ```
6. Click "Save"

## 🔍 Error Resolution

### "Error 400: redirect_uri_mismatch"
This error occurs when the redirect URI in the OAuth request doesn't match any of the authorized redirect URIs in your Google Cloud Console.

**Solution**: Ensure both redirect URIs are added to your OAuth2 client configuration as shown above.

### Testing the Fix
1. Update your Google Cloud Console with the correct redirect URIs
2. Build the extension: `npm run build`
3. Load the extension in Chrome/Edge
4. Test the Google Sign-In functionality

## 📋 Current Configuration

### OAuth2 Client ID
- **Client ID**: `YOUR_OAUTH2_CLIENT_ID.apps.googleusercontent.com`
- **Application Type**: Chrome Extension
- **Extension ID**: `ajkofadmedmmckhnjeelnjlmcpmfmohp`

### Scopes (Non-sensitive, no verification required)
- `https://www.googleapis.com/auth/userinfo.email` - Access to user's email address
- `https://www.googleapis.com/auth/drive.appdata` - Access to app-specific data in Google Drive

### Verification Status
✅ **No verification required** - These scopes are categorized as non-sensitive by Google and do not require OAuth app verification before publishing.

## 🔒 Security Notes

- The extension ID is hardcoded in the authentication flow
- Redirect URIs are validated on both client and server side
- OAuth2 state parameter is used for security
- Tokens are stored securely in `chrome.storage.local`

## 🚀 Next Steps

1. **Test Authentication**: Verify Google Sign-In works in both Chrome and Edge
2. **Production Verification**: Complete Google OAuth API verification process
3. **Monitor Usage**: Check Google Cloud Console for authentication logs
4. **Security Review**: Regularly audit OAuth2 configuration and permissions 