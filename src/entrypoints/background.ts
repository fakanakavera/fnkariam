import { evaluateAlerts } from '../utils/alertEngine';
import { GAME_STATE_STORAGE_KEY } from '../types/gameState';
import type { StoredGameState } from '../types/gameState';
import { CONSTRUCTION_ALERT_MINUTES } from '../types/construction';
import { loadAlertSettings } from '../storage/alertSettingsStorage';
import { loadConstructionQueue } from '../storage/constructionStorage';

export default defineBackground(() => {
  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes[GAME_STATE_STORAGE_KEY]?.newValue) {
      void evaluateAlerts(changes[GAME_STATE_STORAGE_KEY].newValue as StoredGameState);
    }
  });

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (!alarm.name.startsWith('construction-')) return;

    const settings = await loadAlertSettings();
    if (!settings.masterEnabled || !settings.construction.enabled) return;

    const queue = await loadConstructionQueue();
    const item = queue.items.find((entry) => `construction-${entry.id}` === alarm.name);
    if (!item) return;

    await browser.notifications.create(alarm.name, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/wxt.svg'),
      title: 'ika-ext — Construção terminando',
      message: `${item.buildingName} (${item.cityName}) termina em ~${CONSTRUCTION_ALERT_MINUTES} minutos`,
    });
  });

  void browser.storage.local.get(GAME_STATE_STORAGE_KEY).then((result) => {
    const state = result[GAME_STATE_STORAGE_KEY] as StoredGameState | undefined;
    if (state) void evaluateAlerts(state);
  });
});
