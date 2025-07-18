# Standardized File Naming Conventions

This document outlines the standardized file naming conventions used in the BookDrive extension project.

## General Principles

1. **Consistency**: Use consistent naming patterns across the entire project
2. **Clarity**: Names should clearly indicate the purpose of the file
3. **Specificity**: Names should be specific enough to understand the file's role
4. **Brevity**: Names should be concise while still being descriptive

## File Naming Standards

### JavaScript Files

- Use **kebab-case** for all JavaScript files
  - Example: `error-handler.js`, `backup-metadata.js`, `setup-oauth2.js`
- Use descriptive names that clearly indicate the purpose of the file
- Avoid abbreviations unless they are widely understood
- Use consistent suffixes for specific file types:
  - `.test.js` for test files
  - `.js` for JavaScript files

### HTML Files

- Use **kebab-case** for all HTML files
  - Example: `popup.html`, `options.html`, `backup-history.html`
- Name should match the associated JavaScript file when applicable
  - Example: `popup.html` pairs with `popup.js`

### CSS Files

- Use **kebab-case** for all CSS files
  - Example: `popup.css`, `options.css`, `backup-history.css`
- Name should match the associated HTML file when applicable
  - Example: `popup.css` pairs with `popup.html`

### Documentation Files

- **Root-level documentation**: Use UPPERCASE for root-level documentation files
  - Example: `README.md`, `CONTRIBUTING.md`, `LICENSE`
- **Wiki documentation**: Use Title-Case with hyphens for wiki documentation files
  - Example: `File-Organization.md`, `Naming-Conventions.md`
- Use descriptive names that clearly indicate the content of the document

### Configuration Files

- Use **kebab-case** for configuration files
  - Example: `.eslintrc.json`, `.prettierrc.json`
- Follow standard naming conventions for configuration files when applicable
  - Example: `package.json`, `manifest.json`

### Test Files

- Basic tests: Use the pattern `[module].test.js`
  - Example: `bookmarks.test.js`, `drive.test.js`
- Specialized tests: Use the pattern `[module]-[descriptor].test.js`
  - Example: `alarm-manager-extended.test.js`, `backup-metadata-extended.test.js`
- Integration tests: Use the pattern `[module]-integration.test.js`
  - Example: `notification-integration.test.js`, `scheduler-integration.test.js`

### Shell Scripts

- Use **kebab-case** for all shell scripts
  - Example: `setup-oauth2.sh`

## Directory Naming Standards

- Use **kebab-case** for all directory names
  - Example: `backup-history`, `__tests__`
- Use singular nouns for directories that contain a collection of similar items
  - Example: `lib`, `util`, `config`
- Use plural nouns for directories that contain multiple instances of the same type
  - Example: `assets`, `types`

## Special Files

- `index.js` - Used for re-exporting from a directory
- `manifest.json` - Chrome extension manifest
- `README.md` - Project documentation
- `CHANGELOG.md` - Version history
- `LICENSE` - License information

## Benefits of Standardized Naming

1. **Improved Readability**: Consistent naming makes the codebase easier to read and understand
2. **Better Maintainability**: Standardized naming reduces cognitive load when navigating the codebase
3. **Easier Collaboration**: Team members can quickly understand the purpose of files
4. **Reduced Errors**: Consistent naming reduces the chance of errors when referencing files
5. **Automated Processing**: Standardized naming enables more reliable automated processing of files