// storage.ts - chrome.storage.sync helpers for Bookmark Sync Drive

/**
 * Default settings for BookDrive.
 */
const DEFAULTS: Omit<Settings, 'deviceId'> & { deviceId: string | null } = {
  deviceId: null, // will be generated
  mode: 'host', // 'host' or 'global'
  autoSync: true,
  syncInterval: 10, // minutes
  theme: 'auto', // 'auto', 'light', 'dark'
  notifications: true,
  verboseLogs: false,
};

export type Mode = 'host' | 'global';
export type Theme = 'auto' | 'light' | 'dark';

/**
 * Settings object for BookDrive.
 */
export interface Settings {
  deviceId: string;
  mode: Mode;
  autoSync: boolean;
  syncInterval: number;
  theme: Theme;
  notifications: boolean;
  verboseLogs: boolean;
  teamMode?: boolean;
  userEmail?: string;
  [key: string]: unknown;
}

/**
 * Generate a unique device ID based on browser info and randomness.
 */
function generateDeviceId(): string {
  return (
    (navigator.userAgent.match(/(Chrome|Vivaldi|Brave|Edge|Opera)/) || ['Chromium'])[0] +
    '-' +
    (navigator.platform || 'Unknown') +
    '-' +
    Math.random().toString(36).slice(2, 10)
  );
}

/**
 * Log and optionally notify errors from storage operations.
 */
function handleStorageError(context: string, error: unknown): void {
  let msg = `[Storage] ${context}: `;
  if (error && typeof error === 'object' && 'message' in error) {
    msg += (error as { message?: string }).message;
  } else {
    msg += String(error);
  }
  if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'storageError', error: msg });
  }
  if (typeof console !== 'undefined') console.error(msg);
}

/**
 * Get all settings from chrome.storage.sync, generating deviceId if missing.
 */
export async function getSettings(): Promise<Settings> {
  try {
    return await new Promise<Settings>((resolve) => {
      chrome.storage.sync.get(DEFAULTS, (items: { [key: string]: unknown }) => {
        if (!items.deviceId || typeof items.deviceId !== 'string') {
          items.deviceId = generateDeviceId();
          chrome.storage.sync.set({ deviceId: items.deviceId });
        }
        resolve(items as Settings);
      });
    });
  } catch (e) {
    handleStorageError('getSettings', e);
    throw e;
  }
}

/**
 * Update settings in chrome.storage.sync.
 */
export async function setSettings(updates: Partial<Settings>): Promise<void> {
  try {
    return await new Promise<void>((resolve) => {
      chrome.storage.sync.set(updates, () => resolve());
    });
  } catch (e) {
    handleStorageError('setSettings', e);
    throw e;
  }
}

/**
 * Get the device ID from settings.
 */
export async function getDeviceId(): Promise<string> {
  try {
    const settings = await getSettings();
    return settings.deviceId;
  } catch (e) {
    handleStorageError('getDeviceId', e);
    throw e;
  }
}

/**
 * Get the sync mode from settings.
 */
export async function getMode(): Promise<Mode> {
  try {
    const settings = await getSettings();
    return settings.mode;
  } catch (e) {
    handleStorageError('getMode', e);
    throw e;
  }
}

/**
 * Set the sync mode in settings.
 */
export async function setMode(mode: Mode): Promise<void> {
  try {
    return await setSettings({ mode });
  } catch (e) {
    handleStorageError('setMode', e);
    throw e;
  }
}

/**
 * Get the theme from settings.
 */
export async function getTheme(): Promise<Theme> {
  try {
    const settings = await getSettings();
    return settings.theme;
  } catch (e) {
    handleStorageError('getTheme', e);
    throw e;
  }
}

/**
 * Set the theme in settings.
 */
export async function setTheme(theme: Theme): Promise<void> {
  try {
    return await setSettings({ theme });
  } catch (e) {
    handleStorageError('setTheme', e);
    throw e;
  }
}

/**
 * Get the verbose logs setting.
 */
export async function getVerboseLogs(): Promise<boolean> {
  try {
    const settings = await getSettings();
    return settings.verboseLogs;
  } catch (e) {
    handleStorageError('getVerboseLogs', e);
    throw e;
  }
}

/**
 * Set the verbose logs setting.
 */
export async function setVerboseLogs(val: boolean): Promise<void> {
  try {
    return await setSettings({ verboseLogs: val });
  } catch (e) {
    handleStorageError('setVerboseLogs', e);
    throw e;
  }
}
