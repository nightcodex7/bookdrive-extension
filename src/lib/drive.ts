/// <reference types="chrome" />
// drive.ts - Google Drive integration for BookDrive

import type { BookmarkNode } from '../types/bookmarks';
import type { EncryptedData } from '../types/sync';
import { logAsyncDuration } from '../utils/perf';
import { hashBookmarkTree, exportBookmarksTree } from './bookmarks';

/**
 * Represents a file in Google Drive.
 */
export interface DriveFile {
  id: string;
  name: string;
}

/**
 * Represents a log entry for Drive operations.
 */
export interface LogEntry {
  [key: string]: unknown;
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get an OAuth2 token for Google Drive API.
 * @param interactive Whether to prompt the user if not signed in.
 */
export async function getAuthToken(interactive: boolean = true): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive },
      (result: { token?: string } | string | undefined) => {
        let token: string | undefined;
        if (typeof result === 'string') {
          token = result;
        } else if (result && typeof result === 'object' && 'token' in result) {
          token = result.token;
        }
        if (chrome.runtime.lastError || !token) {
          reject(chrome.runtime.lastError || new Error('No token'));
        } else {
          resolve(token);
        }
      },
    );
  });
}

/**
 * Sign out and remove cached OAuth2 token.
 */
export async function signOut(): Promise<void> {
  chrome.identity.getAuthToken(
    { interactive: false },
    (result: { token?: string } | string | undefined) => {
      let token: string | undefined;
      if (typeof result === 'string') {
        token = result;
      } else if (result && typeof result === 'object' && 'token' in result) {
        token = result.token;
      }
      if (token) {
        chrome.identity.removeCachedAuthToken({ token }, () => {});
      }
    },
  );
}

/**
 * Check if the user is signed in to Google Drive.
 */
export async function isSignedIn(): Promise<boolean> {
  try {
    await getAuthToken(false);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retry: number = 0): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if ([401, 403, 429].includes(res.status)) {
      if (retry < 2) {
        const headers = options.headers as Record<string, string> | undefined;
        if (headers && headers.Authorization) {
          const token = headers.Authorization.replace('Bearer ', '');
          chrome.identity.removeCachedAuthToken({ token }, () => {});
        }
        await sleep(200 * (retry + 1));
        return fetchWithRetry(url, options, retry + 1);
      }
    }
    return res;
  } catch (e) {
    if (retry < 2) {
      await sleep(200 * (retry + 1));
      return fetchWithRetry(url, options, retry + 1);
    }
    throw e;
  }
}

