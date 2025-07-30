/**
 * features.js - Feature Configuration System
 *
 * This module manages feature toggles and provides a centralized way to
 * enable/disable features throughout the extension. When features are disabled,
 * related UI elements are automatically hidden and functionality is disabled.
 */

// Feature definitions with metadata
export const FEATURES = {
  // Core Features (always enabled)
  CORE_SYNC: {
    id: 'core_sync',
    name: 'Core Synchronization',
    description: 'Basic bookmark synchronization functionality',
    category: 'core',
    enabled: true,
    required: true,
    uiElements: ['sync-btn', 'sync-status'],
    dependencies: [],
  },

  // Advanced Features (user-configurable)
  ENCRYPTION: {
    id: 'encryption',
    name: 'End-to-End Encryption',
    description: 'Encrypt bookmarks with AES-GCM encryption',
    category: 'security',
    enabled: false,
    required: false,
    uiElements: ['encryption-toggle', 'passphrase-input', 'encryption-status'],
    dependencies: [],
  },

  TEAM_MODE: {
    id: 'team_mode',
    name: 'Team Mode',
    description: 'Multi-user collaboration and shared folders',
    category: 'collaboration',
    enabled: false,
    required: false,
    uiElements: ['team-toggle', 'shared-folders-btn', 'team-settings'],
    dependencies: [],
  },

  ANALYTICS: {
    id: 'analytics',
    name: 'Sync Analytics',
    description: 'Track sync performance and generate reports',
    category: 'monitoring',
    enabled: false,
    required: false,
    uiElements: ['analytics-toggle', 'view-analytics-btn', 'analytics-settings'],
    dependencies: [],
  },

  CONFLICT_RESOLUTION: {
    id: 'conflict_resolution',
    name: 'Conflict Resolution',
    description: 'Advanced conflict detection and resolution tools',
    category: 'sync',
    enabled: false,
    required: false,
    uiElements: ['resolve-conflicts-btn', 'conflict-settings'],
    dependencies: ['core_sync'],
  },

  SCHEDULED_BACKUPS: {
    id: 'scheduled_backups',
    name: 'Scheduled Backups',
    description: 'Automated backup scheduling and retention policies',
    category: 'backup',
    enabled: false,
    required: false,
    uiElements: ['backup-schedule', 'backup-history-btn', 'backup-settings'],
    dependencies: [],
  },

  SHARED_FOLDERS: {
    id: 'shared_folders',
    name: 'Shared Folders',
    description: 'Create and manage shared bookmark folders',
    category: 'collaboration',
    enabled: false,
    required: false,
    uiElements: ['shared-folders-btn', 'folder-management'],
    dependencies: ['team_mode'],
  },

  SYNC_PREVIEW: {
    id: 'sync_preview',
    name: 'Sync Preview',
    description: 'Preview changes before committing to sync',
    category: 'sync',
    enabled: false,
    required: false,
    uiElements: ['preview-sync-btn', 'preview-settings'],
    dependencies: ['core_sync'],
  },

  ADAPTIVE_SCHEDULING: {
    id: 'adaptive_scheduling',
    name: 'Adaptive Scheduling',
    description: 'Smart scheduling based on system resources',
    category: 'performance',
    enabled: false,
    required: false,
    uiElements: ['adaptive-toggle', 'resource-monitor'],
    dependencies: [],
  },

  PERFORMANCE_OPTIMIZATION: {
    id: 'performance_optimization',
    name: 'Performance Optimization',
    description: 'Delta compression and smart retry mechanisms',
    category: 'performance',
    enabled: false,
    required: false,
    uiElements: ['optimization-toggle', 'performance-settings'],
    dependencies: ['core_sync'],
  },

  // New Features
  BOOKMARK_ORGANIZATION: {
    id: 'bookmark_organization',
    name: 'Bookmark Organization',
    description: 'Tags, notes, and smart folders for better organization',
    category: 'organization',
    enabled: false,
    required: false,
    uiElements: ['organization-toggle', 'tags-manager', 'smart-folders', 'notes-editor'],
    dependencies: [],
  },

  IMPORT_EXPORT: {
    id: 'import_export',
    name: 'Import/Export',
    description: 'Import from and export to other bookmark managers',
    category: 'data',
    enabled: false,
    required: false,
    uiElements: ['import-export-toggle', 'import-btn', 'export-btn', 'format-selector'],
    dependencies: [],
  },

  ENHANCED_TEAM_MANAGEMENT: {
    id: 'enhanced_team_management',
    name: 'Enhanced Team Management',
    description: 'Granular permissions, activity logs, and team dashboards',
    category: 'collaboration',
    enabled: false,
    required: false,
    uiElements: ['team-dashboard', 'permissions-manager', 'activity-logs', 'team-analytics'],
    dependencies: ['team_mode'],
  },

  READ_IT_LATER: {
    id: 'read_it_later',
    name: 'Read-It-Later',
    description: 'Save offline, clutter-free versions of articles',
    category: 'content',
    enabled: false,
    required: false,
    uiElements: ['read-later-toggle', 'offline-reader', 'article-saver'],
    dependencies: [],
  },

  ANNOTATIONS: {
    id: 'annotations',
    name: 'Annotations & Highlighting',
    description: 'Highlight text and add annotations to saved pages',
    category: 'content',
    enabled: false,
    required: false,
    uiElements: ['annotations-toggle', 'highlight-tool', 'notes-panel'],
    dependencies: [],
  },

  PUBLIC_COLLECTIONS: {
    id: 'public_collections',
    name: 'Public Collections',
    description: 'Make bookmark collections public and shareable',
    category: 'collaboration',
    enabled: false,
    required: false,
    uiElements: ['public-toggle', 'share-link', 'collection-visibility'],
    dependencies: ['team_mode'],
  },

  TEAM_ANALYTICS: {
    id: 'team_analytics',
    name: 'Team Analytics',
    description: 'Team-focused dashboards and collaborative analytics',
    category: 'monitoring',
    enabled: false,
    required: false,
    uiElements: ['team-analytics-toggle', 'team-dashboard', 'collaboration-metrics'],
    dependencies: ['team_mode', 'analytics'],
  },
};

