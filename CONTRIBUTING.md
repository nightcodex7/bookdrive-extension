# Contributing to BookDrive

Thank you for your interest in contributing to BookDrive! We welcome contributions from everyone. Please read this guide to ensure a smooth process for all contributors and maintainers.

## How to Contribute

1. **Fork the repository** on GitHub.
2. **Create a new branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** (see Coding Standards below).
4. **Test your changes** locally (see Setup & Testing).
5. **Commit and push** your branch:
   ```bash
   git add .
   git commit -m "Describe your change"
   git push origin feature/your-feature-name
   ```
6. **Open a Pull Request** (PR) against the `main` branch. Fill out the PR template and describe your changes clearly.
7. **Participate in code review** and address any feedback.

## Coding Standards

- **JavaScript/HTML/CSS:** Use modern ES6+ syntax, async/await, and modular code.
- **Accessibility:** All UI must be keyboard accessible, use ARIA roles, and provide clear feedback.
- **Minimalism:** Keep code and UI minimal, clear, and user-friendly.
- **No inline JS/eval:** Follow Chrome extension security best practices.
- **Comments:** Add comments for complex logic or non-obvious code.

## Setup & Testing

1. **Clone your fork:**
   ```bash
   git clone https://github.com/your-username/bookdrive-extension.git
   cd bookdrive-extension
   ```
2. **Install dependencies:** (if any, e.g., for linting or testing)
   ```bash
   npm install
   ```
3. **Set up OAuth2:**
   - Run `scripts/setup-oauth2.sh` and follow the instructions.
   - Update `src/manifest.json` with your client_id.
4. **Load the extension:**
   - Open Chrome > Extensions > Developer Mode > Load unpacked > select `src/`.
5. **Test features:**
   - Try all sync modes, backup/restore, settings, and advanced features.
   - Check for errors in the console and UI.

## Reporting Issues

- Use [GitHub Issues](https://github.com/nightcodex7/bookdrive-extension/issues) for bugs, feature requests, or questions.
- Please provide clear steps to reproduce, screenshots, and browser/version info if relevant.

## Code Review & Release

- All PRs require at least one review and must pass CI checks.
- Major features or breaking changes should be discussed in an Issue or Discussion first.
- Releases are documented in [RELEASE.md](./RELEASE.md) and GitHub Releases.

## Community & Conduct

- Be respectful and constructive in all interactions.
- Follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct/).
- We welcome all contributors regardless of background or experience.

---

Thank you for helping make BookDrive better!
