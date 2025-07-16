# Sync Modes

BookDrive offers two sophisticated synchronization modes to cater to different user needs.

## 1. Host-to-Many Mode
- **Primary Device**: One device acts as the primary sync source
- **Sync Direction**: One-way synchronization
- **Use Case**: Single source of truth for bookmarks
- **Recommended For**: Individual users with a primary device

### Characteristics
- Changes from the host device propagate to all other devices
- Other devices cannot modify the bookmark tree
- Low conflict potential
- Simplified sync logic

## 2. Global Sync Mode
- **Peer-to-Peer**: All devices can modify bookmarks
- **Sync Direction**: Two-way synchronization
- **Use Case**: Collaborative bookmark management
- **Recommended For**: Teams, shared environments

### Characteristics
- Delta-based synchronization
- Conflict resolution mechanism
- Timestamp-based merge strategy
- Author metadata tracking

## Sync Strategy
- Uses SHA-256 hashing for efficient change detection
- Skips synchronizing unchanged bookmark nodes
- Supports real-time and scheduled synchronization
- Adaptive to network and battery conditions

## Configuration
You can switch between modes in the extension settings:
- Open BookDrive popup
- Navigate to Settings
- Select desired sync mode

## Best Practices
- Choose mode based on your workflow
- Regularly backup bookmarks
- Monitor sync logs for any discrepancies