// Feature categories
export const FEATURE_CATEGORIES = {
  core: {
    name: 'Core Features',
    description: 'Essential functionality that cannot be disabled',
    icon: 'settings',
  },
  security: {
    name: 'Security',
    description: 'Security and privacy features',
    icon: 'security',
  },
  collaboration: {
    name: 'Collaboration',
    description: 'Team and sharing features',
    icon: 'group',
  },
  monitoring: {
    name: 'Monitoring',
    description: 'Analytics and monitoring features',
    icon: 'analytics',
  },
  sync: {
    name: 'Synchronization',
    description: 'Advanced sync features',
    icon: 'sync',
  },
  backup: {
    name: 'Backup & Recovery',
    description: 'Backup and recovery features',
    icon: 'backup',
  },
  performance: {
    name: 'Performance',
    description: 'Performance optimization features',
    icon: 'speed',
  },
  organization: {
    name: 'Organization',
    description: 'Bookmark organization and management features',
    icon: 'folder',
  },
  data: {
    name: 'Data Management',
    description: 'Import, export, and data handling features',
    icon: 'storage',
  },
  content: {
    name: 'Content Features',
    description: 'Content saving and annotation features',
    icon: 'article',
  },
};

/**
 * Feature Manager Class
 */
class FeatureManager {
  constructor() {
    this.features = { ...FEATURES };
    this.listeners = new Set();
  }

  /**
   * Initialize feature manager
   */
  async initialize() {
    await this.loadFeatureSettings();
    this.applyFeatureStates();
  }

