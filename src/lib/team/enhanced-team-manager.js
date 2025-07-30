/**
 * enhanced-team-manager.js - Enhanced Team Management
 * 
 * This module provides enhanced team management features including
 * granular permissions, detailed activity logs, and advanced member management.
 */

import { getAuthToken, ensureBookDriveFolder } from '../auth/drive-auth.js';
import { uploadFile, downloadFile, listFiles } from '../drive.js';
import { getTeamMembers, addTeamMember, removeTeamMember, updateMemberRole } from './team-manager.js';
import { recordTeamActivity } from './team-analytics.js';

// Storage keys
const ENHANCED_TEAM_FILE = 'enhanced_team.json';
const PERMISSIONS_FILE = 'team_permissions.json';
const ACTIVITY_LOGS_FILE = 'detailed_activity_logs.json';

/**
 * Permission levels
 */
export const PERMISSION_LEVELS = {
  NONE: 'none',
  VIEW: 'view',
  COMMENT: 'comment',
  EDIT: 'edit',
  MANAGE: 'manage',
  ADMIN: 'admin',
};

/**
 * Resource types
 */
export const RESOURCE_TYPES = {
  TEAM: 'team',
  FOLDER: 'folder',
  BOOKMARK: 'bookmark',
  COLLECTION: 'collection',
  BACKUP: 'backup',
  ANALYTICS: 'analytics',
};

/**
 * Permission scopes
 */
export const PERMISSION_SCOPES = {
  GLOBAL: 'global',
  RESOURCE: 'resource',
  INHERITED: 'inherited',
  TEMPORARY: 'temporary',
};

/**
 * Activity log levels
 */
export const LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SECURITY: 'security',
  AUDIT: 'audit',
};

/**
 * Get enhanced team configuration
 * @param {Object} options - Options
 * @returns {Promise<Object>} Team configuration
 */
export async function getEnhancedTeamConfig(options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    const folderId = await ensureBookDriveFolder(false);
    if (!folderId) {
      return getDefaultTeamConfig();
    }

    // Get enhanced team configuration
    const files = await listFiles(folderId, token, `name='${ENHANCED_TEAM_FILE}'`);
    
    if (files.length === 0) {
      const defaultConfig = getDefaultTeamConfig();
      await saveEnhancedTeamConfig(defaultConfig);
      return defaultConfig;
    }

    const config = await downloadFile(files[0].id, token);
    return { ...getDefaultTeamConfig(), ...config };
  } catch (error) {
    console.error('Failed to get enhanced team config:', error);
    return getDefaultTeamConfig();
  }
}

/**
 * Update enhanced team configuration
 * @param {Object} updates - Configuration updates
 * @param {Object} options - Update options
 * @returns {Promise<Object>} Updated configuration
 */
export async function updateEnhancedTeamConfig(updates, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Check admin permissions
    if (!await hasPermission(PERMISSION_LEVELS.ADMIN, RESOURCE_TYPES.TEAM)) {
      throw new Error('Admin permission required to update team configuration');
    }

    const currentConfig = await getEnhancedTeamConfig();
    const updatedConfig = {
      ...currentConfig,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: await getCurrentUserEmail(),
    };

    await saveEnhancedTeamConfig(updatedConfig);

    // Log the configuration change
    await logTeamActivity('config_updated', {
      changes: updates,
      previousConfig: currentConfig,
      newConfig: updatedConfig,
    }, LOG_LEVELS.AUDIT);

    return updatedConfig;
  } catch (error) {
    console.error('Failed to update enhanced team config:', error);
    throw error;
  }
}

/**
 * Set granular permissions for a user
 * @param {string} userId - User ID
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID (optional for global permissions)
 * @param {string} permission - Permission level
 * @param {Object} options - Permission options
 * @returns {Promise<Object>} Permission result
 */
