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
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
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
 * Get extension ID for OAuth2 setup
 */
function getExtensionId() {
    const manifestPath = path.join(__dirname, '..', 'src', 'manifest.json');
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        return manifest.key || 'YOUR_EXTENSION_ID';
    } catch (error) {
        return 'YOUR_EXTENSION_ID';
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

    print("\nThis script will help you set up Google OAuth2 credentials for BookDrive.", colors.blue);
    print("You'll need a Google Cloud Project and OAuth2 client ID.\n", colors.blue);

    // Step 1: Check if user has a Google Cloud Project
    print("Step 1: Google Cloud Project Setup", colors.cyan);
    print("=====================================", colors.cyan);
    
    const hasProject = await new Promise((resolve) => {
        rl.question("Do you already have a Google Cloud Project? (y/n): ", (answer) => {
            resolve(answer.toLowerCase().startsWith('y'));
        });
    });

    if (!hasProject) {
        print("\nYou'll need to create a Google Cloud Project first:", colors.yellow);
        print("1. Go to https://console.cloud.google.com/", colors.blue);
        print("2. Click 'Select a project' → 'New Project'", colors.blue);
        print("3. Give it a name (e.g., 'BookDrive Extension')", colors.blue);
        print("4. Click 'Create'\n", colors.blue);
        
        const continueSetup = await new Promise((resolve) => {
            rl.question("Press Enter when you've created the project...", () => {
                resolve(true);
            });
        });
    }

    // Step 2: Enable Google Drive API
    print("\nStep 2: Enable Google Drive API", colors.cyan);
    print("===============================", colors.cyan);
    print("You need to enable the Google Drive API in your project:", colors.blue);
    print("1. Go to https://console.cloud.google.com/apis/library", colors.blue);
    print("2. Search for 'Google Drive API'", colors.blue);
    print("3. Click on it and press 'Enable'\n", colors.blue);

    const apiEnabled = await new Promise((resolve) => {
        rl.question("Press Enter when you've enabled the Google Drive API...", () => {
            resolve(true);
        });
    });

    // Step 3: Create OAuth2 Credentials
    print("\nStep 3: Create OAuth2 Credentials", colors.cyan);
    print("=================================", colors.cyan);
    print("Now you'll create OAuth2 credentials for the extension:", colors.blue);
    print("1. Go to https://console.cloud.google.com/apis/credentials", colors.blue);
    print("2. Click 'Create Credentials' → 'OAuth client ID'", colors.blue);
    print("3. If prompted, configure the OAuth consent screen first", colors.blue);
    print("4. Application type: 'Chrome Extension'", colors.blue);
    print("5. Name: 'BookDrive Extension'", colors.blue);
    print("6. Add your extension ID to authorized origins\n", colors.blue);

    // Show extension ID
    const extensionId = getExtensionId();
    print(`Your extension ID: ${extensionId}`, colors.green);
    print("(You'll get the actual ID after loading the extension in Chrome)", colors.yellow);

    const credentialsCreated = await new Promise((resolve) => {
        rl.question("Press Enter when you've created the OAuth2 credentials...", () => {
            resolve(true);
        });
    });

    // Step 4: Get Client ID
    print("\nStep 4: Get Your Client ID", colors.cyan);
    print("===========================", colors.cyan);
    print("Copy your OAuth2 client ID from the credentials page.", colors.blue);
    print("It should look like: 123456789-abcdefghijklmnop.apps.googleusercontent.com\n", colors.blue);

    const clientId = await new Promise((resolve) => {
        rl.question("Enter your OAuth2 client ID: ", (answer) => {
            resolve(answer.trim());
        });
    });

    if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
        print("Invalid client ID format. Please check and try again.", colors.red);
        rl.close();
        return;
    }

    // Step 5: Update manifest
    print("\nStep 5: Update Extension Configuration", colors.cyan);
    print("=======================================", colors.cyan);
    
    if (updateManifest(clientId)) {
        print("✅ Successfully updated manifest.json with your client ID!", colors.green);
    } else {
        print("❌ Failed to update manifest.json", colors.red);
        rl.close();
        return;
    }

    // Step 6: Final instructions
    print("\nStep 6: Load the Extension", colors.cyan);
    print("=========================", colors.cyan);
    print("Now you need to load the extension in Chrome:", colors.blue);
    print("1. Run: npm run build", colors.green);
    print("2. Open Chrome → chrome://extensions/", colors.blue);
    print("3. Enable 'Developer mode'", colors.blue);
    print("4. Click 'Load unpacked' → Select the 'dist' folder", colors.blue);
    print("5. Copy the extension ID shown on the extensions page", colors.blue);
    print("6. Go back to Google Cloud Console → OAuth2 credentials", colors.blue);
    print("7. Add the extension ID to authorized origins", colors.blue);
    print("8. Test the extension!\n", colors.blue);

    print("🎉 OAuth2 setup complete! Your extension should now work with Google sign-in.", colors.green);
    print("\nIf you encounter any issues:", colors.yellow);
    print("- Check that the Google Drive API is enabled", colors.blue);
    print("- Verify your extension ID is in the OAuth2 authorized origins", colors.blue);
    print("- Make sure you're using the correct client ID", colors.blue);

    rl.close();
}

// Validate environment and run setup
if (require.main === module) {
    setup().catch((error) => {
        print(`Setup failed: ${error.message}`, colors.red);
        process.exit(1);
    });
}