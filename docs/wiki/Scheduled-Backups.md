# Scheduled Backups

BookDrive's Scheduled Backups feature allows you to automatically create backups of your bookmarks on a regular schedule without manual intervention. This ensures your bookmark data is consistently preserved and protected against data loss.

## How Scheduled Backups Work

Scheduled backups run automatically in the background based on your configured schedule. The system intelligently manages resource usage to minimize impact on browser performance.

### Key Features

- **Automatic Execution**: Backups run at your specified times without requiring manual action
- **Flexible Scheduling**: Choose from daily, weekly, bi-weekly, or monthly schedules
- **Retention Management**: Control how many backups are kept to manage storage space
- **Resource-Aware Processing**: Backups adapt to system conditions like battery level and network connectivity
- **Background Operation**: Continues to work even when the browser is closed (runs when browser reopens)

## Setting Up Scheduled Backups

1. Navigate to the BookDrive Options page
2. Scroll to the "Scheduled Backups" section
3. Toggle "Enable Scheduled Backups" to on
4. Configure your preferences:
   - **Backup Frequency**: Daily, Weekly, Bi-weekly, or Monthly
   - **Day Selection**: (For weekly, bi-weekly, and monthly) Choose specific day
   - **Time**: Set hour and minute for backups to run
   - **Retention Policy**: Choose how many backups to keep

## Backup Types

BookDrive distinguishes between two types of backups:

- **Manual Backups**: Created explicitly by user action
- **Scheduled Backups**: Created automatically based on your schedule

Both types appear in the Backup History page but are clearly labeled by type. The retention policy only applies to scheduled backups - manual backups are never automatically removed.

## Retention Policy

The retention policy controls how many scheduled backups are kept:

- Options: 5, 10, 20, 50, or unlimited backups
- When the limit is reached, the oldest scheduled backup is automatically removed
- Manual backups are preserved regardless of the retention policy

## Adaptive Scheduling

BookDrive intelligently manages scheduled backups based on system conditions:

- **Battery Awareness**: May defer backups when battery is low
- **Network Sensitivity**: Postpones backups during limited connectivity
- **Resource Management**: Avoids impacting browser performance during high usage
- **Missed Backup Handling**: Executes missed backups when conditions improve

## Viewing Backup History

1. Navigate to the BookDrive Options page
2. Scroll to the "Scheduled Backups" section
3. Click "View Backup History"
4. Use filters to view specific backup types:
   - Filter by type (Manual/Scheduled)
   - Filter by status (Success/Failed/In Progress/Retry Pending)
   - Filter by date range

## Restoring from Backups

Restoring from scheduled backups works the same way as manual backups:

1. Navigate to the Backup History page
2. Find the backup you want to restore
3. Click the "Restore" button
4. Confirm the restoration

## Troubleshooting

If scheduled backups aren't working as expected:

1. **Verify Settings**: Ensure scheduled backups are enabled and properly configured
2. **Check Browser Activity**: Backups only run when the browser is open
3. **Review Backup History**: Look for failed attempts or pending retries
4. **Check System Resources**: Low battery or poor connectivity may defer backups
5. **Verify Google Drive Access**: Ensure your Google Drive permissions are valid

For specific error codes and solutions, see the [Troubleshooting Guide](Troubleshooting.md#scheduled-backup-issues).