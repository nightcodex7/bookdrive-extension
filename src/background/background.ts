// BookDrive - Service Worker for BookDrive

import { getSettings, Settings } from '../lib/storage';
import { exportBookmarksTree, importBookmarksTree, diffBookmarks } from '../lib/bookmarks';
import {
  downloadBookmarksFile,
  uploadBookmarksFile,
  createManualBackup,
  listBackups,
  restoreFromBackup,
  cleanupBackups,
  pushGlobalLog,
  fetchGlobalLogs,
  LogEntry,
} from '../lib/drive';
import { getTeamMembers, addTeamMember, removeTeamMember } from '../lib/team-manager';
import { detectConflicts, resolveConflicts } from '../lib/conflict-resolver';
import type { SyncEvent } from '../types/sync';

/**
 * Sync job interface for queued syncs.
 */
interface SyncJob {
  pendingSync: boolean;
  lastAttempt: string;
  retryCount: number;
}

/**
 * Sync log event interface for logging sync operations.
 */
interface SyncLogEvent {
  time: string;
  mode: string;
  status: string;
  error?: string;
  details?: unknown;
  bookmarkCount?: number;
  [key: string]: unknown;
}

// Global state
let syncInProgress = false;
let retryTimeout: ReturnType<typeof setTimeout> | undefined;
let backoff = 1;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncPausedForIdle = false;
let lastUploadedHash: number | null = null;

// Constants
const SHORT_INTERVAL = 5; // minutes
const LONG_INTERVAL = 30; // minutes

/**
 * Host-to-Many sync as host.
 */
async function _syncHostToMany(): Promise<void> {
  const settings: Settings = await getSettings();
  const tree = await exportBookmarksTree();
  await _uploadBookmarksFileDedup(
    'host',
    tree as chrome.bookmarks.BookmarkTreeNode[],
    settings.deviceId,
  );
  chrome.storage.local.set({ lastSync: new Date().toISOString(), lastSyncStatus: 'success' });
}

/**
 * Global Sync (two-way peer sync, delta-based).
 */
async function _doGlobalSync(): Promise<void> {
  const settings: Settings = await getSettings();
  const deviceId = settings.deviceId;
  let remoteData: unknown,
    remoteMeta: Record<string, any> = {};
  try {
    remoteData = await downloadBookmarksFile('global');
    if (remoteData && typeof remoteData === 'object' && '_meta' in remoteData) {
      remoteMeta = (remoteData as any)._meta;
      remoteData = (remoteData as any).tree;
    } else if (remoteData && typeof remoteData === 'object' && 'tree' in remoteData) {
      remoteData = (remoteData as any).tree;
    }
  } catch {
    remoteData = null;
  }
  const localTree = await exportBookmarksTree();
  let mergedTree: chrome.bookmarks.BookmarkTreeNode[];
  const now = new Date().toISOString();
  if (!remoteData || !Array.isArray(remoteData)) {
    mergedTree = localTree as chrome.bookmarks.BookmarkTreeNode[];
  } else {
    // Last-write-wins: compare timestamps (delta-aware)
    const localLast = remoteMeta[deviceId]?.lastSync || '';
    const remoteLast =
      Object.values(remoteMeta)
        .map((m: any) => m.lastSync)
        .sort()
        .pop() || '';
    if (localLast > remoteLast) {
      mergedTree = localTree as chrome.bookmarks.BookmarkTreeNode[];
    } else {
      mergedTree = remoteData as chrome.bookmarks.BookmarkTreeNode[];
      await importBookmarksTree(remoteData as chrome.bookmarks.BookmarkTreeNode[], 'replace');
    }
  }
  await _uploadBookmarksFileDedup('global', mergedTree);
  chrome.storage.local.set({ lastSync: now, lastSyncStatus: 'success' });
}

/**
 * Main sync trigger to handle both modes.
 */
async function _doSync(): Promise<void> {
  const settings: Settings = await getSettings();
  if (settings.mode === 'host') {
    await _syncHostToMany();
  } else if (settings.mode === 'global') {
    await _doGlobalSync();
  }
}

/**
 * Check if the browser is online (with Google endpoint fallback).
 */
