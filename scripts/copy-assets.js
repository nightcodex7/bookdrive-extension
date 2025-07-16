#!/usr/bin/env node
/**
 * Script to copy assets for BookDrive extension build
 * Cross-platform alternative to Unix cp commands
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Ensure dist directory exists
if (!fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.mkdirSync(path.join(rootDir, 'dist'), { recursive: true });
}

// Copy assets directory
copyDirectory(
  path.join(rootDir, 'src', 'assets'),
  path.join(rootDir, 'dist', 'assets')
);

// Copy HTML and CSS files from popup
copyFilesWithExtension(
  path.join(rootDir, 'src', 'popup'),
  path.join(rootDir, 'dist', 'popup'),
  ['.html', '.css']
);

// Copy HTML and CSS files from options
copyFilesWithExtension(
  path.join(rootDir, 'src', 'options'),
  path.join(rootDir, 'dist', 'options'),
  ['.html', '.css']
);

console.log('✅ Assets copied successfully');

/**
 * Copy a directory recursively
 * @param {string} source - Source directory
 * @param {string} destination - Destination directory
 */
function copyDirectory(source, destination) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read source directory
  const files = fs.readdirSync(source);

  // Copy each file/directory
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      // Recursively copy subdirectory
      copyDirectory(sourcePath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

/**
 * Copy files with specific extensions
 * @param {string} source - Source directory
 * @param {string} destination - Destination directory
 * @param {string[]} extensions - File extensions to copy
 */
function copyFilesWithExtension(source, destination, extensions) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read source directory
  const files = fs.readdirSync(source);

  // Copy files with matching extensions
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (!stats.isDirectory() && extensions.some(ext => file.endsWith(ext))) {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}