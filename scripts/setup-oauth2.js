#!/usr/bin/env node

/**
 * OAuth2 Setup Script for BookDrive Extension
 * This script helps users configure their OAuth2 credentials locally
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupOAuth2() {
  console.log('🔐 BookDrive OAuth2 Setup\n');
  console.log('This script will help you configure your OAuth2 credentials locally.');
  console.log('Your credentials will be stored in local files that are NOT committed to Git.\n');

  try {
    // Get OAuth2 credentials from user
    const clientId = await question('Enter your OAuth2 Client ID: ');
    const clientSecret = await question('Enter your OAuth2 Client Secret: ');
    
    if (!clientId || !clientSecret) {
      console.error('❌ Client ID and Client Secret are required!');
      process.exit(1);
    }

    // Validate client ID format
    if (!clientId.includes('.apps.googleusercontent.com')) {
      console.error('❌ Invalid Client ID format. Should end with .apps.googleusercontent.com');
      process.exit(1);
    }

    // Create oauth2_config.json
    const oauth2Config = {
      client_id: clientId,
      client_secret: clientSecret,
      extension_id: 'ajkofadmedmmckhnjeelnjlmcpmfmohp',
      redirect_uri: 'https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/',
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/drive.appdata'
      ]
    };

    fs.writeFileSync('oauth2_config.json', JSON.stringify(oauth2Config, null, 2));

    // Update manifest.json with actual client ID
    const manifestPath = path.join('src', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      manifest.oauth2.client_id = clientId;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }

    // Update drive-auth.js with actual credentials
    const authPath = path.join('src', 'lib', 'auth', 'drive-auth.js');
    if (fs.existsSync(authPath)) {
      let authContent = fs.readFileSync(authPath, 'utf8');
      authContent = authContent.replace(
        /client_id: 'YOUR_OAUTH2_CLIENT_ID\.apps\.googleusercontent\.com'/g,
        `client_id: '${clientId}'`
      );
      authContent = authContent.replace(
        /client_secret: 'YOUR_OAUTH2_CLIENT_SECRET'/g,
        `client_secret: '${clientSecret}'`
      );
      fs.writeFileSync(authPath, authContent);
    }

    console.log('\n✅ OAuth2 configuration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure your Google Cloud Console OAuth2 client:');
    console.log('   - Application Type: Chrome App');
    console.log('   - Extension ID: ajkofadmedmmckhnjeelnjlmcpmfmohp');
    console.log('   - Redirect URI: https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/');
    console.log('   - JavaScript Origins: Leave empty');
    console.log('\n2. Build the extension: npm run build');
    console.log('3. Load the extension in Chrome and test authentication');
    console.log('\n🔒 Security: Your credentials are stored locally and will NOT be committed to Git.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the setup
if (require.main === module) {
  setupOAuth2();
}

module.exports = { setupOAuth2 };