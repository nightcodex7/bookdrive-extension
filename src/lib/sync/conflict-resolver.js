/**
 * Conflict Resolver Module
 * Provides visual merge tools for resolving bookmark conflicts
 */

/**
 * Conflict resolution strategies
 */
export const CONFLICT_STRATEGIES = {
  LOCAL_WINS: 'local',
  REMOTE_WINS: 'remote',
  MERGE: 'merge',
  MANUAL: 'manual',
  // Advanced strategies
  INTELLIGENT_MERGE: 'intelligent_merge',
  TIMESTAMP_BASED: 'timestamp_based',
  CONTENT_AWARE: 'content_aware',
  USER_PREFERENCE: 'user_preference',
  AUTO_RESOLVE: 'auto_resolve',
};

/**
 * Conflict severity levels
 */
export const CONFLICT_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Conflict types
 */
export const CONFLICT_TYPES = {
  TITLE_ONLY: 'title_only',
  URL_ONLY: 'url_only',
  FOLDER_ONLY: 'folder_only',
  MIXED: 'mixed',
  DELETION_CONFLICT: 'deletion_conflict',
  DUPLICATE: 'duplicate',
  PERMISSION: 'permission',
};

/**
 * Advanced conflict resolution configuration
 */
export const CONFLICT_CONFIG = {
  // Intelligent merge settings
  INTELLIGENT_MERGE: {
    preserveLocalNotes: true,
    preserveRemoteTags: true,
    mergeTitles: true,
    preferLongerTitle: true,
    preserveBothURLs: false,
  },
  
  // Timestamp-based resolution
  TIMESTAMP_BASED: {
    timeThreshold: 300000, // 5 minutes in milliseconds
    preferNewer: true,
    considerUserActivity: true,
  },
  
  // Content-aware resolution
  CONTENT_AWARE: {
    detectDuplicates: true,
    similarityThreshold: 0.8,
    preferCompleteData: true,
    validateURLs: true,
  },
  
  // Auto-resolve settings
  AUTO_RESOLVE: {
    enableForLowSeverity: true,
    enableForMediumSeverity: false,
    enableForHighSeverity: false,
    enableForCriticalSeverity: false,
    maxAutoResolvePerSync: 10,
  },
};

/**
 * Resolve conflicts automatically
 * @param {Array} conflicts - Array of conflict objects
 * @param {string} strategy - Resolution strategy
 * @returns {Object} Resolution result
 */
export function resolveConflicts(conflicts, strategy = CONFLICT_STRATEGIES.LOCAL_WINS) {
  const resolved = [];
  const unresolved = [];

  for (const conflict of conflicts) {
    const resolution = resolveConflict(conflict, strategy);
    if (resolution.resolved) {
      resolved.push(resolution.bookmark);
    } else {
      unresolved.push(conflict);
    }
  }

  return {
    resolved,
    unresolved,
    strategy,
    totalConflicts: conflicts.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
  };
}

/**
 * Resolve a single conflict
 * @param {Object} conflict - Conflict object
 * @param {string} strategy - Resolution strategy
 * @returns {Object} Resolution result
 */
function resolveConflict(conflict, strategy) {
  const { local, remote } = conflict;

  switch (strategy) {
    case CONFLICT_STRATEGIES.LOCAL_WINS:
      return {
        resolved: true,
        bookmark: local,
        reason: 'Local version chosen',
      };

    case CONFLICT_STRATEGIES.REMOTE_WINS:
      return {
        resolved: true,
        bookmark: remote,
        reason: 'Remote version chosen',
      };

    case CONFLICT_STRATEGIES.MERGE:
      return mergeBookmarks(local, remote);

    case CONFLICT_STRATEGIES.MANUAL:
      return {
        resolved: false,
        bookmark: null,
        reason: 'Requires manual resolution',
      };

    default:
      return {
        resolved: false,
        bookmark: null,
        reason: 'Unknown strategy',
      };
  }
}

/**
 * Merge two bookmarks intelligently
 * @param {Object} local - Local bookmark
 * @param {Object} remote - Remote bookmark
 * @returns {Object} Merged bookmark
 */
