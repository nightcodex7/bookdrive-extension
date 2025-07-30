# Project Rules for BookDrive Extension

## Code Quality & Output Rules

### 1. Redundancy Prevention
- Do not include redundant content when retrying a failed or partial output
- If output fails repeatedly, checkpoint the current output and resume from the next logical section without starting over

### 2. Large Output Management
- For large outputs (e.g., long code blocks, text files, or lists), automatically break the response into smaller manageable chunks to avoid tool timeout or crashing

### 3. Scripting Guidelines
- Avoid unnecessary scripting
- Only create scripts for tasks that are absolutely essential
- For routine actions (e.g., pushing to GitHub), prefer using native OS tools like PowerShell, or existing utilities like the GitHub CLI (gh), rather than writing custom scripts

### 4. Documentation Guidelines
- Do not generate .md files (e.g., summaries, task guides, or step-by-step instructions) for routine operations
- These are not needed. Instead, aim to perform tasks directly using available tools such as gh, without relying on extra scripts or documentation

### 5. Summary Generation
- Do not create summaries unless explicitly requested
- Avoid generating summaries, overviews, or condensed explanations unless specifically asked
- Focus on delivering direct, detailed, and actionable content only when required

### 6. Error Handling
- If the tool fails, gets stuck, or ends abruptly, automatically retry from the last successful point without repeating the previous output

## Author Information (Universal)

### Author Identity
- **Name**: Tuhin Garai
- **Email**: 64925748+nightcodex7@users.noreply.github.com

### Usage
- Always use the above details as the author identity across all files, commits, documentation, and metadata
- Apply to code push, commit, etc.

## Development Tools

### Editor Preferences
- Do not use vim editor anywhere
- Instead use nano, cat, or any other editor

## Security & Sensitive Data

### OAuth Credentials
- Never commit actual OAuth client IDs to version control
- Keep sensitive data locally only
- Use template files for GitHub (manifest.template.json, drive-auth.template.js)
- Ensure .gitignore properly excludes sensitive files

### Template Files
- Maintain template versions of files containing sensitive data
- Template files should use placeholder values like `YOUR_OAUTH2_CLIENT_ID.apps.googleusercontent.com`

## Extension-Specific Rules

### Popup Width
- Maintain consistent popup width (currently 900px)
- Ensure changes are reflected in the actual extension after rebuild
- Test popup width changes by reloading the extension

### File Organization
- Keep necessary files: application homepage, privacy policy, terms of service links, logo.png
- Remove unwanted files and perform regular code cleanups
- Maintain proper file structure and naming conventions

### Documentation
- Keep wiki/docs updated and comprehensive
- Ensure documentation reflects current implementation
- Remove outdated or redundant documentation files

---

**Last Updated**: December 2024  
**Project**: BookDrive Extension  
**Author**: Tuhin Garai 