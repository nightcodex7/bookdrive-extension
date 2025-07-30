// Notification Manager for BookDrive
// Handles browser notifications and UI status updates

/**
 * Show a browser notification
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} options - Additional options
 * @param {string} options.type - Notification type (success, error, warning, info)
 * @param {boolean} options.requireInteraction - Whether notification requires user interaction
 * @param {Function} options.onClick - Callback when notification is clicked
 */
export function showBrowserNotification(title, message, options = {}) {
  // Check if browser notifications are supported
  if (!('Notification' in window)) {
    console.log('Browser notifications not supported');
    return;
  }

  // Set default options
  const defaultOptions = {
    type: 'info',
    requireInteraction: false,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  // Determine icon based on type
  let iconPath = '/assets/icon-48.png';
  switch (mergedOptions.type) {
    case 'success':
      iconPath = '/assets/icon-success-48.png';
      break;
    case 'error':
      iconPath = '/assets/icon-error-48.png';
      break;
    case 'warning':
      iconPath = '/assets/icon-warning-48.png';
      break;
    default:
      iconPath = '/assets/icon-48.png';
  }

  // Check notification permission
  if (Notification.permission === 'granted') {
    // Create and show notification
    const notification = new Notification(title, {
      body: message,
      icon: iconPath,
      requireInteraction: mergedOptions.requireInteraction,
    });

    // Add click handler if provided
    if (mergedOptions.onClick && typeof mergedOptions.onClick === 'function') {
      notification.onclick = mergedOptions.onClick;
    }
  } else if (Notification.permission !== 'denied') {
    // Request permission
    try {
      // Handle both Promise-based and callback-based implementations
      const requestPermission = () => {
        if (typeof Notification.requestPermission === 'function') {
          if (Notification.requestPermission.length === 0) {
            // Promise-based API
            return Notification.requestPermission().then((permission) => {
              if (permission === 'granted') {
                showNotification();
              }
            });
          } else {
            // Callback-based API
            return new Promise((resolve) => {
              Notification.requestPermission((permission) => {
                if (permission === 'granted') {
                  showNotification();
                }
                resolve(permission);
              });
            });
          }
        }
        return Promise.resolve('default');
      };

      // Function to show notification
      const showNotification = () => {
        const notification = new Notification(title, {
          body: message,
          icon: iconPath,
          requireInteraction: mergedOptions.requireInteraction,
        });

        // Add click handler if provided
        if (mergedOptions.onClick && typeof mergedOptions.onClick === 'function') {
          notification.onclick = mergedOptions.onClick;
        }
      };

      requestPermission();
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  }
}

/**
 * Show a toast notification in the UI
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, warning, info)
 * @param {number} duration - Duration in milliseconds
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Send message to all extension views
  chrome.runtime.sendMessage({
    action: 'showToast',
    message,
    type,
    duration,
  });
}

/**
 * Update backup progress in the UI
 * @param {string} backupId - ID of the backup
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} status - Status message
 */
export function updateBackupProgress(backupId, progress, status) {
  // Send progress update to all extension views
  chrome.runtime.sendMessage({
    action: 'updateBackupProgress',
    backupId,
    progress,
    status,
  });
}

/**
 * Show backup completion notification
 * @param {Object} backup - Backup metadata
 * @param {boolean} success - Whether backup was successful
 * @param {string} message - Optional message to display
 */
export function showBackupNotification(backup, success, message) {
  const backupType = backup.type === 'scheduled' ? 'Scheduled' : 'Manual';
  const title = success ? 'Backup Complete' : 'Backup Failed';
  const defaultMessage = success
    ? `${backupType} backup completed successfully`
    : `${backupType} backup failed`;

  // Show browser notification
  showBrowserNotification(title, message || defaultMessage, {
    type: success ? 'success' : 'error',
    requireInteraction: !success, // Require interaction for failures
  });

  // Show toast notification
  showToast(message || defaultMessage, success ? 'success' : 'error');
}

/**
 * Show restoration completion notification
 * @param {Object} backup - Backup metadata
 * @param {boolean} success - Whether restoration was successful
 * @param {string} message - Optional message to display
 */
export function showRestorationNotification(backup, success, message) {
  const backupType = backup.type === 'scheduled' ? 'Scheduled' : 'Manual';
  const formattedDate = new Date(backup.timestamp).toLocaleString();
  const title = success ? 'Restoration Complete' : 'Restoration Failed';
  const defaultMessage = success
    ? `${backupType} backup from ${formattedDate} restored successfully`
    : `Failed to restore ${backupType.toLowerCase()} backup`;

  // Show browser notification
  showBrowserNotification(title, message || defaultMessage, {
    type: success ? 'success' : 'error',
    requireInteraction: !success, // Require interaction for failures
  });

  // Show toast notification
  showToast(message || defaultMessage, success ? 'success' : 'error');
}
