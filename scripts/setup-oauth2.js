#!/usr/bin/env node
/**
 * BookDrive OAuth2 Setup Script
 * Cross-platform JavaScript version of the OAuth2 setup process
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Print colored message to console
 * @param {string} message - Message to print
 * @param {string} color - Color to use
 */
function print(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

/**
 * Check if manifest.json exists
 * @returns {boolean} - Whether manifest.json exists
 */
function checkManifestExists() {
    const manifestPath = path.join(__dirname, '..', 'src', 'manifest.json');
    return fs.existsSync(manifestPath);
}

/**
 * Update manifest.json with provided client ID
 * @param {string} clientId - OAuth2 client ID to set in manifest
 */
function updateManifest(clientId) {
    const manifestPath = path.join(__dirname, '..', 'src', 'manifest.json');

    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

        if (!manifest.oauth2) {
            manifest.oauth2 = {
                scopes: [
                    "https://www.googleapis.com/auth/drive.appdata",
                    "https://www.googleapis.com/auth/drive.file"
                ]
            };
        }

        manifest.oauth2.client_id = clientId;

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        return true;
    } catch (error) {
        print(`Error updating manifest: ${error.message}`, colors.red);
        return false;
    }
}

/**
 * Open browser to Google Cloud Console
 */
function openGoogleConsole() {
    const url = 'https://console.cloud.google.com/apis/credentials';

    try {
        // Cross-platform open URL
        const cmd = process.platform === 'win32' ? 'start' :
            process.platform === 'darwin' ? 'open' : 'xdg-open';
        execSync(`${cmd} ${url}`);
        return true;
    } catch (error) {
        print(`Could not open browser automatically. Please visit: ${url}`, colors.yellow);
        return false;
    }
}

/**
 * Main setup function
 */
async function setup() {
    print("\n=== BookDrive OAuth2 Client ID Setup ===", colors.green);

    if (!checkManifestExists()) {
        print("Error: src/manifest.json not found! Please run this script from the project root.", colors.red);
        rl.close();
        return;
    }

    print("\nThis script will help you set up OAuth2 for BookDrive.", colors.reset);
    print("1. Open Google Cloud Console", colors.yellow);
    print("2. Create a new project (or select an existing one) named 'BookDrive'", colors.yellow);
    print("3. Click 'Create Credentials' > 'OAuth client ID'", colors.yellow);
    print("4. Select 'Chrome App' and enter the extension ID", colors.yellow);
    print("5. Copy the generated client_id", colors.yellow);

    // Ask if user wants to open Google Console
    rl.question("\nWould you like to open Google Cloud Console now? (y/n): ", (answer) => {
        if (answer.toLowerCase() === 'y') {
            openGoogleConsole();
        }

        // Ask for client ID
        rl.question("\nEnter your OAuth2 client ID (ending with .apps.googleusercontent.com): ", (clientId) => {
            if (!clientId || !clientId.endsWith('.apps.googleusercontent.com')) {
                print("Invalid client ID format. Please make sure it ends with .apps.googleusercontent.com", colors.red);
                rl.close();
                return;
            }

            if (updateManifest(clientId)) {
                print("\n✅ Success! OAuth2 client ID has been updated in manifest.json", colors.green);
                print("Next steps:", colors.yellow);
                print("1. Rebuild the extension: npm run build", colors.yellow);
                print("2. Reload the extension in your browser", colors.yellow);
                print("3. Test authentication in the extension popup", colors.yellow);
            } else {
                print("\n❌ Failed to update manifest.json", colors.red);
            }

            rl.close();
        });
    });
}

// Run setup
setup();