function mergeBookmarks(local, remote) {
  // Compare modification times
  const localTime = new Date(local.dateModified || 0).getTime();
  const remoteTime = new Date(remote.dateModified || 0).getTime();

  // If one is significantly newer, prefer it
  if (Math.abs(localTime - remoteTime) > 60000) {
    // 1 minute threshold
    const newer = localTime > remoteTime ? local : remote;
    return {
      resolved: true,
      bookmark: newer,
      reason: 'Newer version chosen',
    };
  }

  // Otherwise, merge intelligently
  const merged = { ...local };

  // Merge title - prefer non-empty, longer title
  if (!local.title && remote.title) {
    merged.title = remote.title;
  } else if (local.title && remote.title && remote.title.length > local.title.length) {
    merged.title = remote.title;
  }

  // Merge URL - prefer non-empty URL
  if (!local.url && remote.url) {
    merged.url = remote.url;
  }

  // Merge dateAdded - use earliest
  const localAdded = new Date(local.dateAdded || 0).getTime();
  const remoteAdded = new Date(remote.dateAdded || 0).getTime();
  merged.dateAdded = localAdded < remoteAdded ? local.dateAdded : remote.dateAdded;

  // Merge dateModified - use latest
  merged.dateModified = localTime > remoteTime ? local.dateModified : remote.dateModified;

  // Merge parentId - prefer local if both exist
  if (local.parentId && remote.parentId) {
    merged.parentId = local.parentId;
  } else if (remote.parentId) {
    merged.parentId = remote.parentId;
  }

  return {
    resolved: true,
    bookmark: merged,
    reason: 'Intelligently merged',
  };
}

/**
 * Resolve conflicts with advanced strategies
 * @param {Array} conflicts - Array of conflict objects
 * @param {string} strategy - Resolution strategy
 * @param {Object} options - Advanced options
 * @returns {Object} Resolution result
 */
export async function resolveConflictsAdvanced(conflicts, strategy = CONFLICT_STRATEGIES.INTELLIGENT_MERGE, options = {}) {
  const resolved = [];
  const unresolved = [];
  const resolutionHistory = [];
  const stats = {
    totalConflicts: conflicts.length,
    resolvedCount: 0,
    unresolvedCount: 0,
    strategy,
    timestamp: new Date().toISOString(),
  };

  // Categorize conflicts by severity and type
  const categorizedConflicts = await categorizeConflicts(conflicts);
  
  for (const conflict of conflicts) {
    const conflictInfo = await analyzeConflict(conflict);
    const resolution = await resolveConflictAdvanced(conflict, strategy, options, conflictInfo);
    
    if (resolution.resolved) {
      resolved.push(resolution.bookmark);
      stats.resolvedCount++;
    } else {
      unresolved.push(conflict);
      stats.unresolvedCount++;
    }
    
    resolutionHistory.push({
      conflictId: conflict.id,
      strategy: resolution.strategy,
      reason: resolution.reason,
      timestamp: new Date().toISOString(),
      severity: conflictInfo.severity,
      type: conflictInfo.type,
    });
  }

  // Save resolution history
  await saveResolutionHistory(resolutionHistory);

  return {
    resolved,
    unresolved,
    strategy,
    stats,
    resolutionHistory,
    categorizedConflicts,
  };
}

/**
 * Analyze conflict to determine type and severity
 * @param {Object} conflict - Conflict object
 * @returns {Object} Conflict analysis
 */
async function analyzeConflict(conflict) {
  const { local, remote } = conflict;
  
  // Determine conflict type
  let type = CONFLICT_TYPES.MIXED;
  let severity = CONFLICT_SEVERITY.MEDIUM;
  
  // Check for deletion conflicts
  if (!local && remote) {
    type = CONFLICT_TYPES.DELETION_CONFLICT;
    severity = CONFLICT_SEVERITY.HIGH;
  } else if (local && !remote) {
    type = CONFLICT_TYPES.DELETION_CONFLICT;
    severity = CONFLICT_SEVERITY.HIGH;
  }
  // Check for title-only conflicts
  else if (local.title !== remote.title && 
           local.url === remote.url && 
           local.parentId === remote.parentId) {
    type = CONFLICT_TYPES.TITLE_ONLY;
    severity = CONFLICT_SEVERITY.LOW;
  }
  // Check for URL-only conflicts
  else if (local.url !== remote.url && 
           local.title === remote.title && 
           local.parentId === remote.parentId) {
    type = CONFLICT_TYPES.URL_ONLY;
    severity = CONFLICT_SEVERITY.MEDIUM;
  }
  // Check for folder-only conflicts
  else if (local.parentId !== remote.parentId && 
           local.title === remote.title && 
           local.url === remote.url) {
    type = CONFLICT_TYPES.FOLDER_ONLY;
    severity = CONFLICT_SEVERITY.LOW;
  }
  
  // Check for duplicates
  if (await isDuplicateConflict(conflict)) {
    type = CONFLICT_TYPES.DUPLICATE;
    severity = CONFLICT_SEVERITY.LOW;
  }
  
  // Adjust severity based on content analysis
  if (await hasCriticalChanges(conflict)) {
    severity = CONFLICT_SEVERITY.CRITICAL;
  }
  
  return {
    type,
    severity,
    localChanges: await getChangeSummary(local, remote),
    remoteChanges: await getChangeSummary(remote, local),
    similarity: await calculateSimilarity(local, remote),
  };
}

