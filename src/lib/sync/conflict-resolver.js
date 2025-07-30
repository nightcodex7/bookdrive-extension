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
