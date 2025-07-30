# Security Guide - BookDrive Extension

## 🔐 OAuth2 Credential Management

### Current Setup
Your OAuth2 client ID has been configured in the extension:
- **Client ID**: `YOUR_OAUTH2_CLIENT_ID.apps.googleusercontent.com`
- **Status**: ✅ Configured and ready for testing

### Security Measures Implemented

#### 1. Git Protection
- **Files excluded from version control**:
  - `src/manifest.json` (contains your actual client ID)
  - `src/lib/auth/drive-auth.js` (contains your actual client ID)
  - `.env.oauth` (environment variables)
  - `oauth2_credentials.json`
  - `secrets.json`

#### 2. Template Files
- **Template files available for development**:
  - `src/manifest.template.json` (safe to commit)
  - `src/lib/auth/drive-auth.template.js` (safe to commit)

#### 3. Setup Script
- **Automated setup**: `npm run setup:oauth2`
- **Validation**: Checks client ID format
- **Security**: Creates `.env.oauth` for additional protection

### 🔒 Security Best Practices

#### For Development
1. **Never commit credentials**: Your actual client ID is in `.gitignore`
2. **Use template files**: For public repositories, use template files
3. **Environment variables**: Store sensitive data in `.env.oauth`
4. **Regular rotation**: Consider rotating client IDs periodically

#### For Production
1. **Google OAuth API verification**: Complete verification process to eliminate "unverified app" warnings
2. **Restricted scopes**: Only request necessary permissions
3. **HTTPS only**: All API communications use HTTPS
4. **Token management**: Proper token refresh and revocation

### 🚨 Important Security Notes

#### What's Protected
- ✅ Your OAuth client ID is not in version control
- ✅ Template files are safe for public repositories
- ✅ Build process excludes sensitive files
- ✅ Environment variables are properly managed

#### What You Should Do
1. **Keep credentials private**: Never share your client ID publicly
2. **Monitor usage**: Check Google Cloud Console for unusual activity
3. **Regular audits**: Review permissions and scopes periodically
4. **Secure storage**: Store credentials securely on your development machine

### 🔧 Development Workflow

#### For New Developers
1. Clone the repository
2. Run `npm run setup:oauth2` to configure your own credentials
3. Follow the interactive prompts
4. Your credentials will be automatically protected

#### For Production Deployment
1. Complete Google OAuth API verification
2. Update client ID with verified credentials
3. Test thoroughly across all browsers
4. Monitor for any security issues

### 📋 OAuth2 Configuration Details

#### Scopes Used
- `https://www.googleapis.com/auth/userinfo.profile` - User profile information
- `https://www.googleapis.com/auth/userinfo.email` - User email address
- `https://www.googleapis.com/auth/drive.file` - Access to files created by the app

#### Redirect URIs
- Chrome/Edge/Firefox: `https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/`

#### JavaScript Origins
- **Chrome Extensions**: Do NOT configure JavaScript origins in Google Cloud Console
- **Application Type**: Must be "Chrome App" (not "Web Application")

### 🛡️ Additional Security Features

#### Cross-Browser Security
- **Chrome**: Uses native `chrome.identity` API for secure authentication
- **Edge/Firefox**: Uses secure OAuth2 popup with state verification
- **Token validation**: Proper JWT token validation and refresh

#### Data Protection
- **Local storage**: Only stores necessary authentication tokens
- **No server storage**: All data stays in your Google Drive
- **Optional encryption**: End-to-end encryption available
- **Minimal permissions**: Only requests necessary browser permissions

### 🔍 Monitoring and Auditing

#### Google Cloud Console
- Monitor API usage and quotas
- Review OAuth consent screen settings
- Check for unusual authentication patterns
- Manage API keys and credentials

#### Extension Security
- Regular security updates
- Dependency vulnerability scanning
- Code review for security issues
- User permission audits

### 📞 Security Support

If you encounter any security issues:
1. Check the [Troubleshooting Guide](docs/wiki/Troubleshooting.md)
2. Review [Google OAuth Security Best Practices](https://developers.google.com/identity/protocols/oauth2/web-application#security)
3. Contact the development team for assistance

---

**Remember**: Security is everyone's responsibility. Keep your credentials safe and report any security concerns immediately. 