export async function setUserPermission(userId, resourceType, resourceId, permission, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    // Check if user has permission to grant this permission
    if (!await canGrantPermission(userId, resourceType, resourceId, permission)) {
      throw new Error('Insufficient permissions to grant this permission');
    }

    const permissionData = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      resourceType,
      resourceId,
      permission,
      scope: options.scope || PERMISSION_SCOPES.RESOURCE,
      grantedBy: await getCurrentUserEmail(),
      grantedAt: new Date().toISOString(),
      expiresAt: options.expiresAt || null,
      conditions: options.conditions || {},
      metadata: options.metadata || {},
    };

    await saveUserPermission(permissionData);

    // Log the permission change
    await logTeamActivity('permission_granted', {
      userId,
      resourceType,
      resourceId,
      permission,
      grantedBy: permissionData.grantedBy,
    }, LOG_LEVELS.AUDIT);

    return {
      success: true,
      permission: permissionData,
      message: `Permission ${permission} granted to ${userId} for ${resourceType}`,
    };
  } catch (error) {
    console.error('Failed to set user permission:', error);
    throw error;
  }
}

/**
 * Get user permissions
 * @param {string} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} User permissions
 */
export async function getUserPermissions(userId, options = {}) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);
    
    // Get permissions file
    const files = await listFiles(folderId, token, `name='${PERMISSIONS_FILE}'`);
    
    if (files.length === 0) {
      return [];
    }
    
    const permissionsData = await downloadFile(files[0].id, token);
    const permissions = permissionsData.permissions || [];
    
    // Filter by user
    let userPermissions = permissions.filter(p => p.userId === userId);
    
    // Filter by resource type if specified
    if (options.resourceType) {
      userPermissions = userPermissions.filter(p => p.resourceType === options.resourceType);
    }
    
    // Filter by resource ID if specified
    if (options.resourceId) {
      userPermissions = userPermissions.filter(p => p.resourceId === options.resourceId);
    }
    
    // Filter expired permissions
    const now = new Date();
    userPermissions = userPermissions.filter(p => {
      if (!p.expiresAt) return true;
      return new Date(p.expiresAt) > now;
    });
    
    return userPermissions;
  } catch (error) {
    console.error('Failed to get user permissions:', error);
    return [];
  }
}

/**
 * Check if user has specific permission
 * @param {string} permission - Required permission
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID (optional)
 * @param {Object} options - Check options
 * @returns {Promise<boolean>} Whether user has permission
 */
export async function hasPermission(permission, resourceType, resourceId = null, options = {}) {
  try {
    const userId = await getCurrentUserEmail();
    const userPermissions = await getUserPermissions(userId, {
      resourceType,
      resourceId,
    });

    // Check for global permissions first
    const globalPermissions = userPermissions.filter(p => p.scope === PERMISSION_SCOPES.GLOBAL);
    const globalPermission = globalPermissions.find(p => 
      getPermissionLevel(p.permission) >= getPermissionLevel(permission)
    );

    if (globalPermission) {
      return true;
    }

    // Check for resource-specific permissions
    const resourcePermissions = userPermissions.filter(p => 
      p.scope === PERMISSION_SCOPES.RESOURCE && p.resourceId === resourceId
    );

    const resourcePermission = resourcePermissions.find(p => 
      getPermissionLevel(p.permission) >= getPermissionLevel(permission)
    );

    if (resourcePermission) {
      return true;
    }

    // Check for inherited permissions
    if (resourceId) {
      const inheritedPermissions = await getInheritedPermissions(userId, resourceType, resourceId);
      const inheritedPermission = inheritedPermissions.find(p => 
        getPermissionLevel(p.permission) >= getPermissionLevel(permission)
      );

      if (inheritedPermission) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Failed to check permission:', error);
    return false;
  }
}

/**
 * Remove user permission
 * @param {string} permissionId - Permission ID
 * @param {Object} options - Remove options
 * @returns {Promise<Object>} Remove result
 */
export async function removeUserPermission(permissionId, options = {}) {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      throw new Error('Authentication required');
    }

    const folderId = await ensureBookDriveFolder(false);
    const files = await listFiles(folderId, token, `name='${PERMISSIONS_FILE}'`);
    
    if (files.length === 0) {
      throw new Error('No permissions found');
    }
    
    const permissionsData = await downloadFile(files[0].id, token);
    const permissions = permissionsData.permissions || [];
    
    const permissionIndex = permissions.findIndex(p => p.id === permissionId);
    if (permissionIndex === -1) {
      throw new Error('Permission not found');
    }
    
    const removedPermission = permissions[permissionIndex];
    
    // Check if user can remove this permission
    if (!await canRemovePermission(removedPermission)) {
      throw new Error('Insufficient permissions to remove this permission');
    }
    
    permissions.splice(permissionIndex, 1);
    permissionsData.permissions = permissions;
    
    await uploadFile(PERMISSIONS_FILE, permissionsData, folderId, token);
    
    // Log the permission removal
    await logTeamActivity('permission_removed', {
      permissionId,
      userId: removedPermission.userId,
      resourceType: removedPermission.resourceType,
      resourceId: removedPermission.resourceId,
      permission: removedPermission.permission,
      removedBy: await getCurrentUserEmail(),
    }, LOG_LEVELS.AUDIT);
    
    return {
      success: true,
      message: 'Permission removed successfully',
      removedPermission,
    };
  } catch (error) {
    console.error('Failed to remove user permission:', error);
    throw error;
  }
}

