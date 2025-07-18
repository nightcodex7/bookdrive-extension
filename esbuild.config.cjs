const esbuild = require('esbuild');
const { readdirSync, existsSync } = require('fs');
const { join, resolve } = require('path');
const colors = require('ansi-colors');

/**
 * @typedef {Object} BuildConfig
 * @property {boolean} watchMode - Whether the build is in watch mode
 * @property {boolean} production - Whether this is a production build
 * @property {Object} paths - Path configurations
 * @property {string} paths.src - Source directory path
 * @property {string} paths.dist - Distribution directory path
 * @property {Object<string, string>} paths.entries - Entry point files
 */

/** @type {BuildConfig} */
const CONFIG = {
  // Determine build mode
  watchMode: process.argv.includes('--watch'),
  production: process.env.NODE_ENV === 'production',
  
  // Paths and entry points
  paths: {
    src: resolve(__dirname, 'src'),
    dist: resolve(__dirname, 'dist'),
    entries: {
      background: './src/background/background.js',
      popup: './src/popup/popup.js',
      options: './src/options/options.js'
    }
  }
};

/**
 * Validates file paths and checks for file existence
 * @throws {Error} If an entry point file is missing
 */
function validateEntryPoints() {
  try {
    const missingFiles = Object.entries(CONFIG.paths.entries)
      .filter(([name, path]) => {
        const fullPath = resolve(__dirname, path);
        return !existsSync(fullPath);
      })
      .map(([name, path]) => ({ name, path: resolve(__dirname, path) }));

    if (missingFiles.length > 0) {
      const errorMessage = missingFiles
        .map(file => `Entry point not found: ${file.name} (${file.path})`)
        .join('\n');
      
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error(colors.red(`❌ Build Configuration Error:`));
    console.error(colors.yellow(error.message));
    
    // Provide more context about the expected entry points
    console.error(colors.blue('\nExpected Entry Points:'));
    Object.entries(CONFIG.paths.entries).forEach(([name, path]) => {
      console.error(colors.gray(`- ${name}: ${path}`));
    });

    process.exit(1);
  }
}

/**
 * Generates a comprehensive build report
 * @param {import('esbuild').BuildResult} result - Build result
 * @param {boolean} verbose - Whether to show detailed information
 */
function logBuildResult(result, verbose = false) {
  // Error handling with enhanced error reporting
  if (result.errors && result.errors.length > 0) {
    console.error(colors.red('❌ Build Failed:'));
    
    // Group errors by file for better readability
    const errorsByFile = result.errors.reduce((acc, error) => {
      const file = error.location?.file || 'Unknown';
      if (!acc[file]) acc[file] = [];
      acc[file].push(error);
      return acc;
    }, {});

    Object.entries(errorsByFile).forEach(([file, errors]) => {
      console.error(colors.yellow(`\n📁 File: ${file}`));
      errors.forEach(error => {
        console.error(colors.red(`  • ${error.text}`));
        if (error.location) {
          console.error(colors.gray(`    at line ${error.location.line}, column ${error.location.column}`));
        }
      });
    });
    
    // Optional: Warnings with more context
    if (result.warnings && result.warnings.length > 0) {
      console.warn(colors.yellow('\n⚠️ Build Warnings:'));
      result.warnings.forEach(warning => {
        console.warn(colors.yellow(`- ${warning.text}`));
        if (warning.location) {
          console.warn(colors.gray(`  at ${warning.location.file}:${warning.location.line}`));
        }
      });
    }
    
    process.exit(1);
  }

  // Success logging with environment context
  console.log(colors.green('✅ Build Successful'));
  console.log(colors.blue(`📦 Built to: ${CONFIG.paths.dist}`));
  console.log(colors.cyan(`🔧 Build Mode: ${CONFIG.production ? 'Production' : 'Development'}`));

  // Verbose build details with comprehensive file analysis
  if (verbose && result.metafile) {
    const { outputs } = result.metafile;
    console.log(colors.yellow('\n📊 Detailed Build Report:'));
    
    // Total bundle statistics
    const totalSize = Object.values(outputs).reduce((sum, details) => sum + details.bytes, 0);
    console.log(colors.green(`  Total Bundle Size: ${(totalSize / 1024).toFixed(2)} KB`));
    
    // Detailed output analysis
    Object.entries(outputs).forEach(([file, details]) => {
      console.log(`\n  ${colors.blue(file)}:`);
      console.log(`    • Size: ${(details.bytes / 1024).toFixed(2)} KB`);
      console.log(`    • Input Files: ${Object.keys(details.inputs).length}`);
      
      // Optional: Dependency breakdown for verbose mode
      if (verbose) {
        console.log(`    • Dependencies:`);
        Object.keys(details.inputs).forEach(input => {
          console.log(`      - ${colors.gray(input)}`);
        });
      }
    });
  }
}

// Validate entry points
validateEntryPoints();

// Prepare build configuration
const buildConfig = {
  // Entry points from configuration
  entryPoints: Object.values(CONFIG.paths.entries),
  
  // Output configuration
  outdir: CONFIG.paths.dist,
  outbase: CONFIG.paths.src, // Preserve source directory structure
  
  // Bundling and optimization
  bundle: true,
  minify: CONFIG.production,
  sourcemap: !CONFIG.production,
  
  // Target browser and compatibility
  target: ['chrome100', 'es2020'],
  format: 'esm',
  
  // Loader configurations
  loader: {
    '.js': 'js',
    '.css': 'css',
    '.json': 'json',
  },
  
  // Environment-specific defines
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env.DEBUG': JSON.stringify(!CONFIG.production),
    'process.env.VERSION': JSON.stringify(require('./package.json').version),
  },
  
  // External dependencies
  external: [
    'chrome', 
    'node:*',
  ],
  
  // Logging and reporting
  logLevel: CONFIG.production ? 'warning' : 'info',
  color: true,
  metafile: true,
  
  // Performance and tree-shaking
  treeShaking: true,
  keepNames: !CONFIG.production, // Preserve function names for debugging
  
  // Resolve configuration
  resolveExtensions: ['.js'],
};

