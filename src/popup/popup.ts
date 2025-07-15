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
  bookmarkCount?: number;
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

// Global references for sync status
const syncNowBtn = document.getElementById('sync-now-btn') as HTMLButtonElement | null;
const syncStatus = document.getElementById('sync-status') as HTMLElement | null;

function updateLastSyncStatus(): void {
  if (!syncStatus) return;
  chrome.storage.local.get(
    ['lastSync', 'lastSyncStatus'],
    (data: { lastSync?: string; lastSyncStatus?: string }) => {
      if (data.lastSync) {
        syncStatus.textContent = `Last: ${new Date(data.lastSync).toLocaleString()} (${data.lastSyncStatus})`;
      }
    },
  );
}

// Theme management
function applyTheme(theme: string): void {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function setupThemeHandling(): void {
  // Load and apply theme
  chrome.storage.sync.get({ theme: 'auto' }, ({ theme }: { theme: string }) => {
    applyTheme(theme);
  });

  // Theme select event listener
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement | null;
  if (themeSelect) {
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

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    chrome.storage.sync.get({ theme: 'auto' }, ({ theme }: { theme: string }) => {
      if (theme === 'auto') applyTheme(theme);
    });
  });
}

// Tab management
function setupTabNavigation(): void {
  const tabs = document.querySelectorAll<HTMLElement>('.tab');
  const panels = document.querySelectorAll<HTMLElement>('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
        t.setAttribute('tabindex', '-1');
      });
      
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      tab.setAttribute('tabindex', '0');
      
      panels.forEach((panel) => panel.classList.add('hidden'));
      const panelId = tab.dataset.tab ? tab.dataset.tab + '-panel' : '';
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.remove('hidden');
    });

    // Keyboard navigation for tabs
    tab.addEventListener('keydown', (e: KeyboardEvent) => {
      const tabsArray = Array.from(tabs);
      const currentIndex = tabsArray.indexOf(tab);
      
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        let newIndex = currentIndex + (e.key === 'ArrowRight' ? 1 : -1);
        if (newIndex >= tabsArray.length) newIndex = 0;
        if (newIndex < 0) newIndex = tabsArray.length - 1;
        
        (tabsArray[newIndex] as HTMLElement).click();
        (tabsArray[newIndex] as HTMLElement).focus();
      }
    });
  });
}

// Sync functionality
function setupSyncHandling(): void {
  if (syncNowBtn) {
    syncNowBtn.addEventListener('click', () => {
      if (syncStatus) syncStatus.textContent = 'Syncing...';
      chrome.runtime.sendMessage({ action: 'syncNow' }, (response: any) => {
        if (response && response.status === 'ok') {
          if (syncStatus) syncStatus.textContent = 'Sync complete';
          updateLastSyncStatus();
          showToast('Sync complete!', 'success');
        } else {
          if (syncStatus) syncStatus.textContent = 'Sync failed';
          const errorMsg = response?.error || 'Unknown error';
          showToast('Sync failed: ' + errorMsg, 'error');
        }
      });
    });
  }

  // Listen for network status updates
  chrome.runtime.onMessage.addListener((message: { action: string; online: boolean }) => {
    if (message.action === 'networkStatus') {
      if (!message.online && syncStatus) {
        syncStatus.textContent = 'No internet. Sync paused and will resume once connected.';
      } else {
        updateLastSyncStatus();
      }
    }
  });
}