/**
 * Resolve a single conflict with advanced strategies
 * @param {Object} conflict - Conflict object
 * @param {string} strategy - Resolution strategy
 * @param {Object} options - Advanced options
 * @param {Object} conflictInfo - Conflict analysis
 * @returns {Object} Resolution result
 */
async function resolveConflictAdvanced(conflict, strategy, options, conflictInfo) {
  const { local, remote } = conflict;
  
  switch (strategy) {
    case CONFLICT_STRATEGIES.INTELLIGENT_MERGE:
      return await intelligentMerge(conflict, options, conflictInfo);
      
    case CONFLICT_STRATEGIES.TIMESTAMP_BASED:
      return await timestampBasedResolution(conflict, options, conflictInfo);
      
    case CONFLICT_STRATEGIES.CONTENT_AWARE:
      return await contentAwareResolution(conflict, options, conflictInfo);
      
    case CONFLICT_STRATEGIES.USER_PREFERENCE:
      return await userPreferenceResolution(conflict, options, conflictInfo);
      
    case CONFLICT_STRATEGIES.AUTO_RESOLVE:
      return await autoResolve(conflict, options, conflictInfo);
      
    default:
      return resolveConflict(conflict, strategy);
  }
}

/**
 * Intelligent merge strategy
 * @param {Object} conflict - Conflict object
 * @param {Object} options - Merge options
 * @param {Object} conflictInfo - Conflict analysis
 * @returns {Object} Resolution result
 */
async function intelligentMerge(conflict, options, conflictInfo) {
  const { local, remote } = conflict;
  const config = { ...CONFLICT_CONFIG.INTELLIGENT_MERGE, ...options };
  
  try {
    const mergedBookmark = { ...local };
    
    // Merge titles intelligently
    if (config.mergeTitles && local.title !== remote.title) {
      if (config.preferLongerTitle) {
        mergedBookmark.title = local.title.length > remote.title.length ? local.title : remote.title;
      } else {
        // Combine titles if they're complementary
        const combinedTitle = `${local.title} | ${remote.title}`;
        if (combinedTitle.length <= 100) { // Reasonable length limit
          mergedBookmark.title = combinedTitle;
        } else {
          mergedBookmark.title = local.title; // Fallback to local
        }
      }
    }
    
    // Merge notes if available
    if (config.preserveLocalNotes) {
      const localNotes = await getBookmarkNotes(local.id);
      const remoteNotes = await getBookmarkNotes(remote.id);
      
      if (localNotes && remoteNotes && localNotes !== remoteNotes) {
        mergedBookmark.notes = `${localNotes}\n\n---\n\n${remoteNotes}`;
      } else if (localNotes) {
        mergedBookmark.notes = localNotes;
      } else if (remoteNotes) {
        mergedBookmark.notes = remoteNotes;
      }
    }
    
    // Merge tags
    if (config.preserveRemoteTags) {
      const localTags = await getBookmarkTags(local.id);
      const remoteTags = await getBookmarkTags(remote.id);
      
      const allTags = [...new Set([...localTags, ...remoteTags])];
      mergedBookmark.tags = allTags;
    }
    
    // Handle URL conflicts
    if (local.url !== remote.url) {
      if (config.preserveBothURLs) {
        // Store both URLs in notes or metadata
        const urlNote = `Original URL: ${local.url}\nAlternative URL: ${remote.url}`;
        mergedBookmark.notes = mergedBookmark.notes ? `${mergedBookmark.notes}\n\n${urlNote}` : urlNote;
        mergedBookmark.url = local.url; // Keep local as primary
      } else {
        // Validate URLs and choose the better one
        const localUrlValid = await validateURL(local.url);
        const remoteUrlValid = await validateURL(remote.url);
        
        if (localUrlValid && !remoteUrlValid) {
          mergedBookmark.url = local.url;
        } else if (!localUrlValid && remoteUrlValid) {
          mergedBookmark.url = remote.url;
        } else {
          mergedBookmark.url = local.url; // Default to local
        }
      }
    }
    
    // Update metadata
    mergedBookmark.lastModified = Date.now();
    mergedBookmark.mergeInfo = {
      mergedAt: new Date().toISOString(),
      strategy: 'intelligent_merge',
      conflictType: conflictInfo.type,
    };
    
    return {
      resolved: true,
      bookmark: mergedBookmark,
      reason: 'Intelligently merged local and remote versions',
      strategy: CONFLICT_STRATEGIES.INTELLIGENT_MERGE,
    };
  } catch (error) {
    console.error('Intelligent merge failed:', error);
    return {
      resolved: false,
      bookmark: null,
      reason: 'Intelligent merge failed: ' + error.message,
      strategy: CONFLICT_STRATEGIES.INTELLIGENT_MERGE,
    };
  }
}