/**
 * Get detailed activity logs
 * @param {Object} filters - Log filters
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Activity logs
 */
export async function getDetailedActivityLogs(filters = {}, options = {}) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);
    
    // Get activity logs file
    const files = await listFiles(folderId, token, `name='${ACTIVITY_LOGS_FILE}'`);
    
    if (files.length === 0) {
      return [];
    }
    
    const logsData = await downloadFile(files[0].id, token);
    let logs = logsData.logs || [];
    
    // Apply filters
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    
    if (filters.level) {
      logs = logs.filter(log => log.level === filters.level);
    }
    
    if (filters.resourceType) {
      logs = logs.filter(log => log.resourceType === filters.resourceType);
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      logs = logs.filter(log => new Date(log.timestamp) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      logs = logs.filter(log => new Date(log.timestamp) <= endDate);
    }
    
    // Apply sorting
    if (options.sortBy) {
      logs.sort((a, b) => {
        const aValue = a[options.sortBy];
        const bValue = b[options.sortBy];
        
        if (options.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }
    
    // Apply pagination
    if (options.limit) {
      const start = options.offset || 0;
      logs = logs.slice(start, start + options.limit);
    }
    
    return logs;
  } catch (error) {
    console.error('Failed to get detailed activity logs:', error);
    return [];
  }
}

/**
 * Log detailed team activity
 * @param {string} action - Action performed
 * @param {Object} data - Activity data
 * @param {string} level - Log level
 * @param {Object} options - Log options
 * @returns {Promise<void>}
 */
export async function logDetailedActivity(action, data, level = LOG_LEVELS.INFO, options = {}) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);
    
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      level,
      userId: await getCurrentUserEmail(),
      timestamp: new Date().toISOString(),
      deviceId: await getOrCreateDeviceId(),
      sessionId: options.sessionId || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      resourceType: data.resourceType || null,
      resourceId: data.resourceId || null,
      metadata: options.metadata || {},
    };
    
    // Get existing logs
    const files = await listFiles(folderId, token, `name='${ACTIVITY_LOGS_FILE}'`);
    let logsData = { logs: [] };
    
    if (files.length > 0) {
      logsData = await downloadFile(files[0].id, token);
    }
    
    // Add new log entry
    logsData.logs.push(logEntry);
    
    // Keep only last 50000 log entries
    if (logsData.logs.length > 50000) {
      logsData.logs = logsData.logs.slice(-50000);
    }
    
    // Save updated logs
    await uploadFile(ACTIVITY_LOGS_FILE, logsData, folderId, token);
    
    console.log('Detailed activity logged:', logEntry);
  } catch (error) {
    console.error('Failed to log detailed activity:', error);
  }
}

/**
 * Get team member activity summary
 * @param {string} userId - User ID
 * @param {Object} options - Summary options
 * @returns {Promise<Object>} Activity summary
 */
