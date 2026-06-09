import { evaluateAlerts } from '../utils/alertEngine';
import { GAME_STATE_STORAGE_KEY } from '../types/gameState';
import type { StoredGameState } from '../types/gameState';
import {
  CONSTRUCTION_QUEUE_STORAGE_KEY,
  CONSTRUCTION_SYNC_ALARM,
} from '../types/construction';
import {
  ensureConstructionSyncAlarm,
  runConstructionAlertCheck,
} from '../storage/constructionStorage';

export default defineBackground(() => {
  void ensureConstructionSyncAlarm();
  void runConstructionAlertCheck();

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes[GAME_STATE_STORAGE_KEY]?.newValue) {
      void evaluateAlerts(changes[GAME_STATE_STORAGE_KEY].newValue as StoredGameState);
    }

    if (changes[CONSTRUCTION_QUEUE_STORAGE_KEY]?.newValue) {
      void runConstructionAlertCheck();
    }
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CONSTRUCTION_SYNC_ALARM) {
      void runConstructionAlertCheck();
    }
  });

  void browser.storage.local.get(GAME_STATE_STORAGE_KEY).then((result) => {
    const state = result[GAME_STATE_STORAGE_KEY] as StoredGameState | undefined;
    if (state) void evaluateAlerts(state);
  });
});