/**
 * Timestamp-based resolution strategy
 * @param {Object} conflict - Conflict object
 * @param {Object} options - Resolution options
 * @param {Object} conflictInfo - Conflict analysis
 * @returns {Object} Resolution result
 */
async function timestampBasedResolution(conflict, options, conflictInfo) {
  const { local, remote } = conflict;
  const config = { ...CONFLICT_CONFIG.TIMESTAMP_BASED, ...options };
  
  try {
    const localTime = new Date(local.dateAdded || local.lastModified || 0);
    const remoteTime = new Date(remote.dateAdded || remote.lastModified || 0);
    const timeDiff = Math.abs(localTime.getTime() - remoteTime.getTime());
    
    let selectedBookmark;
    let reason;
    
    if (timeDiff <= config.timeThreshold) {
      // Changes are close in time, consider user activity
      if (config.considerUserActivity) {
        const userActivity = await getUserActivity();
        selectedBookmark = userActivity.preferLocal ? local : remote;
        reason = 'Selected based on user activity patterns';
      } else {
        selectedBookmark = config.preferNewer ? 
          (localTime > remoteTime ? local : remote) : 
          (localTime < remoteTime ? local : remote);
        reason = `Selected ${config.preferNewer ? 'newer' : 'older'} version based on timestamp`;
      }
    } else {
      // Significant time difference, use timestamp-based selection
      selectedBookmark = config.preferNewer ? 
        (localTime > remoteTime ? local : remote) : 
        (localTime < remoteTime ? local : remote);
      reason = `Selected ${config.preferNewer ? 'newer' : 'older'} version (${timeDiff}ms difference)`;
    }
    
    selectedBookmark.lastModified = Date.now();
    selectedBookmark.resolveInfo = {
      resolvedAt: new Date().toISOString(),
      strategy: 'timestamp_based',
      reason,
      conflictType: conflictInfo.type,
    };
    
    return {
      resolved: true,
      bookmark: selectedBookmark,
      reason,
      strategy: CONFLICT_STRATEGIES.TIMESTAMP_BASED,
    };
  } catch (error) {
    console.error('Timestamp-based resolution failed:', error);
    return {
      resolved: false,
      bookmark: null,
      reason: 'Timestamp-based resolution failed: ' + error.message,
      strategy: CONFLICT_STRATEGIES.TIMESTAMP_BASED,
    };
  }
}

/**
 * Content-aware resolution strategy
 * @param {Object} conflict - Conflict object
 * @param {Object} options - Resolution options
 * @param {Object} conflictInfo - Conflict analysis
 * @returns {Object} Resolution result
 */
async function contentAwareResolution(conflict, options, conflictInfo) {
  const { local, remote } = conflict;
  const config = { ...CONFLICT_CONFIG.CONTENT_AWARE, ...options };
  
  try {
    let selectedBookmark;
    let reason;
    
    // Check for duplicates
    if (config.detectDuplicates && conflictInfo.similarity >= config.similarityThreshold) {
      // Treat as duplicate, keep the more complete version
      const localCompleteness = await calculateCompleteness(local);
      const remoteCompleteness = await calculateCompleteness(remote);
      
      selectedBookmark = localCompleteness >= remoteCompleteness ? local : remote;
      reason = `Selected more complete version (similarity: ${conflictInfo.similarity.toFixed(2)})`;
    }
    // Validate URLs
    else if (config.validateURLs) {
      const localUrlValid = await validateURL(local.url);
      const remoteUrlValid = await validateURL(remote.url);
      
      if (localUrlValid && !remoteUrlValid) {
        selectedBookmark = local;
        reason = 'Selected local version (valid URL)';
      } else if (!localUrlValid && remoteUrlValid) {
        selectedBookmark = remote;
        reason = 'Selected remote version (valid URL)';
      } else if (localUrlValid && remoteUrlValid) {
        // Both URLs are valid, prefer more complete data
        if (config.preferCompleteData) {
          const localCompleteness = await calculateCompleteness(local);
          const remoteCompleteness = await calculateCompleteness(remote);
          selectedBookmark = localCompleteness >= remoteCompleteness ? local : remote;
          reason = 'Selected more complete version';
        } else {
          selectedBookmark = local; // Default to local
          reason = 'Selected local version (both URLs valid)';
        }
      } else {
        // Neither URL is valid, keep local
        selectedBookmark = local;
        reason = 'Selected local version (neither URL valid)';
      }
    }
    // Default to completeness-based selection
    else if (config.preferCompleteData) {
      const localCompleteness = await calculateCompleteness(local);
      const remoteCompleteness = await calculateCompleteness(remote);
      selectedBookmark = localCompleteness >= remoteCompleteness ? local : remote;
      reason = 'Selected more complete version';
    } else {
      selectedBookmark = local; // Default to local
      reason = 'Selected local version (default)';
    }
    
    selectedBookmark.lastModified = Date.now();
    selectedBookmark.resolveInfo = {
      resolvedAt: new Date().toISOString(),
      strategy: 'content_aware',
      reason,
      conflictType: conflictInfo.type,
      similarity: conflictInfo.similarity,
    };
    
    return {
      resolved: true,
      bookmark: selectedBookmark,
      reason,
      strategy: CONFLICT_STRATEGIES.CONTENT_AWARE,
    };
  } catch (error) {
    console.error('Content-aware resolution failed:', error);
    return {
      resolved: false,
      bookmark: null,
      reason: 'Content-aware resolution failed: ' + error.message,
      strategy: CONFLICT_STRATEGIES.CONTENT_AWARE,
    };
  }
}