export async function getMemberActivitySummary(userId, options = {}) {
  try {
    const period = options.period || 'month';
    const startDate = options.startDate || getPeriodStartDate(period);
    const endDate = options.endDate || new Date();
    
    // Get activity logs for the user
    const logs = await getDetailedActivityLogs({
      userId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    // Calculate summary statistics
    const summary = {
      userId,
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalActivities: logs.length,
      activityByLevel: {},
      activityByResource: {},
      activityByAction: {},
      recentActivity: logs.slice(-10),
    };
    
    // Group by log level
    logs.forEach(log => {
      summary.activityByLevel[log.level] = (summary.activityByLevel[log.level] || 0) + 1;
    });
    
    // Group by resource type
    logs.forEach(log => {
      if (log.resourceType) {
        summary.activityByResource[log.resourceType] = (summary.activityByResource[log.resourceType] || 0) + 1;
      }
    });
    
    // Group by action
    logs.forEach(log => {
      summary.activityByAction[log.action] = (summary.activityByAction[log.action] || 0) + 1;
    });
    
    return summary;
  } catch (error) {
    console.error('Failed to get member activity summary:', error);
    return {
      userId,
      totalActivities: 0,
      activityByLevel: {},
      activityByResource: {},
      activityByAction: {},
      recentActivity: [],
    };
  }
}

/**
 * Get team-wide activity analytics
 * @param {Object} options - Analytics options
 * @returns {Promise<Object>} Activity analytics
 */
export async function getTeamActivityAnalytics(options = {}) {
  try {
    const period = options.period || 'month';
    const startDate = options.startDate || getPeriodStartDate(period);
    const endDate = options.endDate || new Date();
    
    // Get all activity logs for the period
    const logs = await getDetailedActivityLogs({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
    
    // Get team members
    const teamMembers = await getTeamMembers();
    
    // Calculate analytics
    const analytics = {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalActivities: logs.length,
      uniqueUsers: new Set(logs.map(log => log.userId)).size,
      totalMembers: teamMembers.length,
      activityByLevel: {},
      activityByResource: {},
      activityByUser: {},
      activityTrends: calculateActivityTrends(logs, period),
      topActions: getTopActions(logs),
      securityEvents: getSecurityEvents(logs),
    };
    
    // Group by log level
    logs.forEach(log => {
      analytics.activityByLevel[log.level] = (analytics.activityByLevel[log.level] || 0) + 1;
    });
    
    // Group by resource type
    logs.forEach(log => {
      if (log.resourceType) {
        analytics.activityByResource[log.resourceType] = (analytics.activityByResource[log.resourceType] || 0) + 1;
      }
    });
    
    // Group by user
    logs.forEach(log => {
      analytics.activityByUser[log.userId] = (analytics.activityByUser[log.userId] || 0) + 1;
    });
    
    return analytics;
  } catch (error) {
    console.error('Failed to get team activity analytics:', error);
    return {
      totalActivities: 0,
      uniqueUsers: 0,
      totalMembers: 0,
      activityByLevel: {},
      activityByResource: {},
      activityByUser: {},
      activityTrends: {},
      topActions: [],
      securityEvents: [],
    };
  }
}

// Helper functions

/**
 * Get default team configuration
 * @returns {Object} Default configuration
 */
function getDefaultTeamConfig() {
  return {
    id: `team_${Date.now()}`,
    name: 'BookDrive Team',
    description: 'Enhanced team configuration',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // Permission settings
    permissions: {
      defaultRole: PERMISSION_LEVELS.VIEW,
      allowInheritance: true,
      requireApproval: false,
      maxPermissionsPerUser: 100,
    },
    
    // Activity logging settings
    logging: {
      enabled: true,
      retentionDays: 365,
      logLevels: [LOG_LEVELS.INFO, LOG_LEVELS.WARNING, LOG_LEVELS.ERROR, LOG_LEVELS.SECURITY, LOG_LEVELS.AUDIT],
      includeMetadata: true,
    },
    
    // Security settings
    security: {
      requireTwoFactor: false,
      sessionTimeout: 3600, // 1 hour
      maxFailedLogins: 5,
      lockoutDuration: 900, // 15 minutes
    },
    
    // Team settings
    team: {
      allowPublicInvites: false,
      requireEmailVerification: true,
      maxMembers: 100,
      allowGuestAccess: false,
    },
  };
}

/**
 * Save enhanced team configuration
 * @param {Object} config - Team configuration
 * @returns {Promise<void>}
 */
async function saveEnhancedTeamConfig(config) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);
    
    await uploadFile(ENHANCED_TEAM_FILE, config, folderId, token);
  } catch (error) {
    console.error('Failed to save enhanced team config:', error);
    throw error;
  }
}

/**
 * Save user permission
 * @param {Object} permission - Permission data
 * @returns {Promise<void>}
 */
async function saveUserPermission(permission) {
  try {
    const token = await getAuthToken(false);
    const folderId = await ensureBookDriveFolder(false);
    
    // Get existing permissions
    const files = await listFiles(folderId, token, `name='${PERMISSIONS_FILE}'`);
    let permissionsData = { permissions: [] };
    
    if (files.length > 0) {
      permissionsData = await downloadFile(files[0].id, token);
    }
    
    // Add new permission
    permissionsData.permissions.push(permission);
    
    // Save updated permissions
    await uploadFile(PERMISSIONS_FILE, permissionsData, folderId, token);
  } catch (error) {
    console.error('Failed to save user permission:', error);
    throw error;
  }
}

/**
 * Get permission level as number
 * @param {string} permission - Permission string
 * @returns {number} Permission level
 */
function getPermissionLevel(permission) {
  const levels = {
    [PERMISSION_LEVELS.NONE]: 0,
    [PERMISSION_LEVELS.VIEW]: 1,
    [PERMISSION_LEVELS.COMMENT]: 2,
    [PERMISSION_LEVELS.EDIT]: 3,
    [PERMISSION_LEVELS.MANAGE]: 4,
    [PERMISSION_LEVELS.ADMIN]: 5,
  };
  
  return levels[permission] || 0;
}

/**
 * Check if user can grant permission
 * @param {string} userId - User ID
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @param {string} permission - Permission to grant
 * @returns {Promise<boolean>} Whether user can grant permission
 */
async function canGrantPermission(userId, resourceType, resourceId, permission) {
  const currentUser = await getCurrentUserEmail();
  
  // Users can't grant permissions higher than their own
  const userPermissions = await getUserPermissions(currentUser, {
    resourceType,
    resourceId,
  });
  
  const maxUserPermission = userPermissions.reduce((max, p) => 
    Math.max(max, getPermissionLevel(p.permission)), 0
  );
  
  return getPermissionLevel(permission) <= maxUserPermission;
}

/**
 * Check if user can remove permission
 * @param {Object} permission - Permission to remove
 * @returns {Promise<boolean>} Whether user can remove permission
 */
async function canRemovePermission(permission) {
  const currentUser = await getCurrentUserEmail();
  
  // Users can remove permissions they granted
  if (permission.grantedBy === currentUser) {
    return true;
  }
  
  // Admins can remove any permission
  return await hasPermission(PERMISSION_LEVELS.ADMIN, RESOURCE_TYPES.TEAM);
}

/**
 * Get inherited permissions
 * @param {string} userId - User ID
 * @param {string} resourceType - Resource type
 * @param {string} resourceId - Resource ID
 * @returns {Promise<Array>} Inherited permissions
 */
async function getInheritedPermissions(userId, resourceType, resourceId) {
  // This would implement permission inheritance logic
  // For now, return empty array
  return [];
}

/**
 * Get period start date
 * @param {string} period - Period type
 * @returns {Date} Start date
 */
function getPeriodStartDate(period) {
  const now = new Date();
  
  switch (period) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case 'week':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      return new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1);
  }
}