// Settings management
function setupSettingsHandling(): void {
  // Mode select
  const modeSelect = document.getElementById('mode-select') as HTMLSelectElement | null;
  if (modeSelect) {
    getMode().then((mode: string) => {
      modeSelect.value = mode;
    });
    
    modeSelect.addEventListener('change', () => {
      const newMode = modeSelect.value;
      chrome.storage.sync.set({ mode: newMode }, () => {
        const syncModeEl = document.getElementById('sync-mode') as HTMLElement | null;
        if (syncModeEl) syncModeEl.textContent = newMode === 'host' ? 'Host-to-Many' : 'Global Sync';
      });
    });
  }

  // Auto sync toggle and interval
  const autoSyncToggle = document.getElementById('auto-sync-toggle') as HTMLInputElement | null;
  const syncIntervalInput = document.getElementById('sync-interval') as HTMLInputElement | null;
  
  getSettings().then((settings: Settings) => {
    if (autoSyncToggle) autoSyncToggle.checked = settings.autoSync;
    if (syncIntervalInput) syncIntervalInput.value = String(settings.syncInterval);
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

  // Team Mode
  const teamModeToggle = document.getElementById('team-mode-toggle') as HTMLInputElement | null;
  const userEmailInput = document.getElementById('user-email') as HTMLInputElement | null;
  
  chrome.storage.sync.get(['teamMode', 'userEmail'], (data: { teamMode?: boolean; userEmail?: string }) => {
    if (teamModeToggle) teamModeToggle.checked = !!data.teamMode;
    if (userEmailInput) userEmailInput.value = data.userEmail || '';
  });

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
}

// Advanced features
function setupAdvancedFeatures(): void {
  // Verbose logs toggle
  const verboseLogsToggle = document.getElementById('verbose-logs-toggle') as HTMLInputElement | null;
  if (verboseLogsToggle) {
    getVerboseLogs().then((val: boolean) => {
      verboseLogsToggle.checked = val;
    });
    
    verboseLogsToggle.addEventListener('change', () => {
      setVerboseLogs(verboseLogsToggle.checked);
      showToast('Verbose logs ' + (verboseLogsToggle.checked ? 'enabled' : 'disabled'), 'info');
    });
  }

  // Drive cleanup
  const driveCleanupBtn = document.getElementById('drive-cleanup-btn') as HTMLButtonElement | null;
  if (driveCleanupBtn) {
    driveCleanupBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'cleanupBackups' }, (response: any) => {
        if (response?.status === 'ok') {
          showToast('Drive backup cleanup complete!', 'success');
        } else {
          showToast('Drive cleanup failed: ' + (response?.error || 'Unknown error'), 'error');
        }
      });
    });
  }

  // Manual backup
  const manualBackupBtn = document.getElementById('manual-backup-btn') as HTMLButtonElement | null;
  if (manualBackupBtn) {
    manualBackupBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'manualBackup' }, (response: any) => {
        if (response?.status === 'ok') {
          showToast('Manual backup complete!', 'success');
        } else {
          showToast('Manual backup failed: ' + (response?.error || 'Unknown error'), 'error');
        }
      });
    });
  }

  // Settings export/import
  setupSettingsExportImport();
}

function setupSettingsExportImport(): void {
  const exportBtn = document.getElementById('export-settings-btn') as HTMLButtonElement | null;
  const importBtn = document.getElementById('import-settings-btn') as HTMLButtonElement | null;

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      chrome.storage.sync.get(null, (data: { [key: string]: any }) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bookdrive-settings.json';
        a.click();
        showToast('Settings exported!', 'success');
      });
    });
  }

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = () => {
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
}

// Logs functionality
function setupLogsHandling(): void {
  function renderLogs(): void {
    chrome.runtime.sendMessage({ action: 'getSyncLog' }, (response: { log?: SyncLog[] }) => {
      const logs = response?.log?.slice(0, 5) || [];
      const logsList = document.getElementById('logs-list') as HTMLElement | null;
      
      if (logsList) {
        if (logs.length === 0) {
          logsList.textContent = 'No syncs yet.';
        } else {
          logsList.innerHTML = logs
            .map((log: SyncLog) => 
              `<div><b>${log.time}</b> [${log.mode}] - ${log.status}${log.error ? ': ' + log.error : ''}</div>`
            )
            .join('');
        }
      }
    });
  }

  renderLogs();

  const downloadLogBtn = document.getElementById('download-log-btn') as HTMLButtonElement | null;
  if (downloadLogBtn) {
    downloadLogBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'downloadSyncLog' }, (response: { url?: string }) => {
        if (response?.url) {
          const a = document.createElement('a');
          a.href = response.url;
          a.download = 'bookmark-sync-log.json';
          a.click();
        }
      });
    });
  }
}