/**
 * User preference-based resolution strategy
 * @param {Object} conflict - Conflict object
 * @param {Object} options - Resolution options
 * @param {Object} conflictInfo - Conflict analysis
 * @returns {Object} Resolution result
 */
async function userPreferenceResolution(conflict, options, conflictInfo) {
  try {
    // Get user preferences for conflict resolution
    const userPreferences = await getUserConflictPreferences();
    
    let selectedBookmark;
    let reason;
    
    switch (conflictInfo.type) {
      case CONFLICT_TYPES.TITLE_ONLY:
        selectedBookmark = userPreferences.preferLocalTitles ? conflict.local : conflict.remote;
        reason = `Selected ${userPreferences.preferLocalTitles ? 'local' : 'remote'} title based on user preference`;
        break;
        
      case CONFLICT_TYPES.URL_ONLY:
        selectedBookmark = userPreferences.preferLocalURLs ? conflict.local : conflict.remote;
        reason = `Selected ${userPreferences.preferLocalURLs ? 'local' : 'remote'} URL based on user preference`;
        break;
        
      case CONFLICT_TYPES.FOLDER_ONLY:
        selectedBookmark = userPreferences.preferLocalFolders ? conflict.local : conflict.remote;
        reason = `Selected ${userPreferences.preferLocalFolders ? 'local' : 'remote'} folder based on user preference`;
        break;
        
      default:
        selectedBookmark = userPreferences.defaultPreference === 'local' ? conflict.local : conflict.remote;
        reason = `Selected ${userPreferences.defaultPreference} version based on user preference`;
    }
    
    selectedBookmark.lastModified = Date.now();
    selectedBookmark.resolveInfo = {
      resolvedAt: new Date().toISOString(),
      strategy: 'user_preference',
      reason,
      conflictType: conflictInfo.type,
    };
    
    return {
      resolved: true,
      bookmark: selectedBookmark,
      reason,
      strategy: CONFLICT_STRATEGIES.USER_PREFERENCE,
    };
  } catch (error) {
    console.error('User preference resolution failed:', error);
    return {
      resolved: false,
      bookmark: null,
      reason: 'User preference resolution failed: ' + error.message,
      strategy: CONFLICT_STRATEGIES.USER_PREFERENCE,
    };
  }
}

/**
 * Auto-resolve strategy for low-severity conflicts
 * @param {Object} conflict - Conflict object
 * @param {Object} options - Resolution options
 * @param {Object} conflictInfo - Conflict analysis
 * @returns {Object} Resolution result
 */
async function autoResolve(conflict, options, conflictInfo) {
  const config = { ...CONFLICT_CONFIG.AUTO_RESOLVE, ...options };
  
  try {
    // Check if auto-resolve is enabled for this severity
    const autoResolveEnabled = {
      [CONFLICT_SEVERITY.LOW]: config.enableForLowSeverity,
      [CONFLICT_SEVERITY.MEDIUM]: config.enableForMediumSeverity,
      [CONFLICT_SEVERITY.HIGH]: config.enableForHighSeverity,
      [CONFLICT_SEVERITY.CRITICAL]: config.enableForCriticalSeverity,
    }[conflictInfo.severity];
    
    if (!autoResolveEnabled) {
      return {
        resolved: false,
        bookmark: null,
        reason: `Auto-resolve disabled for ${conflictInfo.severity} severity conflicts`,
        strategy: CONFLICT_STRATEGIES.AUTO_RESOLVE,
      };
    }
    
    // Check auto-resolve limits
    const autoResolveCount = await getAutoResolveCount();
    if (autoResolveCount >= config.maxAutoResolvePerSync) {
      return {
        resolved: false,
        bookmark: null,
        reason: `Auto-resolve limit reached (${config.maxAutoResolvePerSync})`,
        strategy: CONFLICT_STRATEGIES.AUTO_RESOLVE,
      };
    }
    
    // Use intelligent merge for auto-resolve
    const resolution = await intelligentMerge(conflict, options, conflictInfo);
    
    if (resolution.resolved) {
      await incrementAutoResolveCount();
    }
    
    return {
      ...resolution,
      strategy: CONFLICT_STRATEGIES.AUTO_RESOLVE,
    };
  } catch (error) {
    console.error('Auto-resolve failed:', error);
    return {
      resolved: false,
      bookmark: null,
      reason: 'Auto-resolve failed: ' + error.message,
      strategy: CONFLICT_STRATEGIES.AUTO_RESOLVE,
    };
  }
}

