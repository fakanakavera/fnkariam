import {
  ALERT_SETTINGS_STORAGE_KEY,
  ALERT_STATE_STORAGE_KEY,
  DEFAULT_ALERT_SETTINGS,
  DEFAULT_ALERT_STATE,
  type AlertSettings,
  type AlertState,
} from '../types/alerts';

export async function loadAlertSettings(): Promise<AlertSettings> {
  const result = await browser.storage.local.get(ALERT_SETTINGS_STORAGE_KEY);
  const stored = result[ALERT_SETTINGS_STORAGE_KEY] as AlertSettings | undefined;
  if (!stored) return { ...DEFAULT_ALERT_SETTINGS };
  return { ...DEFAULT_ALERT_SETTINGS, ...stored };
}

export async function saveAlertSettings(settings: AlertSettings) {
  await browser.storage.local.set({ [ALERT_SETTINGS_STORAGE_KEY]: settings });
}

export async function loadAlertState(): Promise<AlertState> {
  const result = await browser.storage.local.get(ALERT_STATE_STORAGE_KEY);
  const stored = result[ALERT_STATE_STORAGE_KEY] as AlertState | undefined;
  if (!stored) return { ...DEFAULT_ALERT_STATE };
  return { lastFired: stored.lastFired || {} };
}

export async function saveAlertState(state: AlertState) {
  await browser.storage.local.set({ [ALERT_STATE_STORAGE_KEY]: state });
}