// Sync timeline graph
function setupSyncGraph(): void {
  const renderSyncGraph = async (): Promise<void> => {
    try {
      await perfTracker.measure('Sync Graph Render', async () => {
        const response = await new Promise<{ log?: SyncLog[] }>((resolve) => {
          chrome.runtime.sendMessage({ action: 'getSyncLog' }, resolve);
        });

        const logs = response?.log?.slice(0, 30).reverse() || [];
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
            datasets: [{
              label: 'Bookmark Count',
              data: counts,
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              pointBackgroundColor: statusColors,
              pointRadius: 5,
              fill: true,
              tension: 0.2,
            }],
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
      });
    } catch (error) {
      console.error('Chart rendering failed:', error);
    }
  };

  const advancedTab = document.querySelector('.tab[data-tab="advanced"]') as HTMLElement | null;
  if (advancedTab) {
    advancedTab.addEventListener('click', renderSyncGraph);
  }
}

// Onboarding and authentication
async function handleOnboarding(): Promise<void> {
  const onboarding = document.getElementById('onboarding') as HTMLElement | null;
  const popupRoot = document.getElementById('popup-root') as HTMLElement | null;

  // Check OAuth2 client_id
  let hasClientId = false;
  try {
    const manifest = chrome.runtime.getManifest();
    hasClientId = !!(manifest.oauth2?.client_id && !manifest.oauth2.client_id.startsWith('YOUR_'));
  } catch {}

  // Check if signed in
  let signedIn = false;
  try {
    signedIn = await isSignedIn();
  } catch {}

  if (!hasClientId || !signedIn) {
    if (onboarding) onboarding.style.display = '';
    if (popupRoot) popupRoot.style.display = 'none';
    
    if (!hasClientId) {
      const clientIdSection = document.getElementById('onboarding-clientid');
      if (clientIdSection) clientIdSection.style.display = '';
    } else {
      setupSignInButton();
    }
  } else {
    if (onboarding) onboarding.style.display = 'none';
    if (popupRoot) popupRoot.style.display = '';
  }
}

function setupSignInButton(): void {
  const signinBtn = document.getElementById('onboarding-signin-btn') as HTMLButtonElement | null;
  if (signinBtn) {
    signinBtn.onclick = async () => {
      try {
        await getAuthToken(true);
        location.reload(); // Reload to show main interface
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e);
        showToast('Sign-in failed: ' + errMsg, 'error');
      }
    };
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await handleOnboarding();
  
  // Setup all functionality
  setupThemeHandling();
  setupTabNavigation();
  setupSyncHandling();
  setupSettingsHandling();
  setupAdvancedFeatures();
  setupLogsHandling();
  setupSyncGraph();

  // Display device ID and sync mode
  getDeviceId().then((id: string) => {
    const deviceIdEl = document.getElementById('device-id');
    if (deviceIdEl) deviceIdEl.textContent = id;
  });

  getMode().then((mode: string) => {
    const syncModeEl = document.getElementById('sync-mode');
    if (syncModeEl) syncModeEl.textContent = mode === 'host' ? 'Host-to-Many' : 'Global Sync';
  });

  updateLastSyncStatus();

  // Show status badges
  chrome.storage.local.get(['isOnBattery', 'idleStatus'], (data) => {
    const homePanel = document.getElementById('home-panel');
    if (!homePanel) return;

    if (data.isOnBattery) {
      const badge = document.createElement('div');
      badge.textContent = 'Battery Saver: Low-power sync';
      badge.className = 'status-badge battery-saver';
      homePanel.prepend(badge);
    }

    if (data.idleStatus === 'paused') {
      const badge = document.createElement('div');
      badge.textContent = 'Sync Paused (Idle)';
      badge.className = 'status-badge idle-paused';
      homePanel.prepend(badge);
    }
  });
});