/**
 * Runs the build process
 * @throws {Error} If build fails
 */
async function runBuild() {
  const startTime = Date.now();
  let buildContext = null;

  // Graceful shutdown handler
  const handleShutdown = async (signal) => {
    console.log(colors.yellow(`\n📴 Received ${signal}. Shutting down gracefully...`));
    if (buildContext) {
      await buildContext.dispose();
    }
    process.exit(0);
  };

  // Register signal handlers for graceful shutdown
  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  try {
    if (CONFIG.watchMode) {
      console.log(colors.blue('👀 Starting watch mode...'));
      buildContext = await esbuild.context(buildConfig);
      
      // Enhanced watch mode with detailed rebuild information
      await buildContext.watch({
        onRebuild(error, result) {
          if (error) {
            console.error(colors.red('❌ Rebuild failed:'), error);
          } else {
            const rebuildTime = Date.now() - startTime;
            console.log(colors.green(`🔄 Rebuild successful in ${rebuildTime}ms`));
            logBuildResult(result, true);
          }
        }
      });

      console.log(colors.blue('👀 Watching for changes. Press Ctrl+C to stop.'));
      
      // Prevent immediate exit in watch mode
      await new Promise(() => {});
    } else {
      // Production build with comprehensive error handling
      const result = await esbuild.build(buildConfig);
      
      // Log build result with verbose details for production
      logBuildResult(result, CONFIG.production);

      // Performance logging with more detailed metrics
      const duration = Date.now() - startTime;
      console.log(colors.cyan(`⏱️  Build completed in ${duration}ms`));
      
      // Optional: Write performance metrics to a file
      const performanceMetrics = {
        buildTime: duration,
        timestamp: new Date().toISOString(),
        mode: CONFIG.production ? 'production' : 'development'
      };
      
      require('fs').writeFileSync(
        `${CONFIG.paths.dist}/build-metrics.json`, 
        JSON.stringify(performanceMetrics, null, 2)
      );
    }
  } catch (error) {
    console.error(colors.red('❌ Build process failed:'));
    console.error(colors.yellow(error.message));
    
    // Detailed error stack trace for debugging
    if (CONFIG.production) {
      console.error(colors.gray(error.stack));
    }
    
    process.exit(1);
  } finally {
    // Ensure context is always disposed
    if (buildContext) {
      await buildContext.dispose();
    }
  }
}

// Validate environment and run build
if (require.main === module) {
  // Check Node.js version compatibility
  const nodeVersion = process.version;
  console.log(colors.blue(`Using Node.js version: ${nodeVersion}`));

  runBuild();
}