import { getSettings, setSettings, Settings, Mode, Theme } from '../lib/storage';

/**
 * Utility: Show a toast message in the options page.
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const toast = document.getElementById('toast-container');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.background =
    type === 'success' ? '#43a047' : type === 'error' ? '#e53935' : '#1976d2';
  toast.style.color = '#fff';
  toast.style.padding = '0.75em 1.5em';
  toast.style.borderRadius = '6px';
  toast.style.position = 'fixed';
  toast.style.bottom = '2em';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.zIndex = '10001';
  toast.setAttribute('role', 'status');
  setTimeout(() => {
    toast.style.display = 'none';
  }, 2000);
}

/**
 * Load settings from chrome.storage and populate the form.
 */
async function loadSettings(): Promise<void> {
  try {
    const settings: Settings = await getSettings();
    (document.getElementById('theme-select') as HTMLSelectElement).value = settings.theme;
    (document.getElementById('mode-select') as HTMLSelectElement).value = settings.mode;
    (document.getElementById('auto-sync-toggle') as HTMLInputElement).checked = settings.autoSync;
    (document.getElementById('sync-interval') as HTMLInputElement).value = String(
      settings.syncInterval,
    );
    (document.getElementById('team-mode-toggle') as HTMLInputElement).checked = Boolean(
      (settings as any).teamMode,
    );
    (document.getElementById('user-email') as HTMLInputElement).value =
      (settings as any).userEmail || '';
    (document.getElementById('verbose-logs-toggle') as HTMLInputElement).checked =
      settings.verboseLogs;
    chrome.storage.sync.get({ perfLogs: false }, ({ perfLogs }) => {
      (document.getElementById('perf-logs-toggle') as HTMLInputElement).checked = !!perfLogs;
    });
  } catch (e: unknown) {
    showToast('Failed to load settings', 'error');
  }
}

/**
 * Validate and save settings from the form to chrome.storage.
 */
async function saveSettings(e: Event): Promise<void> {
  e.preventDefault();
  try {
    const theme = (document.getElementById('theme-select') as HTMLSelectElement).value as Theme;
    const mode = (document.getElementById('mode-select') as HTMLSelectElement).value as Mode;
    const autoSync = (document.getElementById('auto-sync-toggle') as HTMLInputElement).checked;
    const syncInterval = parseInt(
      (document.getElementById('sync-interval') as HTMLInputElement).value,
      10,
    );
    const teamMode = (document.getElementById('team-mode-toggle') as HTMLInputElement).checked;
    const userEmail = (document.getElementById('user-email') as HTMLInputElement).value.trim();
    const verboseLogs = (document.getElementById('verbose-logs-toggle') as HTMLInputElement)
      .checked;
    const perfLogs = (document.getElementById('perf-logs-toggle') as HTMLInputElement).checked;

    if (isNaN(syncInterval) || syncInterval < 5 || syncInterval > 30) {
      showToast('Sync interval must be between 5 and 30 minutes', 'error');
      (document.getElementById('sync-interval') as HTMLInputElement).focus();
      return;
    }
    if (teamMode && !userEmail) {
      showToast('Email required for Team Mode', 'error');
      (document.getElementById('user-email') as HTMLInputElement).focus();
      return;
    }
    // Compose settings update
    const updates: Partial<Settings> & { teamMode?: boolean; userEmail?: string } = {
      theme,
      mode,
      autoSync,
      syncInterval,
      verboseLogs,
      teamMode,
      userEmail: teamMode ? userEmail : '',
    };
    await setSettings(updates);
    chrome.storage.sync.set({ perfLogs });
    showToast('Settings saved!', 'success');
  } catch (e: unknown) {
    showToast('Failed to save settings', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', saveSettings);
  }
  // Accessibility: focus first input
  const firstInput = document.querySelector('select, input');
  if (firstInput instanceof HTMLElement) {
    firstInput.focus();
  }
});
