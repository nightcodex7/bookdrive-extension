#!/usr/bin/env node
/**
 * Script to copy manifest.json for BookDrive extension build
 * Cross-platform alternative to Unix cp command
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

// Copy manifest.json
fs.copyFileSync(
  path.join(rootDir, 'src', 'manifest.json'),
  path.join(rootDir, 'dist', 'manifest.json')
);

console.log('✅ Manifest copied successfully');