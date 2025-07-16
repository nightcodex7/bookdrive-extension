#!/usr/bin/env node
/**
 * Script to create a zip package of the BookDrive extension
 * Cross-platform alternative to zip command
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import archiver from 'archiver';

// Check if archiver is installed
try {
  if (!archiver) {
    console.error('Error: archiver package is not installed. Run: npm install --save-dev archiver');
    process.exit(1);
  }
} catch (e) {
  console.error('Error: archiver package is not installed. Run: npm install --save-dev archiver');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;

// Create output file name
const outputFile = path.join(rootDir, `bookdrive-extension-v${version}.zip`);

// Create a file to stream archive data to
const output = createWriteStream(outputFile);
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(`✅ Archive created: ${outputFile}`);
  console.log(`📦 Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
});

// Good practice to catch warnings
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

// Handle errors
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Append files from dist directory
archive.directory(distDir, false);

// Finalize the archive
archive.finalize();

console.log('Creating package...');