/**
 * Calculate activity trends
 * @param {Array} logs - Activity logs
 * @param {string} period - Period type
 * @returns {Object} Activity trends
 */
function calculateActivityTrends(logs, period) {
  const trends = {};
  
  logs.forEach(log => {
    const date = new Date(log.timestamp);
    let key;
    
    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!trends[key]) {
      trends[key] = 0;
    }
    trends[key]++;
  });
  
  return trends;
}

/**
 * Get top actions
 * @param {Array} logs - Activity logs
 * @returns {Array} Top actions
 */
function getTopActions(logs) {
  const actionCounts = {};
  
  logs.forEach(log => {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
  });
  
  return Object.entries(actionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([action, count]) => ({ action, count }));
}

/**
 * Get security events
 * @param {Array} logs - Activity logs
 * @returns {Array} Security events
 */
function getSecurityEvents(logs) {
  return logs.filter(log => 
    log.level === LOG_LEVELS.SECURITY || 
    log.level === LOG_LEVELS.AUDIT
  ).slice(-50); // Last 50 security events
}

/**
 * Log team activity (wrapper for backward compatibility)
 * @param {string} action - Action performed
 * @param {Object} data - Activity data
 * @param {string} level - Log level
 * @returns {Promise<void>}
 */
async function logTeamActivity(action, data, level) {
  await logDetailedActivity(action, data, level);
}

// Placeholder functions
async function getCurrentUserEmail() { return 'user@example.com'; }
async function getOrCreateDeviceId() { return 'device_placeholder'; } 