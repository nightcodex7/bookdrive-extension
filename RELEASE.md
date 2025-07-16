# BookDrive Release Notes

## v1.0.0 (Initial Release)

### Major Features

- Two-way bookmark sync using Google Drive (no browser sign-in required)
- Host-to-Many and Global Sync modes
- Fully offline-compatible with persistent sync queue
- Responsive, modern popup UI with light/dark mode
- Multi-step onboarding/setup wizard

### Advanced Features

- Delta-based incremental sync (SHA-256 hashes, skips unchanged nodes)
- Client-side encryption (AES-GCM, optional, with passphrase)
- Manual backup/restore with versioned retention
- Conflict viewer/manual merge with diff logic
- Team mode (multi-user, author/syncedBy metadata)
- Adaptive/battery-aware sync intervals
- Real-time, debounced sync on bookmark changes
- Settings export/import as JSON
- Visual sync timeline graph (Chart.js)
- Global sync notification hub (cross-device log viewer)
- Verbose logging, advanced Drive cleanup, log trimming

### UI/UX Improvements

- Accessible, keyboard-navigable UI (ARIA roles, focus management)
- Toast notifications and feedback for all major actions
- Modals, toasts, badges, and advanced settings
- Minimal, clean, and intuitive design

### Security & Privacy

- All data stored in user’s own Google Drive, never on third-party servers
- OAuth2 only for Drive, tokens never persisted
- Minimal permissions, no inline JS/eval, Manifest V3, service worker
- Optional client-side encryption with user passphrase

### Known Issues & Upgrade Notes

- Chrome Web Store listing pending (use manual install for now)
- Ensure you set up your own OAuth2 client_id (see README and setup script)
- Some advanced features (e.g., merge logic) may be improved in future releases
- For best results, use the latest version of Chrome/Chromium-based browsers

---

For the full changelog and roadmap, see [GitHub Releases](https://github.com/your-org/bookdrive-extension/releases) or the project Wiki.
