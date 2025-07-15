# Advanced Configuration

## Extension Settings

### Sync Configuration
- **Sync Mode**: Host-to-Many or Global
- **Auto Sync**: Enable/Disable automatic synchronization
- **Sync Interval**: 5-30 minutes
- **Team Mode**: Enable collaboration features

### Theme Customization
- **Theme Options**: 
  - Light Mode
  - Dark Mode
  - System Default

### Performance & Logging
- **Verbose Logging**: Detailed diagnostic information
- **Performance Tracking**: Monitor sync operations

## Environment Variables
- `NODE_ENV`: Development or Production
- `DEBUG`: Enable extended debugging

## Browser Compatibility
- Chrome 100+
- Chromium-based browsers
  - Brave
  - Edge
  - Vivaldi

## Custom Configuration
Create a `config.json` in the extension directory for advanced settings:

```json
{
  "syncMode": "global",
  "autoSync": true,
  "syncInterval": 15,
  "encryption": {
    "enabled": true,
    "algorithm": "aes-gcm"
  }
}
```

## Recommended Setup
1. Configure OAuth2
2. Set sync preferences
3. Enable encryption
4. Monitor sync logs

## Performance Optimization
- Close unnecessary tabs
- Ensure stable internet connection
- Update extension regularly
