#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import colors from 'ansi-colors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * OAuth2 Credential Injection Script
 * 
 * This script automatically injects OAuth2 credentials from oauth2_config.json
 * into the source files before building the extension.
 * 
 * Files modified:
 * - src/manifest.json
 * - src/lib/auth/drive-auth.js
 */

const OAUTH2_CONFIG_PATH = path.join(__dirname, '..', 'oauth2_config.json');
const MANIFEST_PATH = path.join(__dirname, '..', 'src', 'manifest.json');
const DRIVE_AUTH_PATH = path.join(__dirname, '..', 'src', 'lib', 'auth', 'drive-auth.js');

/**
 * Reads and validates OAuth2 configuration
 * @returns {Object} OAuth2 configuration object
 */
function loadOAuth2Config() {
  try {
    if (!fs.existsSync(OAUTH2_CONFIG_PATH)) {
      console.error(colors.red('❌ OAuth2 configuration file not found:'));
      console.error(colors.yellow(`   ${OAUTH2_CONFIG_PATH}`));
      console.error(colors.blue('\n💡 Please run: npm run setup:oauth2'));
      process.exit(1);
    }

    const configContent = fs.readFileSync(OAUTH2_CONFIG_PATH, 'utf8');
    const config = JSON.parse(configContent);

    // Validate required fields
    const requiredFields = ['client_id', 'client_secret', 'extension_id', 'redirect_uri', 'scopes'];
    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
      console.error(colors.red('❌ Invalid OAuth2 configuration:'));
      console.error(colors.yellow(`   Missing fields: ${missingFields.join(', ')}`));
      console.error(colors.blue('\n💡 Please run: npm run setup:oauth2'));
      process.exit(1);
    }

    console.log(colors.green('✅ OAuth2 configuration loaded successfully'));
    return config;
  } catch (error) {
    console.error(colors.red('❌ Failed to load OAuth2 configuration:'));
    console.error(colors.yellow(error.message));
    process.exit(1);
  }
}

/**
 * Injects OAuth2 credentials into manifest.json
 * @param {Object} config - OAuth2 configuration
 */
function injectManifestCredentials(config) {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      console.error(colors.red('❌ Manifest file not found:'));
      console.error(colors.yellow(`   ${MANIFEST_PATH}`));
      process.exit(1);
    }

    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(manifestContent);

    // Update OAuth2 configuration
    if (!manifest.oauth2) {
      manifest.oauth2 = {};
    }

    manifest.oauth2.client_id = config.client_id;
    manifest.oauth2.scopes = config.scopes;

    // Write updated manifest
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(colors.green('✅ Manifest.json updated with OAuth2 credentials'));
  } catch (error) {
    console.error(colors.red('❌ Failed to update manifest.json:'));
    console.error(colors.yellow(error.message));
    process.exit(1);
  }
}

/**
 * Injects OAuth2 credentials into drive-auth.js
 * @param {Object} config - OAuth2 configuration
 */
function injectDriveAuthCredentials(config) {
  try {
    if (!fs.existsSync(DRIVE_AUTH_PATH)) {
      console.error(colors.red('❌ Drive auth file not found:'));
      console.error(colors.yellow(`   ${DRIVE_AUTH_PATH}`));
      process.exit(1);
    }

    let driveAuthContent = fs.readFileSync(DRIVE_AUTH_PATH, 'utf8');

    // Replace client_id placeholder
    driveAuthContent = driveAuthContent.replace(
      /client_id:\s*['"][^'"]*['"]/,
      `client_id: '${config.client_id}'`
    );

    // Replace client_secret placeholder
    driveAuthContent = driveAuthContent.replace(
      /client_secret:\s*['"][^'"]*['"]/,
      `client_secret: '${config.client_secret}'`
    );

    // Replace redirect_uri placeholder
    driveAuthContent = driveAuthContent.replace(
      /redirect_uri:\s*chrome\.identity\s*\?\s*chrome\.identity\.getRedirectURL\(\)\s*:\s*`https:\/\/\$\{chrome\.runtime\.id\}\.chromiumapp\.org\/`/,
      `redirect_uri: chrome.identity
          ? chrome.identity.getRedirectURL()
          : '${config.redirect_uri}'`
    );

    // Replace scope placeholder
    const scopeString = config.scopes.join(' ');
    driveAuthContent = driveAuthContent.replace(
      /scope:\s*['"][^'"]*['"]/,
      `scope: '${scopeString}'`
    );

    // Write updated file
    fs.writeFileSync(DRIVE_AUTH_PATH, driveAuthContent);
    console.log(colors.green('✅ Drive auth file updated with OAuth2 credentials'));
  } catch (error) {
    console.error(colors.red('❌ Failed to update drive-auth.js:'));
    console.error(colors.yellow(error.message));
    process.exit(1);
  }
}

