# Troubleshooting Guide

## Common Issues

### Authentication Problems
- **Symptom**: Unable to sign in
- **Solutions**:
  1. Clear Chrome browser cache
  2. Revoke and re-add Google Drive permissions
  3. Check OAuth2 client ID configuration

### Sync Failures
- **Symptom**: Bookmarks not synchronizing
- **Diagnostic Steps**:
  1. Check internet connection
  2. Verify Google Drive access
  3. Review sync logs
  4. Ensure compatible sync modes

### Performance Issues
- **Symptom**: Slow synchronization
- **Recommendations**:
  - Reduce sync interval
  - Disable verbose logging
  - Close unnecessary browser tabs
  - Update extension

### Scheduled Backup Issues
- **Symptom**: Scheduled backups not running
- **Diagnostic Steps**:
  1. Verify scheduled backups are enabled in settings
  2. Check if the next backup time is correctly calculated
  3. Review backup history for failed attempts
  4. Ensure browser was running during scheduled time
  5. Check system resource status (battery, network)

- **Symptom**: Scheduled backups failing
- **Solutions**:
  1. Check Google Drive permissions and quota
  2. Verify network connectivity
  3. Review error messages in backup history
  4. Wait for automatic retry or manually trigger a backup

- **Symptom**: Old backups not being removed
- **Solutions**:
  1. Verify retention policy is correctly set
  2. Check if backups are marked as manual instead of scheduled
  3. Manually remove excess backups if needed

## Error Codes

### Authentication Errors
- `AUTH_001`: Invalid OAuth2 Token
- `AUTH_002`: Permission Denied
- `AUTH_003`: Token Expired

### Sync Errors
- `SYNC_101`: Network Unavailable
- `SYNC_102`: Bookmark Tree Conflict
- `SYNC_103`: Encryption Failure

### Scheduled Backup Errors
- `SCHED_201`: Schedule Configuration Invalid
- `SCHED_202`: Missed Backup Window
- `SCHED_203`: Retention Policy Enforcement Failed
- `SCHED_204`: Resource Constraints Prevented Backup

## Diagnostic Tools
- **Verbose Logging**: Detailed error information
- **Sync Preview**: Dry run without modifications
- **Conflict Viewer**: Detect bookmark differences
- **Backup History**: View all backups with filtering by type and status

## Log Inspection
1. Open BookDrive popup
2. Navigate to Advanced tab
3. View Sync Timeline
4. Check Global Logs

## Support Channels
- GitHub Issues
- Community Forums
- Email Support

## Best Practices
- Keep extension updated
- Maintain stable internet
- Regular backups
- Monitor sync logs
