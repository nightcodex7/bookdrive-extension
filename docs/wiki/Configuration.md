# Advanced Configuration

## Extension Settings

### Sync Configuration
- **Sync Mode**: Host-to-Many or Global
- **Auto Sync**: Enable/Disable automatic synchronization
- **Sync Interval**: 5-30 minutes
- **Team Mode**: Enable collaboration features

### Scheduled Backups
- **Enable Scheduled Backups**: Automatically create backups on a regular schedule without manual intervention
- **Backup Frequency**: Choose from daily, weekly, bi-weekly, or monthly schedules
  - **Daily**: Creates a backup every day at the specified time
  - **Weekly**: Creates a backup once a week on your selected day
  - **Bi-weekly**: Creates a backup every two weeks on your selected day
  - **Monthly**: Creates a backup once a month on your selected day
- **Day Selection**: For weekly, bi-weekly, and monthly backups, select specific days
  - Weekly/Bi-weekly: Choose any day of the week (Sunday-Saturday)
  - Monthly: Choose any day of the month (1-31)
- **Time Selection**: Set the hour and minute for backups to run (24-hour format)
- **Retention Policy**: Control how many backups are kept to manage storage space
  - Options: 5, 10, 20, 50, or unlimited backups
  - When the limit is reached, the oldest scheduled backup is automatically removed
  - Manual backups are never automatically removed regardless of the retention policy

#### How Scheduled Backups Work
- Backups run automatically in the background at the configured times
- If the browser is closed during a scheduled backup time, the backup will run when the browser is next opened
- The system intelligently manages resource usage to avoid impacting browser performance
- Backups may be deferred if the system detects:
  - Low battery power
  - Limited network connectivity
  - High browser resource usage
- All scheduled backups appear in the Backup History page with the "scheduled" type label

For more detailed information about scheduled backups, see the [Scheduled Backups](Scheduled-Backups.md) documentation.

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
