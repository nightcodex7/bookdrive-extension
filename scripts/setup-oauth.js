#!/usr/bin/env node

/**
 * OAuth2 Setup Script for BookDrive Extension
 * This script helps configure OAuth2 credentials safely
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupOAuth() {
  console.log('🔐 BookDrive OAuth2 Setup\n');
  console.log('This script will help you configure OAuth2 credentials for the BookDrive extension.');
  console.log('⚠️  IMPORTANT: Never commit your actual OAuth credentials to version control!\n');

  try {
    // Check if credentials already exist
    const manifestPath = path.join(__dirname, '../src/manifest.json');
    const authPath = path.join(__dirname, '../src/lib/auth/drive-auth.js');
    
    if (fs.existsSync(manifestPath)) {
      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      if (manifestContent.includes('YOUR_OAUTH2_CLIENT_ID')) {
        console.log('📝 OAuth2 credentials not configured. Let\'s set them up!\n');
      } else {
        console.log('✅ OAuth2 credentials are already configured.\n');
        const overwrite = await question('Do you want to update them? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
          console.log('Setup cancelled.');
          rl.close();
          return;
        }
      }
    }

    // Get OAuth2 Client ID
    console.log('🔑 Step 1: OAuth2 Client ID');
    console.log('1. Go to https://console.cloud.google.com/');
    console.log('2. Create a new project or select existing one');
    console.log('3. Enable Google Drive API');
    console.log('4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"');
    console.log('5. Choose "Chrome Extension" as application type');
    console.log('6. Enter your extension ID: ajkofadmedmmckhnjeelnjlmcpmfmohp');
    console.log('7. Copy the generated Client ID\n');

    const clientId = await question('Enter your OAuth2 Client ID: ');
    
    if (!clientId || clientId.includes('YOUR_OAUTH2_CLIENT_ID')) {
      console.log('❌ Invalid Client ID provided.');
      rl.close();
      return;
    }

    // Validate client ID format
    if (!clientId.match(/^\d+-\w+\.apps\.googleusercontent\.com$/)) {
      console.log('❌ Invalid Client ID format. Should be: [PROJECT_ID]-[RANDOM_STRING].apps.googleusercontent.com');
      rl.close();
      return;
    }

    console.log('\n✅ Valid Client ID format detected!\n');

    // Update manifest.json
    console.log('📝 Updating manifest.json...');
    if (fs.existsSync(manifestPath)) {
      let manifestContent = fs.readFileSync(manifestPath, 'utf8');
      manifestContent = manifestContent.replace(
        /"client_id":\s*"[^"]*"/,
        `"client_id": "${clientId}"`
      );
      fs.writeFileSync(manifestPath, manifestContent);
      console.log('✅ manifest.json updated successfully!');
    }

    // Update drive-auth.js
    console.log('📝 Updating drive-auth.js...');
    if (fs.existsSync(authPath)) {
      let authContent = fs.readFileSync(authPath, 'utf8');
      authContent = authContent.replace(
        /client_id:\s*'[^']*'/,
        `client_id: '${clientId}'`
      );
      fs.writeFileSync(authPath, authContent);
      console.log('✅ drive-auth.js updated successfully!');
    }

    // Create .env.oauth file for additional security
    const envPath = path.join(__dirname, '../.env.oauth');
    const envContent = `# OAuth2 Configuration
# This file contains sensitive OAuth2 credentials
# DO NOT commit this file to version control

OAUTH2_CLIENT_ID=${clientId}
OAUTH2_EXTENSION_ID=ajkofadmedmmckhnjeelnjlmcpmfmohp
OAUTH2_REDIRECT_URI_CHROME=https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/
OAUTH2_REDIRECT_URI_FALLBACK=https://ajkofadmedmmckhnjeelnjlmcpmfmohp.chromiumapp.org/

# Scopes (Non-sensitive, no verification required)
OAUTH2_SCOPE_EMAIL=https://www.googleapis.com/auth/userinfo.email
OAUTH2_SCOPE_DRIVE_APPDATA=https://www.googleapis.com/auth/drive.appdata
`;

    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env.oauth file created for additional security!');

    console.log('\n🎉 OAuth2 setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Build the extension: npm run build');
    console.log('2. Load the extension in Chrome/Edge');
    console.log('3. Test the Google Sign-In functionality');
    console.log('4. For production, complete Google OAuth API verification');
    
    console.log('\n🔒 Security notes:');
    console.log('- Your credentials are now in .gitignore');
    console.log('- Template files are available for development');
    console.log('- Never share your Client ID publicly');
    console.log('- Consider using environment variables for production');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run setup
setupOAuth().catch(console.error); 