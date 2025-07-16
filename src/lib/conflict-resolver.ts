// conflict-resolver.ts - Conflict resolution for Global Sync mode

import type { BookmarkNode } from '../types/bookmarks';

export interface ConflictItem {
  id: string;
  local: BookmarkNode;
  remote: BookmarkNode;
  type: 'title' | 'url' | 'position';
}

export interface ConflictResolution {
  id: string;
  resolution: 'local' | 'remote' | 'merge';
  mergedData?: Partial<BookmarkNode>;
}

/**
 * Detect conflicts between local and remote bookmark trees
 */
export function detectConflicts(
  localTree: BookmarkNode[],
  remoteTree: BookmarkNode[]
): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
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
 */
export function resolveConflicts(
  conflicts: ConflictItem[],
  resolutions: ConflictResolution[]
): BookmarkNode[] {
  const resolvedNodes: BookmarkNode[] = [];
  const resolutionMap = new Map(resolutions.map(r => [r.id, r]));

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
 */
export function autoResolveConflicts(
  conflicts: ConflictItem[],
  strategy: 'newest' | 'local' | 'remote' = 'newest'
): ConflictResolution[] {
  return conflicts.map(conflict => {
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
 */
function createBookmarkMap(tree: BookmarkNode[]): Map<string, BookmarkNode> {
  const map = new Map<string, BookmarkNode>();
  
  function traverse(nodes: BookmarkNode[]) {
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