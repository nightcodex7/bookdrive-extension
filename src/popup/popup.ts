// popup.ts - UI logic for BookDrive

import { getDeviceId, getMode, getSettings, getVerboseLogs, setVerboseLogs } from '../lib/storage';
import { getAuthToken, signOut, isSignedIn } from '../lib/drive';
import { perfTracker } from '../utils/perf';
import { Chart } from 'chart.js/auto';

/**
 * Settings interface for BookDrive popup.
 */
interface Settings {
  deviceId: string;
  mode: 'host' | 'global';
  autoSync: boolean;
  syncInterval: number;
  theme: 'auto' | 'light' | 'dark';
  notifications: boolean;
  verboseLogs: boolean;
  teamMode?: boolean;
  userEmail?: string;
  [key: string]: unknown;
}
interface SyncLog {
  time: string;
  mode: string;
  status: string;
  error?: string;
  [key: string]: unknown;
}

// Augment the window type to include syncChart
declare global {
  interface Window {
    syncChart?: Chart;
  }
}

// Global utility: Toast feedback
function showToast(msg: string, type: string = ''): void {
  const toastContainer = document.getElementById('toast-container') as HTMLElement | null;
  if (!toastContainer) return;
  toastContainer.style.display = '';
  const toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = msg;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}
// Global references for syncNowBtn and syncStatus
const _syncNowBtn = document.getElementById('sync-now-btn') as HTMLButtonElement | null;
const _syncStatus = document.getElementById('sync-status') as HTMLElement | null;

// Move updateLastSyncStatus to global scope
function updateLastSyncStatus(): void {
  if (!_syncStatus) return;
  chrome.storage.local.get(
    ['lastSync', 'lastSyncStatus'],
    (data: { lastSync?: number; lastSyncStatus?: string }) => {
      if (data.lastSync) {
        _syncStatus.textContent = `Last: ${new Date(data.lastSync).toLocaleString()} (${data.lastSyncStatus})`;
      }
    },
  );
}

// --- THEME SWITCHING AND SYSTEM THEME DETECTION ---
function detectAndApplySystemTheme(): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

function loadAndApplyUserTheme(): void {
  chrome.storage.sync.get({ theme: 'auto' }, ({ theme }: { theme: string }) => {
    if (theme === 'auto') {
      detectAndApplySystemTheme();
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
    if (themeSelect) themeSelect.value = theme;
  });
}

function setupThemeSwitchListener(): void {
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
  if (themeSelect) {
    themeSelect.addEventListener('change', () => {
      const newTheme = themeSelect.value;
      chrome.storage.sync.set({ theme: newTheme }, () => {
        if (newTheme === 'auto') {
          detectAndApplySystemTheme();
        } else {
          document.documentElement.setAttribute('data-theme', newTheme);
        }
      });
    });
  }
  // Listen for system theme changes if in auto mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    chrome.storage.sync.get({ theme: 'auto' }, ({ theme }: { theme: string }) => {
      if (theme === 'auto') detectAndApplySystemTheme();
    });
  });
}

// --- EVENT LISTENERS FOR SYNC, SETTINGS, ETC. ---
function setupSyncEventListeners(): void {
  const syncNowBtn = document.getElementById('sync-now-btn') as HTMLButtonElement | null;
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', () => {
      if (_syncStatus) _syncStatus.textContent = 'Syncing...';
      chrome.runtime.sendMessage({ action: 'syncNow' }, (response: any) => {
        if (response && response.status === 'ok') {
          if (_syncStatus) _syncStatus.textContent = 'Sync complete';
          updateLastSyncStatus();
          showToast('Sync complete!', 'success');
        } else if (hasError(response)) {
          if (_syncStatus) _syncStatus.textContent = 'Sync failed';
          showToast('Sync failed: ' + response.error, 'error');
        } else {
          if (_syncStatus) _syncStatus.textContent = 'Sync failed';
          showToast('Sync failed', 'error');
        }
      });
    });
  }
  // Add more event listeners for settings, advanced actions, etc. as needed
}

function hasError(response: unknown): response is { error: string } {
  return !!response && typeof (response as any).error === 'string';
}