/**
 * Creates backup of original files before modification
 */
function createBackups() {
  const backupDir = path.join(__dirname, '..', '.oauth2-backup');
  
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Backup manifest
    if (fs.existsSync(MANIFEST_PATH)) {
      fs.copyFileSync(MANIFEST_PATH, path.join(backupDir, 'manifest.json.backup'));
    }

    // Backup drive-auth
    if (fs.existsSync(DRIVE_AUTH_PATH)) {
      fs.copyFileSync(DRIVE_AUTH_PATH, path.join(backupDir, 'drive-auth.js.backup'));
    }

    console.log(colors.blue('📦 Backups created in .oauth2-backup/'));
  } catch (error) {
    console.warn(colors.yellow('⚠️ Failed to create backups:'), error.message);
  }
}

/**
 * Restores original files from backup
 */
function restoreBackups() {
  const backupDir = path.join(__dirname, '..', '.oauth2-backup');
  
  try {
    if (!fs.existsSync(backupDir)) {
      return;
    }

    // Restore manifest
    const manifestBackup = path.join(backupDir, 'manifest.json.backup');
    if (fs.existsSync(manifestBackup)) {
      fs.copyFileSync(manifestBackup, MANIFEST_PATH);
    }

    // Restore drive-auth
    const driveAuthBackup = path.join(backupDir, 'drive-auth.js.backup');
    if (fs.existsSync(driveAuthBackup)) {
      fs.copyFileSync(driveAuthBackup, DRIVE_AUTH_PATH);
    }

    console.log(colors.blue('🔄 Original files restored from backup'));
  } catch (error) {
    console.warn(colors.yellow('⚠️ Failed to restore backups:'), error.message);
  }
}

/**
 * Main injection function
 */
function injectOAuth2Credentials() {
  console.log(colors.blue('🔐 Injecting OAuth2 credentials...'));

  // Create backups
  createBackups();

  try {
    // Load OAuth2 configuration
    const config = loadOAuth2Config();

    // Inject credentials into files
    injectManifestCredentials(config);
    injectDriveAuthCredentials(config);

    console.log(colors.green('✅ OAuth2 credentials injected successfully'));
    console.log(colors.blue('📝 Files updated:'));
    console.log(colors.gray(`   - ${MANIFEST_PATH}`));
    console.log(colors.gray(`   - ${DRIVE_AUTH_PATH}`));

    return true;
  } catch (error) {
    console.error(colors.red('❌ Failed to inject OAuth2 credentials:'));
    console.error(colors.yellow(error.message));
    
    // Restore backups on failure
    restoreBackups();
    return false;
  }
}

/**
 * Cleanup function to restore original files
 */
function cleanup() {
  console.log(colors.blue('🧹 Cleaning up OAuth2 credentials...'));
  restoreBackups();
  console.log(colors.green('✅ Cleanup completed'));
}

// Handle command line arguments
const command = process.argv[2];

switch (command) {
  case 'inject':
    injectOAuth2Credentials();
    break;
  case 'cleanup':
    cleanup();
    break;
  default:
    console.log(colors.blue('🔐 OAuth2 Credential Injection Script'));
    console.log(colors.gray('\nUsage:'));
    console.log(colors.cyan('  node scripts/inject-oauth2.js inject    # Inject credentials'));
    console.log(colors.cyan('  node scripts/inject-oauth2.js cleanup   # Restore original files'));
    break;
}

// Export for use in other scripts
export {
  injectOAuth2Credentials,
  cleanup,
  loadOAuth2Config
}; 