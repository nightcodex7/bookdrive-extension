# Contributing to BookDrive

Thank you for your interest in contributing to BookDrive! This guide will help you get started with development and making contributions to the project.

## Development Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/your-username/bookdrive-extension.git
   cd bookdrive-extension
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set up OAuth2**
   - Run `npm run setup:oauth2` and follow the instructions
   - This will guide you through creating a Google OAuth2 client ID
   - Update the manifest.json with your client ID

4. **Build the Extension**
   ```bash
   npm run build
   ```

5. **Load the Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory

## Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the coding standards in CONTRIBUTING.md
   - Ensure accessibility and security best practices
   - Add comments for complex logic

3. **Test Your Changes**
   ```bash
   npm run test
   npm run lint
   ```

4. **Build and Test the Extension**
   ```bash
   npm run build
   ```
   - Test in Chrome by reloading the extension

5. **Submit a Pull Request**
   - Push your changes to your fork
   - Open a PR against the main repository
   - Fill out the PR template with details about your changes

## Code Structure

- `src/background/` - Background service worker
- `src/popup/` - Extension popup UI
- `src/options/` - Options page
- `src/lib/` - Core functionality libraries
- `src/utils/` - Utility functions
- `src/types/` - TypeScript type definitions
- `src/__tests__/` - Test files

## Testing

- Unit tests are written with Jest
- Run tests with `npm test`
- Aim for good test coverage of core functionality

## Documentation

- Update the wiki when adding new features
- Document APIs and complex functions with JSDoc comments
- Keep the README up to date

## Code Review Process

- All PRs require at least one review
- CI checks must pass
- Follow feedback from maintainers

Thank you for contributing to BookDrive!