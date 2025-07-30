# Sync Analytics

BookDrive's Sync Analytics provides comprehensive monitoring and insights into your bookmark synchronization activities.

## Overview

The Sync Analytics feature tracks sync performance, provides visual timelines, and offers detailed metrics to help you understand and optimize your bookmark synchronization.

## Features

### 📊 Performance Metrics
- **Sync Speed**: Average time per sync operation
- **Success Rate**: Percentage of successful syncs
- **Error Tracking**: Detailed error analysis and categorization
- **Resource Usage**: Memory and CPU usage during sync operations

### 📈 Timeline Visualization
- **Activity Timeline**: Visual representation of sync activities over time
- **Event Tracking**: Detailed log of all sync events
- **Performance Trends**: Historical performance data

### 🔍 Error Analysis
- **Error Categories**: Categorized error types (network, authentication, etc.)
- **Error Frequency**: Most common error patterns
- **Recommendations**: Suggested solutions for common issues

### 📤 Export Capabilities
- **Data Export**: Export analytics data in JSON format
- **Log Export**: Export detailed logs for external analysis
- **Report Generation**: Generate performance reports

## Accessing Analytics

### From Popup
1. Open the BookDrive popup
2. Go to the **Settings** tab
3. Click **Advanced Settings**
4. In the **Analytics & Logging** section, click **View Analytics**

### From Options Page
1. Open the BookDrive options page
2. Navigate to **Analytics & Logging**
3. Click **View Analytics**

## Analytics Dashboard

### Overview Cards
- **Total Syncs**: Number of sync operations performed
- **Success Rate**: Percentage of successful syncs
- **Average Duration**: Average time per sync
- **Last Sync**: Timestamp of the most recent sync

### Timeline Chart
- **Interactive Chart**: Chart.js-powered timeline visualization
- **Event Types**: Different colors for different event types
- **Time Range**: Configurable time periods (7, 30, 90 days)

### Performance Metrics
- **Sync Duration**: Detailed breakdown of sync times
- **Error Summary**: Categorized error statistics
- **Resource Usage**: Memory and CPU metrics

### Recent Activity
- **Event List**: Chronological list of recent sync events
- **Event Details**: Expandable details for each event
- **Status Indicators**: Visual status indicators for each event

### Recommendations
- **Performance Tips**: Suggestions for improving sync performance
- **Error Solutions**: Recommended actions for common errors
- **Optimization Advice**: Tips for better sync efficiency

## Configuration

### Enable/Disable Analytics
```javascript
// In options page
const analyticsEnabled = document.getElementById('analytics-enabled');
analyticsEnabled.checked = true; // Enable analytics
```

### Logging Options
- **Verbose Logs**: Detailed logging for debugging
- **Performance Logging**: Track performance metrics
- **Error Logging**: Log all errors with stack traces

### Data Retention
- **Default**: 30 days of analytics data
- **Configurable**: Adjust retention period in settings
- **Auto-cleanup**: Automatic cleanup of old data

## API Reference

### Analytics Events
```javascript
import { ANALYTICS_EVENTS, recordEvent } from '../lib/analytics/sync-analytics.js';

// Record a sync start event
recordEvent(ANALYTICS_EVENTS.SYNC_STARTED, {
  mode: 'global',
  timestamp: Date.now()
});

// Record a sync completion event
recordEvent(ANALYTICS_EVENTS.SYNC_COMPLETED, {
  mode: 'global',
  duration: 1500,
  bookmarksProcessed: 250
});
```

### Available Events
- `SYNC_STARTED`: Sync operation initiated
- `SYNC_COMPLETED`: Sync operation completed successfully
- `SYNC_FAILED`: Sync operation failed
- `BACKUP_CREATED`: Backup created successfully
- `BACKUP_FAILED`: Backup creation failed
- `ENCRYPTION_ENABLED`: Encryption enabled
- `ENCRYPTION_DISABLED`: Encryption disabled
- `TEAM_MEMBER_ADDED`: Team member added
- `TEAM_MEMBER_REMOVED`: Team member removed

### Analytics Data Structure
```javascript
{
  events: [
    {
      type: 'SYNC_STARTED',
      timestamp: 1640995200000,
      data: {
        mode: 'global',
        deviceId: 'device-123'
      }
    }
  ],
  metrics: {
    totalSyncs: 150,
    successRate: 0.95,
    averageDuration: 1200
  },
  timeline: [
    {
      date: '2024-01-01',
      events: 5,
      errors: 0
    }
  ]
}
```

## Troubleshooting

### Analytics Not Loading
1. **Check Permissions**: Ensure storage permissions are granted
2. **Clear Cache**: Clear browser cache and reload
3. **Check Console**: Look for JavaScript errors in browser console

### Missing Data
1. **Enable Analytics**: Ensure analytics is enabled in settings
2. **Check Time Range**: Verify the selected time range
3. **Data Retention**: Check if data was cleaned up automatically

### Performance Issues
1. **Reduce Logging**: Disable verbose logging if not needed
2. **Clear Old Data**: Manually clear old analytics data
3. **Check Storage**: Ensure sufficient storage space

## Best Practices

### Data Management
- **Regular Cleanup**: Periodically clear old analytics data
- **Export Important Data**: Export data before major updates
- **Monitor Storage**: Keep an eye on storage usage

### Performance Optimization
- **Selective Logging**: Enable only necessary logging options
- **Efficient Queries**: Use appropriate time ranges for queries
- **Background Processing**: Analytics processing runs in background

### Privacy Considerations
- **Local Storage**: All analytics data is stored locally
- **No External Sharing**: Data is never sent to external servers
- **User Control**: Users can disable analytics at any time

## Related Documentation

- **[Configuration](Configuration.md)** - General configuration settings
- **[Troubleshooting](Troubleshooting.md)** - Common issues and solutions
- **[Team Mode](team.md)** - Team collaboration features
- **[Backup & Restore](Scheduled-Backups.md)** - Backup system documentation 