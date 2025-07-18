/**
 * Script to check for file references that might need updating
 * This script scans JavaScript files for import statements and logs potential issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Patterns to look for
const patterns = [
  { regex: /import\s+.*\s+from\s+['"](.+?)['"]/g, description: 'ES6 import' },
  { regex: /require\s*\(\s*['"](.+?)['"]\s*\)/g, description: 'CommonJS require' },
  { regex: /import\s*\(\s*['"](.+?)['"]\s*\)/g, description: 'Dynamic import' },
  { regex: /['"]\.\.\/(.+?)['"]/g, description: 'Relative path' },
  { regex: /['"]\.\/(.*?)['"]/g, description: 'Local path' },
];

// File extensions to check
const extensions = ['.js', '.html', '.css', '.json'];

// Directories to exclude
const excludeDirs = ['node_modules', 'dist', '.git'];

/**
 * Recursively get all files in a directory
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>} Array of file paths
 */
async function getFiles(dir) {
  const subdirs = await fs.promises.readdir(dir);
  const files = await Promise.all(
    subdirs.map(async (subdir) => {
      const res = path.resolve(dir, subdir);
      if (excludeDirs.includes(subdir)) return [];
      return (await fs.promises.stat(res)).isDirectory() ? getFiles(res) : res;
    })
  );
  return files.flat();
}

/**
 * Check a file for references
 * @param {string} filePath - Path to the file
 */
async function checkFile(filePath) {
  // Only check files with specified extensions
  if (!extensions.some((ext) => filePath.endsWith(ext))) return;

  try {
    const content = await fs.promises.readFile(filePath, 'utf8');
    let hasIssues = false;
    
    console.log(`${colors.cyan}Checking ${filePath}${colors.reset}`);
    
    // Check for each pattern
    for (const pattern of patterns) {
      const matches = [...content.matchAll(pattern.regex)];
      
      if (matches.length > 0) {
        for (const match of matches) {
          const importPath = match[1];
          
          // Skip node_modules and absolute paths
          if (importPath.startsWith('@') || 
              importPath.startsWith('http') || 
              !importPath.includes('/') ||
              !importPath.includes('.')) {
            continue;
          }
          
          console.log(`  ${colors.yellow}${pattern.description}:${colors.reset} ${importPath}`);
          hasIssues = true;
        }
      }
    }
    
    if (!hasIssues) {
      console.log(`  ${colors.green}No issues found${colors.reset}`);
    }
  } catch (error) {
    console.error(`${colors.red}Error checking ${filePath}:${colors.reset}`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const rootDir = path.resolve(__dirname, '..');
    const srcDir = path.join(rootDir, 'src');
    const files = await getFiles(srcDir);
    console.log(`${colors.blue}Found ${files.length} files to check${colors.reset}`);
    
    for (const file of files) {
      await checkFile(file);
    }
    
    console.log(`${colors.green}File reference check complete${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

main();