async function _isOnline(): Promise<boolean> {
  if (!navigator.onLine) return false;
  try {
    const res = await fetch('https://www.googleapis.com/generate_204', {
      method: 'GET',
      cache: 'no-store',
    });
    return res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Add a sync job to the persistent queue.
 */
async function _addSyncJob(job: SyncJob): Promise<void> {
  chrome.storage.local.get({ syncQueue: [] }, (data: { syncQueue: SyncJob[] }) => {
    const queue = data.syncQueue || [];
    queue.push(job);
    chrome.storage.local.set({ syncQueue: queue });
  });
}

/**
 * Process the persistent sync queue.
 */
async function _processSyncQueue(): Promise<void> {
  if (syncInProgress) return;
  syncInProgress = true;
  chrome.storage.local.get({ syncQueue: [] }, async (data: { syncQueue: SyncJob[] }) => {
    let queue = data.syncQueue || [];
    while (queue.length > 0) {
      queue.shift();
      try {
        await _doSync();
      } catch (e: unknown) {
        _logSyncEvent({
          time: new Date().toISOString(),
          mode: 'queue',
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        });
        break;
      }
      chrome.storage.local.set({ syncQueue: queue });
    }
    syncInProgress = false;
  });
}

/**
 * Try to sync, retrying with exponential backoff if offline.
 */
async function _trySyncWithNetworkCheck(): Promise<void> {
  if (await _isOnline()) {
    backoff = 1;
    _processSyncQueue();
    chrome.runtime.sendMessage({ action: 'networkStatus', online: true });
  } else {
    chrome.runtime.sendMessage({ action: 'networkStatus', online: false });
    if (retryTimeout) clearTimeout(retryTimeout);
    retryTimeout = setTimeout(_trySyncWithNetworkCheck, Math.min(60000, 2000 * backoff));
    backoff++;
  }
}

/**
 * Sync with queue, or add to queue if offline.
 */
async function _doSyncWithQueue(): Promise<void> {
  if (await _isOnline()) {
    await _doSync();
    chrome.runtime.sendMessage({ action: 'networkStatus', online: true });
    _processSyncQueue();
  } else {
    _addSyncJob({ pendingSync: true, lastAttempt: new Date().toISOString(), retryCount: 0 });
    chrome.runtime.sendMessage({ action: 'networkStatus', online: false });
    _trySyncWithNetworkCheck();
  }
}

/**
 * Count bookmarks in a tree.
 */
function _countBookmarks(tree: chrome.bookmarks.BookmarkTreeNode[] | any[]): number {
  let count = 0;
  for (const node of tree) {
    count++;
    if (node.children) count += _countBookmarks(node.children);
  }
  return count;
}

/**
 * Log a sync event, optionally with details.
 */
async function _logSyncEvent(event: SyncLogEvent): Promise<void> {
  const tree = await exportBookmarksTree();
  event.bookmarkCount = Array.isArray(tree) ? _countBookmarks(tree) : 0;
  getSettings().then((settings: Settings) => {
    chrome.storage.local.get({ syncLog: [] }, (data: { syncLog: SyncLogEvent[] }) => {
      const log = data.syncLog || [];
      if (settings.verboseLogs) {
        event.details = {
          userAgent: navigator.userAgent,
          time: new Date().toString(),
          ...(typeof event.details === 'object' && event.details !== null ? event.details : {}),
        };
      }
      log.unshift(event);
      if (log.length > 100) log.length = 100;
      chrome.storage.local.set({ syncLog: log }, () => {
        pushGlobalLog(log.slice(0, 50));
      });
    });
  });
}

// Wrap syncs to log events
async function _doSyncWithLogging(): Promise<void> {
  const settings = await getSettings();
  const mode = settings.mode;
  const start = new Date();
  try {
    await _doSyncWithQueue();
    _logSyncEvent({
      time: start.toISOString(),
      mode,
      status: 'success',
    });
  } catch (e: unknown) {
    _logSyncEvent({
      time: start.toISOString(),
      mode,
      status: 'error',
      error: e instanceof Error ? e.message : String(e),
    });
    chrome.storage.local.set({ lastSyncStatus: 'error' });
  }
}

// Adaptive sync interval with battery awareness
async function _checkBatteryAndUpdateSync(): Promise<void> {
  let isOnBattery = false;
  if ('getBattery' in navigator && typeof (navigator as any).getBattery === 'function') {
    try {
      const battery = await (navigator as any).getBattery();
      isOnBattery = battery.charging === false;
      chrome.storage.local.set({ isOnBattery });
      battery.onchargingchange = (): void => {
        isOnBattery = battery.charging === false;
        chrome.storage.local.set({ isOnBattery });
        _updateSyncAlarm();
      };
    } catch {}
  }
  _updateSyncAlarm();
}

function _updateSyncAlarm(): void {
  chrome.storage.local.get(
    ['lastChange', 'lastSync', 'isOnBattery'],
    (data: { lastChange: string; lastSync: string; isOnBattery: boolean }) => {
      const now = Date.now();
      const lastChange = data.lastChange ? new Date(data.lastChange).getTime() : 0;
      const lastSync = data.lastSync ? new Date(data.lastSync).getTime() : 0;
      const sinceChange = (now - lastChange) / 60000;
      const sinceSync = (now - lastSync) / 60000;
      let interval = LONG_INTERVAL;
      if (data.isOnBattery)
        interval = 60; // 60 min on battery
      else if (sinceChange < 15 || sinceSync < 15) interval = SHORT_INTERVAL;
      chrome.alarms.create('autoSync', { periodInMinutes: interval });
    },
  );
}

async function _onAnySyncOrChange(type: 'change' | 'sync'): Promise<void> {
  const now = new Date().toISOString();
  if (type === 'change') {
    chrome.storage.local.set({ lastChange: now });
  } else if (type === 'sync') {
    chrome.storage.local.set({ lastSync: now });
  }
  _updateSyncAlarm();
}

function _debouncedSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout((): void => {
    _doSyncWithLogging();
    _onAnySyncOrChange('change');
  }, 3000);
}

// Set up bookmark change listeners
(['onChanged', 'onCreated', 'onRemoved', 'onMoved'] as const).forEach((evt) => {
  const handler = (chrome.bookmarks as any)[evt];
  if (typeof handler?.addListener === 'function') {
    handler.addListener(_debouncedSync);
  }
});

async function _doSyncWithLoggingAndUpdate(): Promise<void> {
  await _doSyncWithLogging();
  await _onAnySyncOrChange('sync');
}

// On startup, check battery and set alarm
chrome.runtime.onStartup.addListener((): void => {
  _checkBatteryAndUpdateSync();
  _processSyncQueue();
});
chrome.runtime.onInstalled.addListener((): void => {
  getSettings().then((settings: Settings) => {
    if (settings.autoSync) {
      chrome.alarms.create('autoSync', { periodInMinutes: settings.syncInterval });
    }
    _doSyncWithLoggingAndUpdate();
  });
});
chrome.alarms.onAlarm.addListener((alarm: chrome.alarms.Alarm): void => {
  if (alarm.name === 'autoSync') {
    _doSyncWithLoggingAndUpdate();
  }
});
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse): boolean {
  if (message.action === 'syncNow') {
    _doSyncWithLoggingAndUpdate().then(() => sendResponse({ status: 'ok' }));
    return true;
  }
  if (message.action === 'getSyncLog') {
    chrome.storage.local.get({ syncLog: [] }, (data: { syncLog: SyncLogEvent[] }) => {
      sendResponse({ log: data.syncLog });
    });
    return true;
  }
  if (message.action === 'downloadSyncLog') {
    chrome.storage.local.get({ syncLog: [] }, (data: { syncLog: SyncLogEvent[] }) => {
      const blob = new Blob([JSON.stringify(data.syncLog, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      sendResponse({ url });
    });
    return true;
  }
  if (message.action === 'cleanupBackups') {
    cleanupBackups()
      .then(() => {
        _logSyncEvent({ time: new Date().toISOString(), mode: 'cleanup', status: 'success' });
        sendResponse({ status: 'ok' });
      })
      .catch((e: unknown) => {
        _logSyncEvent({
          time: new Date().toISOString(),
          mode: 'cleanup',
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        });
        sendResponse({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      });
    return true;
  }
  if (message.action === 'manualBackup') {
    exportBookmarksTree().then((tree) => {
      if (Array.isArray(tree)) {
        createManualBackup(tree as chrome.bookmarks.BookmarkTreeNode[])
          .then(() => {
            _logSyncEvent({
              time: new Date().toISOString(),
              mode: 'manual-backup',
              status: 'success',
            });
            sendResponse({ status: 'ok' });
          })
          .catch((e: unknown) => {
            _logSyncEvent({
              time: new Date().toISOString(),
              mode: 'manual-backup',
              status: 'error',
              error: e instanceof Error ? e.message : String(e),
            });
            sendResponse({ status: 'error', error: e instanceof Error ? e.message : String(e) });
          });
      } else {
        sendResponse({ status: 'error', error: 'Invalid bookmarks tree' });
      }
    });
    return true;
  }
  if (message.action === 'listBackups') {
    listBackups()
      .then((backups: any) => sendResponse({ backups }))
      .catch((e: unknown) =>
        sendResponse({ backups: [], error: e instanceof Error ? e.message : String(e) }),
      );
    return true;
  }
  if (message.action === 'restoreFromBackup') {
    restoreFromBackup(message.backupTimestamp)
      .then((tree) => {
        if (Array.isArray(tree) && tree.length > 0) {
          importBookmarksTree(tree as chrome.bookmarks.BookmarkTreeNode[], 'replace')
            .then(() => {
              _logSyncEvent({
                time: new Date().toISOString(),
                mode: 'manual-restore',
                status: 'success',
              });
              sendResponse({ status: 'ok' });
            })
            .catch((e: unknown) => {
              _logSyncEvent({
                time: new Date().toISOString(),
                mode: 'manual-restore',
                status: 'error',
                error: e instanceof Error ? e.message : String(e),
              });
              sendResponse({
                status: 'error',
                error: e instanceof Error ? e.message : String(e),
              });
            });
        } else {
          sendResponse({ status: 'error', error: 'Invalid bookmarks tree' });
        }
      })
      .catch((e: unknown) => {
        _logSyncEvent({
          time: new Date().toISOString(),
          mode: 'manual-restore',
          status: 'error',
          error: e instanceof Error ? e.message : String(e),
        });
        sendResponse({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      });
    return true;
  }
  if (message.action === 'getBookmarkDiff') {
    (async (): Promise<void> => {
      const settings = await getSettings();
      if (settings.mode !== 'global') {
        sendResponse({ error: 'Not in Global Sync mode' });
        return;
      }
      const localTree = await exportBookmarksTree();
      let remoteData: unknown = null;
      try {
        remoteData = await downloadBookmarksFile('global');
        if (remoteData && typeof remoteData === 'object' && '_meta' in remoteData)
          remoteData = (remoteData as any).tree;
      } catch {}
      if (!remoteData) {
        sendResponse({ error: 'No remote data' });
        return;
      }
      const diff = diffBookmarks(localTree, Array.isArray(remoteData) ? remoteData : []);
      sendResponse({ diff });
    })();
    return true;
  }
  if (message.action === 'simulateSyncPreview') {
    (async (): Promise<void> => {
      const settings = await getSettings();
      if (settings.mode !== 'global') {
        sendResponse({ error: 'Not in Global Sync mode' });
        return;
      }
      const localTree = await exportBookmarksTree();
      let remoteData: unknown = null;
      try {
        remoteData = await downloadBookmarksFile('global');
        if (remoteData && typeof remoteData === 'object' && '_meta' in remoteData)
          remoteData = (remoteData as any).tree;
        else if (remoteData && typeof remoteData === 'object' && 'tree' in remoteData)
          remoteData = (remoteData as any).tree;
      } catch {}
      if (!remoteData || !Array.isArray(remoteData) || (remoteData as any).length === 0) {
        sendResponse({ error: 'No valid remote data' });
        return;
      }
      if (!Array.isArray(localTree) || (localTree as any).length === 0) {
        sendResponse({ error: 'No valid local bookmarks' });
        return;
      }
      const diff = diffBookmarks(localTree, remoteData);
      sendResponse({ 
        diff: {
          ...diff,
          local: localTree,
          remote: remoteData
        }
      });
    })();
    return true;
  }
  if (message.action === 'getGlobalLogs') {
    fetchGlobalLogs()
      .then((logs: any) => sendResponse({ logs }))
      .catch((e: unknown) =>
        sendResponse({ logs: [], error: e instanceof Error ? e.message : String(e) }),
      );
    return true;
  }
  if (message.action === 'getTeamMembers') {
    getTeamMembers()
      .then((members: any) => sendResponse({ members }))
      .catch((e: unknown) =>
        sendResponse({ members: [], error: e instanceof Error ? e.message : String(e) }),
      );
    return true;
  }
  if (message.action === 'addTeamMember') {
    addTeamMember(message.email, message.role)
      .then(() => sendResponse({ status: 'ok' }))
      .catch((e: unknown) =>
        sendResponse({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
      );
    return true;
  }
  if (message.action === 'removeTeamMember') {
    removeTeamMember(message.email)
      .then(() => sendResponse({ status: 'ok' }))
      .catch((e: unknown) =>
        sendResponse({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
      );
    return true;
  }
  if (message.action === 'updateMemberRole') {
    chrome.runtime.sendMessage({ 
      action: 'updateMemberRole', 
      email: message.email, 
      role: message.role 
    })
      .then(() => sendResponse({ status: 'ok' }))
      .catch((e: unknown) =>
        sendResponse({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
      );
    return true;
  }
  if (message.action === 'applyConflictResolutions') {
    (async (): Promise<void> => {
      try {
        const settings = await getSettings();
        if (settings.mode !== 'global') {
          sendResponse({ error: 'Not in Global Sync mode' });
          return;
        }
        
        const localTree = await exportBookmarksTree();
        let remoteData: unknown = null;
        
        try {
          remoteData = await downloadBookmarksFile('global');
          if (remoteData && typeof remoteData === 'object' && '_meta' in remoteData)
            remoteData = (remoteData as any).tree;
        } catch {}
        
        if (!remoteData) {
          sendResponse({ error: 'No remote data' });
          return;
        }
        
        const conflicts = detectConflicts(localTree as any, remoteData as any);
        const resolvedNodes = resolveConflicts(conflicts, message.resolutions);
        
        // Apply resolved bookmarks
        await importBookmarksTree(resolvedNodes as any, 'replace');
        
        sendResponse({ status: 'ok' });
      } catch (e: unknown) {
        sendResponse({ 
          status: 'error', 
          error: e instanceof Error ? e.message : String(e) 
        });
      }
    })();
    return true;
  }
  return false;
});

// Idle detection: pause sync if idle for 30+ minutes
chrome.idle.onStateChanged.addListener((state: chrome.idle.IdleState): void => {
  if (state === 'idle' || state === 'locked') {
    syncPausedForIdle = true;
    chrome.storage.local.set({ idleStatus: 'paused' });
  } else if (state === 'active') {
    if (syncPausedForIdle) {
      syncPausedForIdle = false;
      chrome.storage.local.set({ idleStatus: 'active' });
      _doSyncWithLoggingAndUpdate();
    }
  }
});

// Periodic log cleanup
async function _cleanLogs(): Promise<void> {
  chrome.storage.local.get({ syncLog: [] }, (data: { syncLog: SyncLogEvent[] }) => {
    let log = data.syncLog || [];
    const now = Date.now();
    log = log.filter((entry: SyncLogEvent) => {
      const age = now - new Date(entry.time).getTime();
      return age < 30 * 24 * 60 * 60 * 1000; // 30 days
    });
    // Estimate log size
    const logStr = JSON.stringify(log);
    if (logStr.length > 5 * 1024 * 1024) {
      log.length = Math.floor(log.length / 2); // trim oldest
    }
    chrome.storage.local.set({ syncLog: log });
  });
}
setInterval(_cleanLogs, 6 * 60 * 60 * 1000); // every 6 hours

// Deduplicate Drive writes: skip upload if unchanged
async function _uploadBookmarksFileDedup(
  mode: 'host' | 'global',
  data: chrome.bookmarks.BookmarkTreeNode[],
  ...args: any[]
): Promise<void> {
  const hash = await _hashData(data);
  if (hash === lastUploadedHash) return; // skip if unchanged
  lastUploadedHash = hash;
  return uploadBookmarksFile(mode, data, ...args);
}

async function _hashData(data: chrome.bookmarks.BookmarkTreeNode[]): Promise<number> {
  // Simple hash: JSON string + built-in hashCode
  const str = JSON.stringify(data);
  let hash = 0,
    i,
    chr;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

// Global error handler: catch/display unexpected errors via chrome.notifications and logSyncEvent
self.addEventListener('error', function (event: ErrorEvent): void {
  const msg =
    'Unexpected error: ' +
    (event.error && event.error.message ? event.error.message : event.message);
  _logSyncEvent({
    time: new Date().toISOString(),
    mode: 'background',
    status: 'error',
    error: msg,
  });
  if (chrome && chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'BookDrive Error',
      message: msg,
    });
  }
});
self.addEventListener('unhandledrejection', function (event: PromiseRejectionEvent): void {
  const msg =
    'Unexpected error: ' +
    (event.reason && event.reason.message ? event.reason.message : event.reason);
  _logSyncEvent({
    time: new Date().toISOString(),
    mode: 'background',
    status: 'error',
    error: msg,
  });
  if (chrome && chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'BookDrive Error',
      message: msg,
    });
  }
});