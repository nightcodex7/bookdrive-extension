# BookDrive Extension Build Process

## Overview

This document provides detailed information about the build process for the BookDrive browser extension.

## Build Configuration

The build process uses `esbuild` with the following key features:

### Build Modes

- **Development Mode**: 
  - Includes sourcemaps
  - Verbose logging
  - Unminified code

- **Production Mode**:
  - Minified code
  - No sourcemaps
  - Optimized output

### Entry Points

The build process handles the following entry points:
- `background.ts`: Background service worker
- `popup.ts`: Extension popup script
- `options.ts`: Options page script

## Build Commands

### Development Build
```bash
npm run build
```

### Production Build
```bash
npm run build:prod
```

### Watch Mode
```bash
npm run watch
```

## Build Configuration Details

### Supported Browsers
- Chromium-based browsers (Chrome 100+)
- Minimum Node.js version: 16.0.0

### Build Outputs
- Transpiled TypeScript files
- Bundled JavaScript
- Source maps (development mode)

## Troubleshooting

### Common Issues
- Ensure Node.js version compatibility
- Check that all entry point files exist
- Verify dependencies are installed

### Error Handling
The build process includes comprehensive error reporting with:
- Detailed error messages
- File and line number information
- Build performance tracking

## Performance Optimization

- Code is bundled and tree-shaken
- Production builds are minified
- External dependencies are managed efficiently

## Contributing

When making changes to the build process:
1. Update `esbuild.config.js`
2. Test different build scenarios
3. Ensure backward compatibility
