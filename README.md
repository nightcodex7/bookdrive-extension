# BookDrive - WORK IN PROGRESS

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/your-extension-id?label=Chrome%20Web%20Store)](https://chrome.google.com/webstore/detail/your-extension-id)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Issues](https://img.shields.io/github/issues/your-org/bookdrive-extension)](https://github.com/your-org/bookdrive-extension/issues)

A cross-platform, open-source, privacy-respecting Chromium extension for two-way bookmark synchronization using Google Drive as the backend — no browser sign-in required.

---

## Overview

- Syncs browser-native bookmarks via Google Drive
- Host-to-Many and Global Sync modes
- Fully offline-compatible
- Responsive UI with light/dark mode
- Open-source, Chrome Web Store-ready

## Advanced Features

- **Delta-based incremental sync** (SHA-256 hashes, skips unchanged nodes)
- **Client-side encryption** (AES-GCM, optional, with passphrase)
- **Manual backup/restore** with versioned retention
- **Conflict viewer/manual merge** with diff logic
- **Team mode** (multi-user, author/syncedBy metadata)
- **Adaptive/battery-aware sync intervals**
- **Real-time, debounced sync** on bookmark changes
- **Settings export/import** as JSON
- **Visual sync timeline graph** (Chart.js)
- **Global sync notification hub** (cross-device log viewer)
- **Verbose logging, advanced Drive cleanup, log trimming**
- **Multi-step onboarding wizard**
- **Accessibility and keyboard navigation**

## Sync Modes Summary

- **Host-to-Many:** One-way push from host to clients
- **Global Sync:** Two-way peer sync with conflict resolution

## Installation

- [Chrome Web Store link](https://chrome.google.com/webstore/detail/your-extension-id) (coming soon)
- Manual: Clone repo, load `src/` as unpacked extension

## Setup: Google OAuth2 Client ID

1. Run `scripts/setup_oauth2.sh` or `scripts/setup_oauth2.js`.
2. Follow prompts to create a Google Cloud project and OAuth2 credentials.
3. Paste the generated client_id into `src/manifest.json` and reload the extension.
4. See [Google OAuth2 docs](https://developers.google.com/identity/protocols/oauth2) for more info.

## Permissions Explanation

- `bookmarks`: Access browser bookmarks
- `storage`: Store settings and metadata
- `identity`: Authenticate with Google Drive
- `alarms`: For scheduled sync and retry
- `notifications`: For user feedback

## Privacy & Security

- All data is stored in your own Google Drive, never on third-party servers.
- OAuth2 tokens are never persisted beyond the session.
- Optional client-side encryption (AES-GCM) with user passphrase.
- Minimal permissions, no inline JS/eval, Manifest V3, service worker.

## Accessibility & Browser Support

- Fully keyboard accessible, ARIA roles, and focus management
- Works on Chrome, Chromium, Edge, Brave, Vivaldi (latest versions)

## Troubleshooting

- **OAuth2 setup issues:** Double-check client_id and manifest, see onboarding wizard.
- **Sync not working:** Check network, Drive permissions, and extension logs (Advanced tab).
- **Restore/backup issues:** Use the manual backup/restore tools in Advanced tab.
- **Still stuck?** [Open an issue](https://github.com/your-org/bookdrive-extension/issues)

## FAQ

- **Is this self-hosted?**
  > This extension is fully self-hosted using your own Drive account — ensuring you retain complete privacy and control. No external servers are used.
- **Does it work offline?**
  > Yes, sync jobs are queued and retried when online.
- **How is my data secured?**
  > All data stays in your Google Drive, protected by OAuth. Optional client-side encryption is available.

## Contribution Guide

- Fork, branch, and PR as per [CONTRIBUTING.md]
- See `docs/` and GitHub Wiki for architecture and roadmap

## Release Notes

See the [latest release file](./RELEASE.md) or GitHub Releases for the full changelog.

## License

GNU General Public License v3.0