// Encryption utilities
async function getEncryptionKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(passphrase);
  const key = await crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc, iterations: 100000, hash: 'SHA-256' },
    key,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encryptData<T>(data: T, passphrase: string): Promise<EncryptedData> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getEncryptionKey(passphrase);
  const enc = new TextEncoder().encode(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return {
    data: btoa(String.fromCharCode(...new Uint8Array(ct))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

async function decryptData<T = unknown>(blob: EncryptedData, passphrase: string): Promise<T> {
  const key = await getEncryptionKey(passphrase);
  const iv = Uint8Array.from(atob(blob.iv), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(blob.data), (c) => c.charCodeAt(0));
  const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(dec)) as T;
}

// Drive folder and file management
/**
 * Find or create a folder by name under parentId.
 */
async function getOrCreateFolder(
  token: string,
  name: string,
  parentId: string = 'root',
): Promise<string> {
  return logAsyncDuration('getOrCreateFolder', async () => {
    // Search for folder
    const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`;
    let res = await fetchWithRetry(`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let data: { files?: DriveFile[]; id?: string } = await res.json();
    if (data.files && data.files.length > 0) return data.files[0].id;
    // Create folder
    res = await fetchWithRetry(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });
    data = await res.json();
    if (!data.id) throw new Error('Failed to create folder');
    return data.id;
  });
}

/**
 * Find or create a file by name in a folder.
 */
async function getOrCreateFile(token: string, filename: string, folderId: string): Promise<string> {
  return logAsyncDuration('getOrCreateFile', async () => {
    // Search for file
    const q = `name='${filename.replace(/'/g, "\\'")}' and trashed=false and '${folderId}' in parents`;
    let res = await fetchWithRetry(`${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    let data: { files?: DriveFile[]; id?: string } = await res.json();
    if (data.files && data.files.length > 0) return data.files[0].id;
    // Create file (empty)
    res = await fetchWithRetry(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: filename,
        parents: [folderId],
      }),
    });
    data = await res.json();
    if (!data.id) throw new Error('Failed to create file');
    return data.id;
  });
}

/**
 * Log and optionally notify errors from Drive operations.
 */
function handleDriveError(context: string, error: unknown): void {
  const msg = `[Drive] ${context}: ${error instanceof Error ? error.message : String(error)}`;
  if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'driveError', error: msg });
  }
  if (typeof console !== 'undefined') console.error(msg);
}

/**
 * Upload bookmarks to Google Drive (host/global/backup).
 */
export async function uploadBookmarksFile(
  mode: 'host' | 'global' | 'backup',
  data: chrome.bookmarks.BookmarkTreeNode[] | BookmarkNode[],
  hostId: string | null = null,
  backupTimestamp: string | null = null,
): Promise<void> {
  return logAsyncDuration('uploadBookmarksFile', async () => {
    try {
      const hashTree = await hashBookmarkTree(data as BookmarkNode[]);
      const rootHash = hashTree[0]?.hash;
      // Download remote to compare hashes
      let remoteHash: string | null = null;
      try {
        const remote = (await downloadBookmarksFile(mode, hostId, backupTimestamp)) as {
          hash?: string;
        } | null;
        remoteHash = remote && remote.hash ? remote.hash : null;
      } catch {}
      if (rootHash && remoteHash && rootHash === remoteHash) return; // skip if unchanged
      const token = await getAuthToken();
      let folderId: string;
      if (mode === 'host') {
        const root = await getOrCreateFolder(token, 'BrowserSync');
        const hostFolder = await getOrCreateFolder(token, 'HostToMany', root);
        const thisHost = await getOrCreateFolder(token, hostId as string, hostFolder);
        folderId = thisHost;
      } else if (mode === 'global') {
        const root = await getOrCreateFolder(token, 'BrowserSync');
        folderId = await getOrCreateFolder(token, 'GlobalSync', root);
      } else if (mode === 'backup') {
        const root = await getOrCreateFolder(token, 'BrowserSync');
        const backupFolder = await getOrCreateFolder(token, 'BackupBeforeMigration', root);
        folderId = await getOrCreateFolder(token, backupTimestamp as string, backupFolder);
      } else {
        throw new Error('Unknown mode');
      }
      const fileId = await getOrCreateFile(token, 'bookmarks.json', folderId);
      // Check encryption setting
      let encryptionEnabled = false,
        passphrase = '';
      try {
        const s = await new Promise<{ encryptionEnabled?: boolean; encryptionPass?: string }>(
          (res) => chrome.storage.sync.get(['encryptionEnabled', 'encryptionPass'] as any, res),
        );
        encryptionEnabled = !!s.encryptionEnabled;
        passphrase = s.encryptionPass || '';
      } catch {}
      // Team Mode: add author/syncedBy
      let teamMode = false,
        userEmail = '';
      try {
        const s = await new Promise<{ teamMode?: boolean; userEmail?: string }>((res) =>
          chrome.storage.sync.get(['teamMode', 'userEmail'] as any, res),
        );
        teamMode = !!s.teamMode;
        userEmail = s.userEmail || '';
      } catch {}
      let bodyObj: any = {};
      bodyObj.tree = hashTree;
      bodyObj.hash = rootHash;
      bodyObj.updated = new Date().toISOString();
      if (teamMode && userEmail) {
        bodyObj.author = userEmail;
        bodyObj.syncedBy = userEmail;
      }
      let body: any = bodyObj;
      if (encryptionEnabled && passphrase) {
        body = await encryptData(bodyObj, passphrase);
      }
      await sleep(200);
      await fetchWithRetry(`${UPLOAD_API}/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      handleDriveError('uploadBookmarksFile', e);
      throw e;
    }
  });
}

/**
 * Download bookmarks from Google Drive (host/global/backup).
 */
export async function downloadBookmarksFile(
  mode: 'host' | 'global' | 'backup',
  hostId: string | null = null,
  backupTimestamp: string | null = null,
): Promise<Record<string, unknown> | null> {
  return logAsyncDuration('downloadBookmarksFile', async () => {
    try {
      const token = await getAuthToken();
      let folderId: string;
      if (mode === 'host') {
        const root = await getOrCreateFolder(token, 'BrowserSync');
        const hostFolder = await getOrCreateFolder(token, 'HostToMany', root);
        const thisHost = await getOrCreateFolder(token, hostId as string, hostFolder);
        folderId = thisHost;
      } else if (mode === 'global') {
        const root = await getOrCreateFolder(token, 'BrowserSync');
        folderId = await getOrCreateFolder(token, 'GlobalSync', root);
      } else if (mode === 'backup') {
        const root = await getOrCreateFolder(token, 'BrowserSync');
        const backupFolder = await getOrCreateFolder(token, 'BackupBeforeMigration', root);
        folderId = await getOrCreateFolder(token, backupTimestamp as string, backupFolder);
      } else {
        throw new Error('Unknown mode');
      }
      const fileId = await getOrCreateFile(token, 'bookmarks.json', folderId);
      const res = await fetchWithRetry(`${DRIVE_API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { [key: string]: unknown } | EncryptedData = await res.json();
      // Decrypt if needed
      if (data && typeof data === 'object' && 'iv' in data && 'data' in data) {
        let passphrase = '';
        try {
          const s = await new Promise<{ encryptionPass?: string }>((res) =>
            chrome.storage.sync.get(['encryptionPass'] as any, res),
          );
          passphrase = s.encryptionPass || '';
        } catch {}
        if (!passphrase) throw new Error('Encryption passphrase required');
        return await decryptData(data as EncryptedData, passphrase);
      }
      // If local hash matches remote, skip
      if (
        data &&
        typeof data === 'object' &&
        'hash' in data &&
        typeof (data as { [key: string]: unknown }).hash === 'string'
      ) {
        const localTree = await hashBookmarkTree(await exportBookmarksTree());
        const localHash = localTree[0]?.hash;
        if (localHash && localHash === (data as { [key: string]: unknown }).hash) return null; // skip, no changes
      }
      return data as { [key: string]: unknown };
    } catch (e) {
      handleDriveError('downloadBookmarksFile', e);
      throw e;
    }
  });
}

/**
 * List all backup folders in Google Drive.
 */
export async function listBackups(): Promise<DriveFile[]> {
  return logAsyncDuration('listBackups', async () => {
    try {
      const token = await getAuthToken();
      const root = await getOrCreateFolder(token, 'BrowserSync');
      const backupFolder = await getOrCreateFolder(token, 'BackupBeforeMigration', root);
      // List all timestamp folders
      const q = `'${backupFolder}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const res = await fetch(
        `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data: { files?: DriveFile[] } = await res.json();
      return data.files || [];
    } catch (e) {
      handleDriveError('listBackups', e);
      throw e;
    }
  });
}

/**
 * Cleanup old backups in Google Drive (keep only latest per device, remove those older than 30 days).
 */
export async function cleanupBackups(): Promise<void> {
  return logAsyncDuration('cleanupBackups', async () => {
    try {
      const token = await getAuthToken();
      const root = await getOrCreateFolder(token, 'BrowserSync');
      const backupFolder = await getOrCreateFolder(token, 'BackupBeforeMigration', root);
      // List all timestamp folders
      const q = `'${backupFolder}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      const res = await fetch(
        `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data: { files?: DriveFile[] } = await res.json();
      const now = Date.now();
      // Group by device (deviceId is in bookmarks.json inside each folder)
      const folders: DriveFile[] = data.files || [];
      const deviceBackups: Record<string, { ts: number; id: string }[]> = {};
      for (const folder of folders) {
        const ts = Date.parse(folder.name);
        if (!isNaN(ts)) {
          if (now - ts > 30 * 24 * 60 * 60 * 1000) {
            // Delete old backup
            await fetch(`${DRIVE_API}/files/${folder.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            continue;
          }
          // Try to get deviceId from bookmarks.json in this folder
          try {
            const qf = `name='bookmarks.json' and trashed=false and '${folder.id}' in parents`;
            const resf = await fetch(
              `${DRIVE_API}/files?q=${encodeURIComponent(qf)}&fields=files(id,name)`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            const dataf: { files?: DriveFile[] } = await resf.json();
            if (dataf.files && dataf.files.length > 0) {
              const fileId = dataf.files[0].id;
              const resj = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              const json: Record<string, unknown> = await resj.json();
              let deviceId = 'unknown';
              if (json._meta && typeof json._meta === 'object') {
                const meta = json._meta as Record<string, unknown>;
                const keys = Object.keys(meta);
                if (keys.length > 0) deviceId = keys[0];
              }
              if (!deviceBackups[deviceId]) deviceBackups[deviceId] = [];
              deviceBackups[deviceId].push({ ts, id: folder.id });
            }
          } catch {}
        }
      }
      // For each device, keep only the latest
      for (const deviceId of Object.keys(deviceBackups)) {
        const backups = deviceBackups[deviceId].sort((a, b) => b.ts - a.ts);
        for (let i = 1; i < backups.length; i++) {
          await fetch(`${DRIVE_API}/files/${backups[i].id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      }
    } catch (e) {
      handleDriveError('cleanupBackups', e);
      throw e;
    }
  });
}

/**
 * Create a manual backup (timestamped) in Google Drive.
 */
export async function createManualBackup(
  bookmarksTree: chrome.bookmarks.BookmarkTreeNode[] | BookmarkNode[],
): Promise<void> {
  return logAsyncDuration('createManualBackup', async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      await uploadBookmarksFile('backup', bookmarksTree, null, timestamp);
    } catch (e) {
      handleDriveError('createManualBackup', e);
      throw e;
    }
  });
}

/**
 * Restore bookmarks from a selected backup timestamp.
 */
export async function restoreFromBackup(
  backupTimestamp: string,
): Promise<Record<string, unknown> | null> {
  return logAsyncDuration('restoreFromBackup', async () => {
    try {
      const tree = await downloadBookmarksFile('backup', null, backupTimestamp);
      return tree;
    } catch (e) {
      handleDriveError('restoreFromBackup', e);
      throw e;
    }
  });
}

/**
 * Push sync logs to Drive (global notification hub).
 */
export async function pushGlobalLog(logs: LogEntry[]): Promise<void> {
  return logAsyncDuration('pushGlobalLog', async () => {
    try {
      const token = await getAuthToken();
      const root = await getOrCreateFolder(token, 'BrowserSync');
      const logsFolder = await getOrCreateFolder(token, 'Logs', root);
      const fileId = await getOrCreateFile(token, 'logs.json', logsFolder);
      let teamMode = false,
        userEmail = '';
      try {
        const s = await new Promise<{ teamMode?: boolean; userEmail?: string }>((res) =>
          chrome.storage.sync.get(['teamMode', 'userEmail'] as any, res),
        );
        teamMode = !!s.teamMode;
        userEmail = s.userEmail || '';
      } catch {}
      const logsWithAuthor = logs.map((l) =>
        teamMode && userEmail ? { ...l, author: userEmail, syncedBy: userEmail } : l,
      );
      await sleep(200);
      await fetchWithRetry(`${UPLOAD_API}/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsWithAuthor, updated: new Date().toISOString() }),
      });
    } catch (e) {
      handleDriveError('pushGlobalLog', e);
      throw e;
    }
  });
}

/**
 * Fetch global logs from Drive.
 */
export async function fetchGlobalLogs(): Promise<LogEntry[]> {
  return logAsyncDuration('fetchGlobalLogs', async () => {
    try {
      const token = await getAuthToken();
      const root = await getOrCreateFolder(token, 'BrowserSync');
      const logsFolder = await getOrCreateFolder(token, 'Logs', root);
      const fileId = await getOrCreateFile(token, 'logs.json', logsFolder);
      const res = await fetchWithRetry(`${DRIVE_API}/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: { logs?: LogEntry[] } = await res.json();
      return data.logs || [];
    } catch (e) {
      handleDriveError('fetchGlobalLogs', e);
      throw e;
    }
  });
}