/**
 * Generate conflict summary for display
 * @param {Array} conflicts - Array of conflicts
 * @returns {Object} Summary
 */
export function generateConflictSummary(conflicts) {
  const summary = {
    total: conflicts.length,
    byType: {
      title: 0,
      url: 0,
      folder: 0,
      mixed: 0,
    },
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0,
    },
  };

  for (const conflict of conflicts) {
    const conflictType = analyzeConflictType(conflict);
    const severity = analyzeConflictSeverity(conflict);

    summary.byType[conflictType]++;
    summary.bySeverity[severity]++;
  }

  return summary;
}

/**
 * Analyze conflict type
 * @param {Object} conflict - Conflict object
 * @returns {string} Conflict type
 */
function analyzeConflictType(conflict) {
  const { local, remote } = conflict;

  const titleChanged = local.title !== remote.title;
  const urlChanged = local.url !== remote.url;
  const folderChanged = local.parentId !== remote.parentId;

  if (titleChanged && urlChanged && folderChanged) {
    return 'mixed';
  } else if (folderChanged) {
    return 'folder';
  } else if (urlChanged) {
    return 'url';
  } else if (titleChanged) {
    return 'title';
  }

  return 'mixed';
}

/**
 * Analyze conflict severity
 * @param {Object} conflict - Conflict object
 * @returns {string} Severity level
 */
function analyzeConflictSeverity(conflict) {
  const { local, remote } = conflict;

  // High severity: URL changes
  if (local.url !== remote.url) {
    return 'high';
  }

  // Medium severity: Title changes
  if (local.title !== remote.title) {
    return 'medium';
  }

  // Low severity: Folder changes or other metadata
  return 'low';
}

/**
 * Get conflict resolution recommendations
 * @param {Array} conflicts - Array of conflicts
 * @returns {Array} Recommendations
 */
export function getConflictRecommendations(conflicts) {
  const recommendations = [];
  const summary = generateConflictSummary(conflicts);

  if (summary.total === 0) {
    return recommendations;
  }

  // General recommendations
  if (summary.bySeverity.high > 0) {
    recommendations.push({
      type: 'warning',
      message: `${summary.bySeverity.high} conflicts involve URL changes. Review these carefully.`,
      priority: 'high',
    });
  }

  if (summary.byType.mixed > 0) {
    recommendations.push({
      type: 'info',
      message: `${summary.byType.mixed} conflicts have multiple changes. Consider manual resolution.`,
      priority: 'medium',
    });
  }

  if (summary.total > 10) {
    recommendations.push({
      type: 'info',
      message:
        'Large number of conflicts detected. Consider using automatic resolution strategies.',
      priority: 'medium',
    });
  }

  // Strategy recommendations
  if (summary.bySeverity.low > summary.bySeverity.high) {
    recommendations.push({
      type: 'suggestion',
      message: 'Most conflicts are low severity. Automatic resolution should be safe.',
      priority: 'low',
    });
  }

  return recommendations;
}

/**
 * Categorize conflicts by severity and type
 * @param {Array} conflicts - Array of conflicts
 * @returns {Object} Categorized conflicts
 */
async function categorizeConflicts(conflicts) {
  const categorized = {
    bySeverity: {
      [CONFLICT_SEVERITY.LOW]: [],
      [CONFLICT_SEVERITY.MEDIUM]: [],
      [CONFLICT_SEVERITY.HIGH]: [],
      [CONFLICT_SEVERITY.CRITICAL]: [],
    },
    byType: {
      [CONFLICT_TYPES.TITLE_ONLY]: [],
      [CONFLICT_TYPES.URL_ONLY]: [],
      [CONFLICT_TYPES.FOLDER_ONLY]: [],
      [CONFLICT_TYPES.MIXED]: [],
      [CONFLICT_TYPES.DELETION_CONFLICT]: [],
      [CONFLICT_TYPES.DUPLICATE]: [],
      [CONFLICT_TYPES.PERMISSION]: [],
    },
  };

  for (const conflict of conflicts) {
    const analysis = await analyzeConflict(conflict);
    categorized.bySeverity[analysis.severity].push(conflict);
    categorized.byType[analysis.type].push(conflict);
  }

  return categorized;
}

