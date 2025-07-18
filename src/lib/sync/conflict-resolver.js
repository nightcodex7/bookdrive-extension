// conflict-resolver.js - Conflict resolution for Global Sync mode

/**
 * Detect conflicts between local and remote bookmark trees
 * @param {Array} localTree
 * @param {Array} remoteTree
 * @returns {Array} Array of conflict items
 */
export function detectConflicts(localTree, remoteTree) {
  const conflicts = [];
  const localMap = createBookmarkMap(localTree);
  const remoteMap = createBookmarkMap(remoteTree);

  // Find conflicts where same ID exists but with different data
  for (const [id, localNode] of localMap) {
    const remoteNode = remoteMap.get(id);
    if (remoteNode) {
      if (localNode.title !== remoteNode.title) {
        conflicts.push({
          id,
          local: localNode,
          remote: remoteNode,
          type: 'title',
        });
      }

      if (localNode.url !== remoteNode.url) {
        conflicts.push({
          id,
          local: localNode,
          remote: remoteNode,
          type: 'url',
        });
      }
    }
  }

  return conflicts;
}

/**
 * Resolve conflicts based on user choices or automatic rules
 * @param {Array} conflicts
 * @param {Array} resolutions
 * @returns {Array} Resolved bookmark nodes
 */
export function resolveConflicts(conflicts, resolutions) {
  const resolvedNodes = [];
  const resolutionMap = new Map(resolutions.map((r) => [r.id, r]));

  for (const conflict of conflicts) {
    const resolution = resolutionMap.get(conflict.id);

    if (!resolution) {
      // Default to local if no resolution specified
      resolvedNodes.push(conflict.remote);
      continue;
    }

    switch (resolution.resolution) {
      case 'local':
        resolvedNodes.push(conflict.local);
        break;
      case 'remote':
        resolvedNodes.push(conflict.remote);
        break;
      case 'merge':
        resolvedNodes.push({
          ...conflict.local,
          ...resolution.mergedData,
        });
        break;
      default:
        resolvedNodes.push(conflict.remote);
        break;
    }
  }

  return resolvedNodes;
}

/**
 * Automatic conflict resolution using timestamp-based strategy
 * @param {Array} conflicts
 * @param {'newest'|'local'|'remote'} strategy
 * @returns {Array} Conflict resolutions
 */
export function autoResolveConflicts(conflicts, strategy = 'newest') {
  return conflicts.map((conflict) => {
    switch (strategy) {
      case 'local':
        return { id: conflict.id, resolution: 'local' };
      case 'remote':
        return { id: conflict.id, resolution: 'remote' };
      case 'newest':
      default:
        // For now, prefer remote (could be enhanced with actual timestamps)
        return { id: conflict.id, resolution: 'remote' };
    }
  });
}

/**
 * Create a map of bookmark ID to bookmark node for efficient lookup
 * @param {Array} tree
 * @returns {Map} Map of bookmark ID to bookmark node
 */
function createBookmarkMap(tree) {
  const map = new Map();

  function traverse(nodes) {
    for (const node of nodes) {
      map.set(node.id, node);
      if (node.children) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return map;
}