document.addEventListener('DOMContentLoaded', async () => {
  // Onboarding logic
  const onboarding = document.getElementById('onboarding') as HTMLElement | null;
  const onboardingSigninBtn = document.getElementById(
    'onboarding-signin-btn',
  ) as HTMLButtonElement | null;
  const onboardingClientId = document.getElementById('onboarding-clientid') as HTMLElement | null;
  const popupRoot = document.getElementById('popup-root') as HTMLElement | null;
  // Check for OAuth2 client_id in manifest
  let clientId: boolean | null = null;
  try {
    const manifest = chrome.runtime.getManifest();
    clientId = !!(
      manifest.oauth2 &&
      manifest.oauth2.client_id &&
      !manifest.oauth2.client_id.startsWith('YOUR_')
    );
  } catch {}
  // Check if signed in
  let signedIn = false;
  try {
    signedIn = await isSignedIn();
  } catch {}
  if (!clientId) {
    if (onboarding) onboarding.style.display = '';
    if (onboardingClientId) onboardingClientId.style.display = '';
    if (popupRoot) popupRoot.style.display = 'none';
    const welcomeSetup = document.getElementById('welcome-setup') as HTMLElement | null;
    if (welcomeSetup) welcomeSetup.style.display = 'none';
  } else if (!signedIn) {
    if (onboarding) onboarding.style.display = '';
    if (onboardingClientId) onboardingClientId.style.display = 'none';
    if (popupRoot) popupRoot.style.display = 'none';
    const welcomeSetup = document.getElementById('welcome-setup') as HTMLElement | null;
    if (welcomeSetup) welcomeSetup.style.display = 'none';
    if (onboardingSigninBtn)
      onboardingSigninBtn.onclick = async (): Promise<void> => {
        try {
          await getAuthToken(true);
          // Show welcome/setup-complete message
          if (onboarding) onboarding.style.display = 'none';
          const welcomeSetup = document.getElementById('welcome-setup') as HTMLElement | null;
          if (welcomeSetup) welcomeSetup.style.display = '';
          if (popupRoot) popupRoot.style.display = 'none';
          const goToSettingsBtn = document.getElementById(
            'go-to-settings-btn',
          ) as HTMLButtonElement | null;
          if (goToSettingsBtn) {
            goToSettingsBtn.onclick = (): void => {
              const welcomeSetup = document.getElementById('welcome-setup') as HTMLElement | null;
              if (welcomeSetup) welcomeSetup.style.display = 'none';
              if (popupRoot) popupRoot.style.display = '';
              const settingsTab = document.querySelector(
                '.tab[data-tab="settings"]',
              ) as HTMLElement | null;
              if (settingsTab) settingsTab.click();
            };
          }
        } catch (e: unknown) {
          const errMsg =
            typeof e === 'object' && e && 'message' in e
              ? (e as { message?: string }).message
              : String(e);
          showToast('Sign-in failed: ' + errMsg, 'error');
        }
      };
  } else {
    if (onboarding) onboarding.style.display = 'none';
    const welcomeSetup = document.getElementById('welcome-setup') as HTMLElement | null;
    if (welcomeSetup) welcomeSetup.style.display = 'none';
    if (popupRoot) popupRoot.style.display = '';
  }

  const tabs = document.querySelectorAll<HTMLElement>('.tab');
  const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      panels.forEach((panel) => panel.classList.add('hidden'));
      const panelId = tab.dataset.tab ? tab.dataset.tab + '-panel' : '';
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('hidden');
    });
  });

  // Theme detection and switching
  function applyTheme(theme: string): void {
    if (theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  // Load theme from chrome.storage and apply
  chrome.storage.sync.get({ theme: 'auto' }, ({ theme }: { theme: string }) => {
    applyTheme(theme);
  });

  // Theme select event listener
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
  if (themeSelect) {
    // Set dropdown to current value
    chrome.storage.sync.get({ theme: 'auto' }, ({ theme }: { theme: string }) => {
      themeSelect.value = theme;
    });
    themeSelect.addEventListener('change', () => {
      const newTheme = themeSelect.value;
      chrome.storage.sync.set({ theme: newTheme }, () => {
        applyTheme(newTheme);
      });
    });
  }

  // Mode select event listener
  const modeSelect = document.getElementById('mode-select') as HTMLSelectElement | null;
  if (modeSelect) {
    // Set dropdown to current value
    getMode().then((mode: string) => {
      modeSelect.value = mode;
    });
    modeSelect.addEventListener('change', () => {
      const newMode = modeSelect.value;
      chrome.storage.sync.set({ mode: newMode }, () => {
        const syncMode = document.getElementById('sync-mode') as HTMLElement | null;
        if (syncMode) syncMode.textContent = newMode === 'host' ? 'Host-to-Many' : 'Global Sync';
      });
    });
  }

  // Auto sync toggle and interval
  const autoSyncToggle = document.getElementById('auto-sync-toggle') as HTMLInputElement | null;
  const syncIntervalInput = document.getElementById('sync-interval') as HTMLInputElement | null;
  getSettings().then((settings: unknown) => {
    const s = settings as Settings;
    if (autoSyncToggle) autoSyncToggle.checked = s.autoSync;
    if (syncIntervalInput) syncIntervalInput.value = String(s.syncInterval);
  });
  if (autoSyncToggle) {
    autoSyncToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ autoSync: autoSyncToggle.checked });
    });
  }
  if (syncIntervalInput) {
    syncIntervalInput.addEventListener('change', () => {
      let val = parseInt(syncIntervalInput.value, 10);
      if (isNaN(val) || val < 5) val = 5;
      if (val > 30) val = 30;
      syncIntervalInput.value = String(val);
      chrome.storage.sync.set({ syncInterval: val });
    });
  }

  // Display device ID and sync mode
  getDeviceId().then((id: string) => {
    const deviceIdEl = document.getElementById('device-id') as HTMLElement | null;
    if (deviceIdEl) deviceIdEl.textContent = id;
  });
  getMode().then((mode: string) => {
    const syncMode = document.getElementById('sync-mode') as HTMLElement | null;
    if (syncMode) syncMode.textContent = mode === 'host' ? 'Host-to-Many' : 'Global Sync';
  });

  // Sign in/out UI logic
  const signinBtn = document.getElementById('signin-btn') as HTMLButtonElement | null;
  const signoutBtn = document.getElementById('signout-btn') as HTMLButtonElement | null;
  const signinStatus = document.getElementById('signin-status') as HTMLElement | null;

  async function updateSigninState(): Promise<void> {
    const signedIn = await isSignedIn();
    if (signinBtn && signoutBtn && signinStatus) {
      if (signedIn) {
        signinBtn.style.display = 'none';
        signoutBtn.style.display = '';
        signinStatus.textContent = 'Signed in';
      } else {
        signinBtn.style.display = '';
        signoutBtn.style.display = 'none';
        signinStatus.textContent = 'Not signed in';
      }
    }
  }
  if (signinBtn) {
    signinBtn.addEventListener('click', async () => {
      try {
        await getAuthToken(true);
        updateSigninState();
      } catch (e: unknown) {
        if (signinStatus) signinStatus.textContent = 'Sign-in failed';
      }
    });
  }
  if (signoutBtn) {
    signoutBtn.addEventListener('click', async () => {
      await signOut();
      updateSigninState();
    });
  }
  updateSigninState();

  // Sync Now button logic
  if (_syncNowBtn && _syncStatus) {
    _syncNowBtn.addEventListener('click', (): void => {
      _syncStatus.textContent = 'Syncing...';
      chrome.runtime.sendMessage(
        { action: 'syncNow' },
        (response: { status?: string; error?: string } | undefined): void => {
          if (response && response.status === 'ok') {
            _syncStatus.textContent = 'Sync complete';
            updateLastSyncStatus();
            showToast('Sync complete!', 'success');
          } else {
            _syncStatus.textContent = 'Sync failed';
            const errMsg =
              response && typeof (response as any).error === 'string'
                ? (response as any).error
                : 'Unknown error';
            showToast('Sync failed: ' + errMsg, 'error');
          }
        },
      );
    });
  }
  updateLastSyncStatus();

  // Listen for network status updates
  chrome.runtime.onMessage.addListener((message: { action: string; online: boolean }): void => {
    if (message.action === 'networkStatus') {
      if (!message.online) {
        if (_syncStatus)
          _syncStatus.textContent = 'No internet. Sync paused and will resume once connected.';
      } else {
        updateLastSyncStatus();
      }
    }
  });

  // Logs tab logic
  function renderLogs(): void {
    chrome.runtime.sendMessage(
      { action: 'getSyncLog' },
      (response: { log?: SyncLog[] } | undefined): void => {
        const logs = response && response.log ? response.log.slice(0, 5) : [];
        const logsList = document.getElementById('logs-list') as HTMLElement | null;
        if (logsList) {
          if (logs.length === 0) {
            logsList.textContent = 'No syncs yet.';
          } else {
            logsList.innerHTML = logs
              .map(
                (log: SyncLog): string =>
                  `<div><b>${log.time}</b> [${log.mode}] - ${log.status}${log.error ? ': ' + log.error : ''}</div>`,
              )
              .join('');
          }
        }
      },
    );
  }
  renderLogs();
  const downloadLogBtn = document.getElementById('download-log-btn') as HTMLButtonElement | null;
  if (downloadLogBtn) {
    downloadLogBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage(
        { action: 'downloadSyncLog' },
        (response: { url?: string } | undefined) => {
          if (response && response.url) {
            const a = document.createElement('a');
            a.href = response.url;
            a.download = 'bookmark-sync-log.json';
            a.click();
          }
        },
      );
    });
  }

  // Advanced tab controls (stubs)
  // Verbose logs toggle
  const verboseLogsToggle = document.getElementById(
    'verbose-logs-toggle',
  ) as HTMLInputElement | null;
  if (verboseLogsToggle) {
    getVerboseLogs().then((val: boolean) => {
      verboseLogsToggle.checked = val;
    });
    verboseLogsToggle.addEventListener('change', () => {
      setVerboseLogs(verboseLogsToggle.checked);
      showToast('Verbose logs ' + (verboseLogsToggle.checked ? 'enabled' : 'disabled'), 'info');
    });
  }
  const driveCleanupBtn = document.getElementById('drive-cleanup-btn') as HTMLButtonElement | null;
  if (driveCleanupBtn) {
    driveCleanupBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage(
        { action: 'cleanupBackups' },
        (response: { status?: string; error?: string } | undefined) => {
          if (response && response.status === 'ok') {
            showToast('Drive backup cleanup complete!', 'success');
          } else {
            showToast(
              'Drive cleanup failed: ' +
                (response && response.error ? response.error : 'Unknown error'),
              'error',
            );
          }
        },
      );
    });
  }
  const conflictViewerBtn = document.getElementById(
    'conflict-viewer-btn',
  ) as HTMLButtonElement | null;
  if (conflictViewerBtn) {
    conflictViewerBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage(
        { action: 'getBookmarkDiff' },
        (
          response:
            | { diff?: { added: string[]; removed: string[]; changed: string[] } }
            | undefined,
        ) => {
          if (response && response.diff) {
            const { added, removed, changed } = response.diff;
            let msg = `Added: ${added.length}\nRemoved: ${removed.length}\nChanged: ${changed.length}`;
            if (added.length || removed.length || changed.length) {
              // Accessible modal for conflict resolution
              const dialog = document.createElement('div');
              dialog.className = 'modal';
              dialog.setAttribute('role', 'dialog');
              dialog.setAttribute('aria-modal', 'true');
              dialog.setAttribute('tabindex', '0');
              dialog.innerHTML =
                `<b>Conflicts Detected</b><br><br>${msg.replace(/\n/g, '<br>')}<br><br>` +
                `<button id='keep-local-btn'>Keep Local</button> <button id='keep-remote-btn'>Keep Remote</button> <button id='close-conflict-btn'>Cancel</button>`;
              document.body.appendChild(dialog);
              if (dialog instanceof HTMLElement) (dialog as HTMLElement).focus();
              // Focus trap
              dialog.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === 'Escape') dialog.remove();
              });
              const keepLocalBtn = document.getElementById(
                'keep-local-btn',
              ) as HTMLButtonElement | null;
              if (keepLocalBtn) {
                keepLocalBtn.onclick = (): void => {
                  chrome.runtime.sendMessage(
                    { action: 'syncNow' },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (r: { status?: string } | undefined): void => {
                      showToast('Local version pushed to Drive.', 'success');
                      dialog.remove();
                    },
                  );
                };
              }
              const keepRemoteBtn = document.getElementById(
                'keep-remote-btn',
              ) as HTMLButtonElement | null;
              if (keepRemoteBtn) {
                keepRemoteBtn.onclick = (): void => {
                  chrome.runtime.sendMessage(
                    { action: 'restoreFromBackup', backupTimestamp: 'global' },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (r: { status?: string } | undefined): void => {
                      showToast('Local bookmarks replaced with remote version.', 'success');
                      dialog.remove();
                    },
                  );
                };
              }
              const closeConflictBtn = document.getElementById(
                'close-conflict-btn',
              ) as HTMLButtonElement | null;
              if (closeConflictBtn) {
                closeConflictBtn.onclick = (): void => dialog.remove();
              }
            } else {
              showToast('No differences detected.', 'info');
            }
          } else {
            showToast('No differences or not in Global Sync mode.', 'info');
          }
        },
      );
    });
  }
  // Manual Backup
  const manualBackupBtn = document.getElementById('manual-backup-btn') as HTMLButtonElement | null;
  if (manualBackupBtn) {
    manualBackupBtn.addEventListener('click', (): void => {
      chrome.runtime.sendMessage(
        { action: 'manualBackup' },
        (response: { status?: string; error?: string } | undefined) => {
          if (response && response.status === 'ok') {
            showToast('Manual backup complete!', 'success');
          } else {
            showToast(
              'Manual backup failed: ' +
                (response && response.error ? response.error : 'Unknown error'),
              'error',
            );
          }
        },
      );
    });
  }
  // Manual Restore (dropdown) - ensure modal is focusable and has ARIA
  const manualRestoreBtn = document.getElementById(
    'manual-restore-btn',
  ) as HTMLButtonElement | null;
  if (manualRestoreBtn) {
    manualRestoreBtn.addEventListener('click', (): void => {
      chrome.runtime.sendMessage(
        { action: 'listBackups' },
        (response: { backups?: { name: string }[] } | undefined) => {
          if (response && response.backups && response.backups.length > 0) {
            const backupNames = response.backups.map((b: { name: string }) => b.name);
            const select = document.createElement('select');
            backupNames.forEach((name: string): void => {
              const opt = document.createElement('option');
              opt.value = name;
              opt.textContent = name;
              select.appendChild(opt);
            });
            const dialog = document.createElement('div');
            dialog.style.position = 'fixed';
            dialog.style.top = '50%';
            dialog.style.left = '50%';
            dialog.style.transform = 'translate(-50%, -50%)';
            dialog.style.background = '#fff';
            dialog.style.padding = '2em';
            dialog.style.borderRadius = '10px';
            dialog.style.boxShadow = '0 2px 16px rgba(0,0,0,0.2)';
            dialog.style.zIndex = '10000';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('tabindex', '0');
            dialog.innerHTML = '<b>Select backup to restore:</b><br><br>';
            dialog.appendChild(select);
            const btn = document.createElement('button');
            btn.textContent = 'Restore';
            btn.style.marginLeft = '1em';
            btn.setAttribute('tabindex', '0');
            dialog.appendChild(btn);
            const cancel = document.createElement('button');
            cancel.textContent = 'Cancel';
            cancel.style.marginLeft = '1em';
            cancel.setAttribute('tabindex', '0');
            dialog.appendChild(cancel);
            document.body.appendChild(dialog);
            if (dialog instanceof HTMLElement) (dialog as HTMLElement).focus();
            btn.onclick = (): void => {
              dialog.innerHTML = 'Restoring...';
              chrome.runtime.sendMessage(
                { action: 'restoreFromBackup', backupTimestamp: select.value },
                (r: { status?: string } | undefined): void => {
                  dialog.remove();
                  if (r && r.status === 'ok') {
                    showToast('Restore complete!', 'success');
                  } else {
                    showToast(
                      'Restore failed: ' +
                        (r && typeof (r as any).error === 'string'
                          ? (r as any).error
                          : 'Unknown error'),
                      'error',
                    );
                  }
                },
              );
            };
            cancel.onclick = (): void => dialog.remove();
          } else {
            showToast('No backups found.', 'error');
          }
        },
      );
    });
  }

  // Preview Sync (dry run) - ensure modal is focusable and has ARIA
  const previewSyncBtn = document.getElementById('preview-sync-btn') as HTMLButtonElement | null;
  if (previewSyncBtn) {
    previewSyncBtn.addEventListener('click', (): void => {
      chrome.runtime.sendMessage(
        { action: 'simulateSyncPreview' },
        (
          response:
            | { diff?: { added: string[]; removed: string[]; changed: string[] }; error?: string }
            | undefined,
        ) => {
          if (response && response.diff) {
            const { added, removed, changed } = response.diff;
            const dialog = document.createElement('div');
            dialog.className = 'modal';
            dialog.setAttribute('role', 'dialog');
            dialog.setAttribute('aria-modal', 'true');
            dialog.setAttribute('tabindex', '0');
            dialog.innerHTML = `<b>Sync Preview</b><br><br>
            <b>Added:</b> ${added.length}<br>
            <b>Removed:</b> ${removed.length}<br>
            <b>Changed:</b> ${changed.length}<br><br>
            <button id='close-preview-btn'>Close</button>`;
            document.body.appendChild(dialog);
            if (dialog instanceof HTMLElement) (dialog as HTMLElement).focus();
            const closePreviewBtn = document.getElementById(
              'close-preview-btn',
            ) as HTMLButtonElement | null;
            if (closePreviewBtn instanceof HTMLElement) {
              closePreviewBtn.onclick = (): void => dialog.remove();
            }
          } else {
            const errMsg =
              response && typeof response.error === 'string'
                ? response.error
                : 'No changes detected.';
            showToast(String(errMsg), 'info');
          }
        },
      );
    });
  }

  // Export Settings
  const exportSettingsBtn = document.getElementById(
    'export-settings-btn',
  ) as HTMLButtonElement | null;
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', () => {
      chrome.storage.sync.get(null, (data: { [key: string]: any }) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookdrive-settings.json';
        if (a instanceof HTMLElement) (a as HTMLElement).click();
        showToast('Settings exported!', 'success');
      });
    });
  }
  // Import Settings
  const importSettingsBtn = document.getElementById(
    'import-settings-btn',
  ) as HTMLButtonElement | null;
  if (importSettingsBtn) {
    importSettingsBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (e: Event): void => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        reader.onload = (evt: ProgressEvent): void => {
          try {
            const data = JSON.parse(reader.result as string);
            if (typeof data !== 'object' || !data) throw new Error('Invalid format');
            chrome.storage.sync.set(data, () => {
              showToast('Settings imported! Reloading...', 'success');
              setTimeout(() => location.reload(), 1200);
            });
          } catch (err: unknown) {
            showToast('Import failed: ' + (err as Error).message, 'error');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  // Encryption toggle and passphrase
  const encryptionToggle = document.getElementById('encryption-toggle') as HTMLInputElement | null;
  const encryptionPass = document.getElementById(
    'encryption-passphrase',
  ) as HTMLInputElement | null;
  chrome.storage.sync.get(
    ['encryptionEnabled', 'encryptionPass'],
    (data: { encryptionEnabled?: boolean; encryptionPass?: string }) => {
      if (encryptionToggle) encryptionToggle.checked = !!data.encryptionEnabled;
      if (encryptionPass) encryptionPass.value = data.encryptionPass || '';
    },
  );
  if (encryptionToggle) {
    encryptionToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ encryptionEnabled: encryptionToggle.checked });
      showToast('Encryption ' + (encryptionToggle.checked ? 'enabled' : 'disabled'), 'info');
    });
  }
  if (encryptionPass) {
    encryptionPass.addEventListener('input', () => {
      chrome.storage.sync.set({ encryptionPass: encryptionPass.value });
    });
  }

  // Team Mode toggle and user email
  const teamModeToggle = document.getElementById('team-mode-toggle') as HTMLInputElement | null;
  const userEmailInput = document.getElementById('user-email') as HTMLInputElement | null;
  chrome.storage.sync.get(
    ['teamMode', 'userEmail'],
    (data: { teamMode?: boolean; userEmail?: string }) => {
      if (teamModeToggle) teamModeToggle.checked = !!data.teamMode;
      if (userEmailInput) userEmailInput.value = data.userEmail || '';
    },
  );
  if (teamModeToggle) {
    teamModeToggle.addEventListener('change', () => {
      chrome.storage.sync.set({ teamMode: teamModeToggle.checked });
      showToast('Team Mode ' + (teamModeToggle.checked ? 'enabled' : 'disabled'), 'info');
    });
  }
  if (userEmailInput) {
    userEmailInput.addEventListener('input', () => {
      chrome.storage.sync.set({ userEmail: userEmailInput.value });
    });
  }

  // Theme switching and system theme logic is handled below and in loadAndApplyUserTheme/applyTheme
  // All event listeners for sync, settings, etc. are already implemented

  // Show battery-aware sync status in UI
  chrome.storage.local.get('isOnBattery', (data: { isOnBattery?: boolean }) => {
    if (data.isOnBattery) {
      const badge = document.createElement('div');
      badge.textContent = 'Battery Saver: Low-power sync';
      badge.style.background = '#ffd600';
      badge.style.color = '#222';
      badge.style.fontWeight = 'bold';
      badge.style.padding = '0.25em 0.75em';
      badge.style.borderRadius = '6px';
      badge.style.margin = '0.5em 0';
      badge.style.fontSize = '0.95em';
      const homePanel = document.getElementById('home-panel') as HTMLElement | null;
      if (homePanel) homePanel.prepend(badge);
    }
  });

  // Show idle status in UI
  chrome.storage.local.get('idleStatus', (data: { idleStatus?: string }) => {
    if (data.idleStatus === 'paused') {
      const badge = document.createElement('div');
      badge.textContent = 'Sync Paused (Idle)';
      badge.style.background = '#bdbdbd';
      badge.style.color = '#222';
      badge.style.fontWeight = 'bold';
      badge.style.padding = '0.25em 0.75em';
      badge.style.borderRadius = '6px';
      badge.style.margin = '0.5em 0';
      badge.style.fontSize = '0.95em';
      const homePanel = document.getElementById('home-panel') as HTMLElement | null;
      if (homePanel) homePanel.prepend(badge);
    }
  });
  chrome.storage.onChanged.addListener(
    (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes.idleStatus) {
        location.reload();
      }
    },
  );

  // Sync Timeline Graph (Advanced tab)
  // Memoized chart rendering to prevent unnecessary re-renders
  const memoizedRenderSyncGraph = (() => {
    let lastRenderTime = 0;
    const RENDER_THROTTLE_MS = 500; // Prevent re-rendering too frequently

    return async (): Promise<void> => {
      const currentTime = Date.now();
      if (currentTime - lastRenderTime < RENDER_THROTTLE_MS) return;

      try {
        await perfTracker.measure('Sync Graph Render', async () => {
          const response = await new Promise<{ log?: SyncLog[] } | undefined>((resolve) => {
            chrome.runtime.sendMessage({ action: 'getSyncLog' }, resolve);
          });

          const logs = response && response.log ? response.log.slice(0, 30).reverse() : [];
          if (!logs.length) return;

          const ctx = document.getElementById('sync-graph-canvas') as HTMLCanvasElement | null;
          if (!ctx) return;

          const labels = logs.map((l: SyncLog) => new Date(l.time).toLocaleTimeString());
          const counts = logs.map((l: SyncLog) => l.bookmarkCount || 0);
          const statusColors = logs.map((l: SyncLog) =>
            l.status === 'success' ? '#388e3c' : l.status === 'no-change' ? '#1976d2' : '#d32f2f'
          );

          if (window.syncChart) window.syncChart.destroy();
          
          window.syncChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels,
              datasets: [
                {
                  label: 'Bookmark Count',
                  data: counts,
                  borderColor: '#1976d2',
                  backgroundColor: 'rgba(25, 118, 210, 0.1)',
                  pointBackgroundColor: statusColors,
                  pointRadius: 5,
                  fill: true,
                  tension: 0.2,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: function (ctx: any): string {
                      const l = logs[ctx.dataIndex];
                      return `${l.status}${l.error ? ': ' + l.error : ''} (${counts[ctx.dataIndex]} bookmarks)`;
                    },
                  },
                },
              },
              scales: {
                x: { display: false },
                y: { beginAtZero: true },
              },
            },
          });

          lastRenderTime = currentTime;
        });
      } catch (error) {
        console.error('Chart rendering failed:', error);
      }
    };
  })();

  // Call on load and when Advanced tab is shown
  const advancedTab = document.querySelector('.tab[data-tab="advanced"]') as HTMLElement | null;
  if (advancedTab) {
    advancedTab.addEventListener('click', memoizedRenderSyncGraph);
  }
  if (advancedTab && advancedTab.classList.contains('active')) {
    memoizedRenderSyncGraph();
  }

  // View Global Logs (notification hub)
  const viewGlobalLogsBtn = document.createElement('button');
  viewGlobalLogsBtn.textContent = 'View Global Logs';
  viewGlobalLogsBtn.style.marginTop = '1em';
  const syncGraphSection = document.getElementById('sync-graph-section') as HTMLElement | null;
  if (syncGraphSection) {
    syncGraphSection.appendChild(viewGlobalLogsBtn);
  }
  const viewGlobalLogsBtnEl = document.getElementById(
    'view-global-logs-btn',
  ) as HTMLButtonElement | null;
  if (viewGlobalLogsBtnEl) {
    viewGlobalLogsBtnEl.onclick = async (): Promise<void> => {
      try {
        const response = await new Promise<{
          logs?: {
            time: string;
            status: string;
            details?: { userAgent?: string };
            error?: string;
          }[];
        }>((resolve) => {
          chrome.runtime.sendMessage({ action: 'getGlobalLogs' }, resolve);
        });

        const logs = response.logs || [];
        
        // Use DocumentFragment for better performance
        const dialogFragment = document.createDocumentFragment();
        const dialog = document.createElement('div');
        dialog.className = 'modal';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('tabindex', '0');
        dialog.style.maxHeight = '70vh';
        dialog.style.overflowY = 'auto';
        dialog.style.padding = '1rem';
        dialog.style.backgroundColor = '#f5f5f5';

        const title = document.createElement('h2');
        title.textContent = 'Global Sync Logs';
        title.style.marginBottom = '1rem';
        dialog.appendChild(title);

        const logContainer = document.createElement('div');
        logContainer.style.maxHeight = '50vh';
        logContainer.style.overflowY = 'auto';

        // Virtual scrolling for performance with large log sets
        const renderLogs = (start: number, count: number) => {
          const fragment = document.createDocumentFragment();
          const end = Math.min(start + count, logs.length);
          
          for (let i = start; i < end; i++) {
            const l = logs[i];
            const logEntry = document.createElement('div');
            logEntry.style.marginBottom = '0.5em';
            logEntry.style.padding = '0.5em';
            logEntry.style.backgroundColor = '#ffffff';
            logEntry.style.borderRadius = '4px';
            
            const timeStatus = document.createElement('div');
            timeStatus.innerHTML = `<b>${l.time}</b> [${l.status}]`;
            
            const deviceInfo = document.createElement('div');
            deviceInfo.textContent = `Device: ${l.details?.userAgent || 'Unknown'}`;
            
            if (l.error) {
              const errorSpan = document.createElement('span');
              errorSpan.style.color = '#d32f2f';
              errorSpan.textContent = l.error;
              logEntry.appendChild(timeStatus);
              logEntry.appendChild(deviceInfo);
              logEntry.appendChild(errorSpan);
            } else {
              logEntry.appendChild(timeStatus);
              logEntry.appendChild(deviceInfo);
            }
            
            fragment.appendChild(logEntry);
          }
          
          return fragment;
        };

        // Initial render
        logContainer.appendChild(renderLogs(0, 50));

        // Add scroll event for lazy loading
        logContainer.addEventListener('scroll', () => {
          if (
            logContainer.scrollTop + logContainer.clientHeight >= 
            logContainer.scrollHeight - 100 // Threshold
          ) {
            const currentLogCount = logContainer.children.length;
            if (currentLogCount < logs.length) {
              logContainer.appendChild(renderLogs(currentLogCount, 50));
            }
          }
        });

        dialog.appendChild(logContainer);

        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.marginTop = '1rem';
        closeButton.style.padding = '0.5rem 1rem';
        closeButton.style.backgroundColor = '#1976d2';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '4px';
        closeButton.onclick = () => dialog.remove();

        dialog.appendChild(closeButton);
        dialogFragment.appendChild(dialog);
        document.body.appendChild(dialogFragment);

        dialog.focus();
      } catch (error) {
        console.error('Failed to fetch global logs:', error);
      }
    };
  }

  // Setup Wizard Logic (polished for accessibility and feedback)
  const wizard = document.getElementById('setup-wizard') as HTMLElement | null;
  const steps = [
    'wizard-step-welcome',
    'wizard-step-mode',
    'wizard-step-auth',
    'wizard-step-backup',
    'wizard-step-done',
  ];
  function showWizardStep(idx: number): void {
    steps.forEach((id, i) => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = i === idx ? '' : 'none';
        if (i === idx) {
          el.setAttribute('role', 'region');
          el.setAttribute('aria-label', `Setup Step ${idx + 1}`);
          // Focus first actionable element
          setTimeout(() => {
            const btn = el.querySelector('button, [tabindex="0"]');
            if (btn) (btn as HTMLElement).focus();
          }, 50);
        }
      }
    });
  }
  function startWizard(): void {
    if (wizard && popupRoot) {
      wizard.style.display = '';
      popupRoot.style.display = 'none';
      showWizardStep(0);
    }
  }
  chrome.storage.local.get('wizardComplete', (data: { wizardComplete?: boolean }) => {
    if (!data.wizardComplete) startWizard();
  });
  // Step navigation with keyboard support
  function wizardStepKeyHandler(e: KeyboardEvent, idx: number): void {
    if (e.key === 'Enter') {
      // Try to click the first primary button
      const btn = document.getElementById(steps[idx]) as HTMLElement | null;
      if (btn) {
        const firstBtn = btn.querySelector('button, [tabindex="0"]');
        if (firstBtn) (firstBtn as HTMLElement).click();
      }
    } else if (e.key === 'Escape') {
      if (idx > 0) showWizardStep(idx - 1);
    }
  }
  steps.forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e: KeyboardEvent) => wizardStepKeyHandler(e, idx));
    }
  });
  const wizardNext1 = document.getElementById('wizard-next-1') as HTMLButtonElement | null;
  if (wizardNext1) {
    wizardNext1.addEventListener('click', () => showWizardStep(1));
  }
  const wizardPrev2 = document.getElementById('wizard-prev-2') as HTMLButtonElement | null;
  if (wizardPrev2) {
    wizardPrev2.addEventListener('click', () => showWizardStep(0));
  }
  const wizardNext2 = document.getElementById('wizard-next-2') as HTMLButtonElement | null;
  if (wizardNext2) {
    wizardNext2.addEventListener('click', () => {
      // Save mode
      const mode = document.querySelector('input[name="wizard-mode"]:checked') as HTMLInputElement;
      if (mode) {
        chrome.storage.sync.set({ mode: mode.value });
        showWizardStep(2);
      }
    });
  }
  const wizardPrev3 = document.getElementById('wizard-prev-3') as HTMLButtonElement | null;
  if (wizardPrev3) {
    wizardPrev3.addEventListener('click', () => showWizardStep(1));
  }
  const wizardAuthBtn = document.getElementById('wizard-auth-btn') as HTMLButtonElement | null;
  if (wizardAuthBtn) {
    wizardAuthBtn.addEventListener('click', async () => {
      try {
        await getAuthToken(true);
        showWizardStep(3);
        showToast('Sign-in successful!', 'success');
      } catch (e: unknown) {
        showToast('Sign-in failed: ' + (e as Error).message, 'error');
      }
    });
  }
  const wizardBackupBtn = document.getElementById('wizard-backup-btn') as HTMLButtonElement | null;
  if (wizardBackupBtn) {
    wizardBackupBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage(
        { action: 'manualBackup' },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (response: { status?: string; error?: string } | undefined): void => {
          showWizardStep(4);
          showToast('Backup complete!', 'success');
        },
      );
    });
  }
  const wizardSkipBackupBtn = document.getElementById(
    'wizard-skip-backup-btn',
  ) as HTMLButtonElement | null;
  if (wizardSkipBackupBtn) {
    wizardSkipBackupBtn.addEventListener('click', () => showWizardStep(4));
  }
  const wizardDoneBtn = document.getElementById('wizard-done-btn') as HTMLButtonElement | null;
  if (wizardDoneBtn) {
    wizardDoneBtn.addEventListener('click', () => {
      chrome.storage.local.set({ wizardComplete: true }, () => {
        if (wizard && popupRoot) {
          wizard.style.display = 'none';
          popupRoot.style.display = '';
          showToast('Setup complete!', 'success');
        }
      });
    });
  }
  loadAndApplyUserTheme();
  setupThemeSwitchListener();
  setupSyncEventListeners();
});

// Keyboard navigation for tabs (left/right arrow keys)
document.addEventListener('DOMContentLoaded', () => {
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('.tab'));
  tabs.forEach((tab, idx) => {
    tab.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        let newIdx = idx + (e.key === 'ArrowRight' ? 1 : -1);
        if