/**
 * Check if conflict is a duplicate
 * @param {Object} conflict - Conflict object
 * @returns {Promise<boolean>} Whether conflict is a duplicate
 */
async function isDuplicateConflict(conflict) {
  const { local, remote } = conflict;
  
  // Check if URLs are similar
  const urlSimilarity = calculateStringSimilarity(local.url, remote.url);
  
  // Check if titles are similar
  const titleSimilarity = calculateStringSimilarity(local.title, remote.title);
  
  // Consider it a duplicate if both URL and title are very similar
  return urlSimilarity > 0.9 && titleSimilarity > 0.8;
}

/**
 * Check if conflict has critical changes
 * @param {Object} conflict - Conflict object
 * @returns {Promise<boolean>} Whether conflict has critical changes
 */
async function hasCriticalChanges(conflict) {
  const { local, remote } = conflict;
  
  // Check for deletion conflicts
  if (!local || !remote) {
    return true;
  }
  
  // Check for major URL changes
  if (local.url && remote.url) {
    const localDomain = extractDomain(local.url);
    const remoteDomain = extractDomain(remote.url);
    if (localDomain !== remoteDomain) {
      return true;
    }
  }
  
  // Check for significant title changes
  if (local.title && remote.title) {
    const titleSimilarity = calculateStringSimilarity(local.title, remote.title);
    if (titleSimilarity < 0.3) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get change summary between two bookmarks
 * @param {Object} source - Source bookmark
 * @param {Object} target - Target bookmark
 * @returns {Promise<Object>} Change summary
 */
async function getChangeSummary(source, target) {
  const changes = {};
  
  if (source.title !== target.title) {
    changes.title = { from: target.title, to: source.title };
  }
  
  if (source.url !== target.url) {
    changes.url = { from: target.url, to: source.url };
  }
  
  if (source.parentId !== target.parentId) {
    changes.folder = { from: target.parentId, to: source.parentId };
  }
  
  // Check for notes changes
  const sourceNotes = await getBookmarkNotes(source.id);
  const targetNotes = await getBookmarkNotes(target.id);
  if (sourceNotes !== targetNotes) {
    changes.notes = { from: targetNotes, to: sourceNotes };
  }
  
  // Check for tags changes
  const sourceTags = await getBookmarkTags(source.id);
  const targetTags = await getBookmarkTags(target.id);
  if (JSON.stringify(sourceTags) !== JSON.stringify(targetTags)) {
    changes.tags = { from: targetTags, to: sourceTags };
  }
  
  return changes;
}

/**
 * Calculate similarity between two bookmarks
 * @param {Object} local - Local bookmark
 * @param {Object} remote - Remote bookmark
 * @returns {Promise<number>} Similarity score (0-1)
 */
async function calculateSimilarity(local, remote) {
  let similarity = 0;
  let totalWeight = 0;
  
  // Title similarity (weight: 0.3)
  if (local.title && remote.title) {
    const titleSimilarity = calculateStringSimilarity(local.title, remote.title);
    similarity += titleSimilarity * 0.3;
    totalWeight += 0.3;
  }
  
  // URL similarity (weight: 0.4)
  if (local.url && remote.url) {
    const urlSimilarity = calculateStringSimilarity(local.url, remote.url);
    similarity += urlSimilarity * 0.4;
    totalWeight += 0.4;
  }
  
  // Folder similarity (weight: 0.2)
  if (local.parentId === remote.parentId) {
    similarity += 0.2;
    totalWeight += 0.2;
  }
  
  // Notes similarity (weight: 0.1)
  const localNotes = await getBookmarkNotes(local.id);
  const remoteNotes = await getBookmarkNotes(remote.id);
  if (localNotes && remoteNotes) {
    const notesSimilarity = calculateStringSimilarity(localNotes, remoteNotes);
    similarity += notesSimilarity * 0.1;
    totalWeight += 0.1;
  }
  
  return totalWeight > 0 ? similarity / totalWeight : 0;
}

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) {
    return 0;
  }
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) {
    return 1;
  }
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return 1 - (distance / maxLength);
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Calculate completeness score for a bookmark
 * @param {Object} bookmark - Bookmark object
 * @returns {Promise<number>} Completeness score (0-1)
 */
