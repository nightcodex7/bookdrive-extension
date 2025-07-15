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

## Error Codes

### Authentication Errors
- `AUTH_001`: Invalid OAuth2 Token
- `AUTH_002`: Permission Denied
- `AUTH_003`: Token Expired

### Sync Errors
- `SYNC_101`: Network Unavailable
- `SYNC_102`: Bookmark Tree Conflict
- `SYNC_103`: Encryption Failure

## Diagnostic Tools
- **Verbose Logging**: Detailed error information
- **Sync Preview**: Dry run without modifications
- **Conflict Viewer**: Detect bookmark differences

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