  /**
   * Load feature settings from storage
   */
  async loadFeatureSettings() {
    try {
      const settings = await chrome.storage.sync.get('featureSettings');
      if (settings.featureSettings) {
        Object.keys(settings.featureSettings).forEach((featureId) => {
          if (this.features[featureId]) {
            this.features[featureId].enabled = settings.featureSettings[featureId];
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load feature settings:', error);
    }
  }

  /**
   * Save feature settings to storage
   */
  async saveFeatureSettings() {
    try {
      const settings = {};
      Object.keys(this.features).forEach((featureId) => {
        settings[featureId] = this.features[featureId].enabled;
      });
      await chrome.storage.sync.set({ featureSettings: settings });
    } catch (error) {
      console.warn('Failed to save feature settings:', error);
    }
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(featureId) {
    const feature = this.features[featureId];
    if (!feature) return false;

    // Check if feature is enabled
    if (!feature.enabled) return false;

    // Check dependencies
    for (const dependencyId of feature.dependencies) {
      if (!this.isEnabled(dependencyId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Enable a feature
   */
  async enableFeature(featureId) {
    const feature = this.features[featureId];
    if (!feature || feature.required) return false;

    feature.enabled = true;
    await this.saveFeatureSettings();
    this.applyFeatureStates();
    this.notifyListeners('featureEnabled', featureId);
    return true;
  }

  /**
   * Disable a feature
   */
  async disableFeature(featureId) {
    const feature = this.features[featureId];
    if (!feature || feature.required) return false;

    // Check if other enabled features depend on this feature
    const dependentFeatures = this.getDependentFeatures(featureId);
    if (dependentFeatures.length > 0) {
      throw new Error(
        `Cannot disable ${feature.name} - other features depend on it: ${dependentFeatures.map((f) => f.name).join(', ')}`,
      );
    }

    feature.enabled = false;
    await this.saveFeatureSettings();
    this.applyFeatureStates();
    this.notifyListeners('featureDisabled', featureId);
    return true;
  }

  /**
   * Get features that depend on a specific feature
   */
  getDependentFeatures(featureId) {
    return Object.values(this.features).filter(
      (feature) => feature.dependencies.includes(featureId) && feature.enabled,
    );
  }

  /**
   * Get all enabled features
   */
  getEnabledFeatures() {
    return Object.values(this.features).filter((feature) => this.isEnabled(feature.id));
  }

  /**
   * Get features by category
   */
  getFeaturesByCategory() {
    const categorized = {};
    Object.values(this.features).forEach((feature) => {
      if (!categorized[feature.category]) {
        categorized[feature.category] = [];
      }
      categorized[feature.category].push(feature);
    });
    return categorized;
  }

  /**
   * Apply feature states to UI
   */
  applyFeatureStates() {
    Object.values(this.features).forEach((feature) => {
      const isEnabled = this.isEnabled(feature.id);
      feature.uiElements.forEach((elementId) => {
        const element = document.getElementById(elementId);
        if (element) {
          if (isEnabled) {
            element.style.display = '';
            element.disabled = false;
            element.classList.remove('feature-disabled');
          } else {
            element.style.display = 'none';
            element.disabled = true;
            element.classList.add('feature-disabled');
          }
        }
      });
    });
  }

  /**
   * Add feature state change listener
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove feature state change listener
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify listeners of feature state changes
   */
  notifyListeners(event, featureId) {
    this.listeners.forEach((callback) => {
      try {
        callback(event, featureId, this.features[featureId]);
      } catch (error) {
        console.warn('Feature listener error:', error);
      }
    });
  }

  /**
   * Get feature configuration
   */
  getFeature(featureId) {
    return this.features[featureId];
  }

  /**
   * Get all features
   */
  getAllFeatures() {
    return { ...this.features };
  }

  /**
   * Reset features to defaults
   */
  async resetToDefaults() {
    Object.values(this.features).forEach((feature) => {
      feature.enabled = feature.required;
    });
    await this.saveFeatureSettings();
    this.applyFeatureStates();
    this.notifyListeners('featuresReset');
  }

  /**
   * Export feature configuration
   */
  exportConfiguration() {
    const config = {};
    Object.keys(this.features).forEach((featureId) => {
      config[featureId] = this.features[featureId].enabled;
    });
    return config;
  }

  /**
   * Import feature configuration
   */
  async importConfiguration(config) {
    Object.keys(config).forEach((featureId) => {
      if (this.features[featureId] && !this.features[featureId].required) {
        this.features[featureId].enabled = config[featureId];
      }
    });
    await this.saveFeatureSettings();
    this.applyFeatureStates();
    this.notifyListeners('featuresImported');
  }
}

// Create singleton instance
export const featureManager = new FeatureManager();

// Utility functions
export function isFeatureEnabled(featureId) {
  return featureManager.isEnabled(featureId);
}

export function getEnabledFeatures() {
  return featureManager.getEnabledFeatures();
}

export function getFeaturesByCategory() {
  return featureManager.getFeaturesByCategory();
}

export function enableFeature(featureId) {
  return featureManager.enableFeature(featureId);
}

export function disableFeature(featureId) {
  return featureManager.disableFeature(featureId);
}

// Initialize feature manager when module is loaded
featureManager.initialize().catch(console.error);