async function calculateCompleteness(bookmark) {
  let score = 0;
  let totalWeight = 0;
  
  // Title (weight: 0.3)
  if (bookmark.title && bookmark.title.trim()) {
    score += 0.3;
  }
  totalWeight += 0.3;
  
  // URL (weight: 0.4)
  if (bookmark.url && bookmark.url.trim()) {
    score += 0.4;
  }
  totalWeight += 0.4;
  
  // Notes (weight: 0.2)
  const notes = await getBookmarkNotes(bookmark.id);
  if (notes && notes.trim()) {
    score += 0.2;
  }
  totalWeight += 0.2;
  
  // Tags (weight: 0.1)
  const tags = await getBookmarkTags(bookmark.id);
  if (tags && tags.length > 0) {
    score += 0.1;
  }
  totalWeight += 0.1;
  
  return totalWeight > 0 ? score / totalWeight : 0;
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {Promise<boolean>} Whether URL is valid
 */
async function validateURL(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * Get user activity patterns
 * @returns {Promise<Object>} User activity data
 */
async function getUserActivity() {
  try {
    const result = await chrome.storage.local.get('user_activity_patterns');
    return result.user_activity_patterns || {
      preferLocal: true,
      lastSyncTime: Date.now(),
      syncFrequency: 'daily',
    };
  } catch (error) {
    console.error('Failed to get user activity:', error);
    return { preferLocal: true };
  }
}

/**
 * Get user conflict resolution preferences
 * @returns {Promise<Object>} User preferences
 */
async function getUserConflictPreferences() {
  try {
    const result = await chrome.storage.local.get('conflict_preferences');
    return result.conflict_preferences || {
      preferLocalTitles: true,
      preferLocalURLs: true,
      preferLocalFolders: true,
      defaultPreference: 'local',
    };
  } catch (error) {
    console.error('Failed to get conflict preferences:', error);
    return {
      preferLocalTitles: true,
      preferLocalURLs: true,
      preferLocalFolders: true,
      defaultPreference: 'local',
    };
  }
}

/**
 * Save resolution history
 * @param {Array} history - Resolution history
 * @returns {Promise<void>}
 */
async function saveResolutionHistory(history) {
  try {
    const result = await chrome.storage.local.get('conflict_resolution_history');
    const existingHistory = result.conflict_resolution_history || [];
    
    // Keep only last 1000 entries
    const updatedHistory = [...existingHistory, ...history].slice(-1000);
    
    await chrome.storage.local.set({
      conflict_resolution_history: updatedHistory,
    });
  } catch (error) {
    console.error('Failed to save resolution history:', error);
  }
}

/**
 * Get auto-resolve count for current sync
 * @returns {Promise<number>} Auto-resolve count
 */
async function getAutoResolveCount() {
  try {
    const result = await chrome.storage.local.get('auto_resolve_count');
    return result.auto_resolve_count || 0;
  } catch (error) {
    console.error('Failed to get auto-resolve count:', error);
    return 0;
  }
}

/**
 * Increment auto-resolve count
 * @returns {Promise<void>}
 */
async function incrementAutoResolveCount() {
  try {
    const currentCount = await getAutoResolveCount();
    await chrome.storage.local.set({
      auto_resolve_count: currentCount + 1,
    });
  } catch (error) {
    console.error('Failed to increment auto-resolve count:', error);
  }
}

/**
 * Reset auto-resolve count (call at start of sync)
 * @returns {Promise<void>}
 */
export async function resetAutoResolveCount() {
  try {
    await chrome.storage.local.set({
      auto_resolve_count: 0,
    });
  } catch (error) {
    console.error('Failed to reset auto-resolve count:', error);
  }
}

/**
 * Get bookmark notes (import from bookmarks.js)
 * @param {string} bookmarkId - Bookmark ID
 * @returns {Promise<string>} Notes
 */
async function getBookmarkNotes(bookmarkId) {
  try {
    const result = await chrome.storage.local.get(`bookmark_notes_${bookmarkId}`);
    return result[`bookmark_notes_${bookmarkId}`]?.notes || '';
  } catch (error) {
    console.error('Failed to get bookmark notes:', error);
    return '';
  }
}

/**
 * Get bookmark tags (import from bookmarks.js)
 * @param {string} bookmarkId - Bookmark ID
 * @returns {Promise<Array>} Tags
 */
async function getBookmarkTags(bookmarkId) {
  try {
    const result = await chrome.storage.local.get(`bookmark_tags_${bookmarkId}`);
    return result[`bookmark_tags_${bookmarkId}`]?.tags || [];
  } catch (error) {
    console.error('Failed to get bookmark tags:', error);
    return [];
  }
}
