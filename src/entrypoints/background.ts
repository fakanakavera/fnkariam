import { evaluateAlerts } from '../utils/alertEngine';
import { GAME_STATE_STORAGE_KEY } from '../types/gameState';
import type { StoredGameState } from '../types/gameState';
import {
  CONSTRUCTION_FINISH_ALARM_PREFIX,
  CONSTRUCTION_QUEUE_STORAGE_KEY,
  CONSTRUCTION_QUEUE_UPDATED_MESSAGE,
  CONSTRUCTION_SYNC_ALARM,
} from '../types/construction';
import {
  handleConstructionFinishAlarm,
  runConstructionAlertCheck,
  syncConstructionAlerts,
} from '../storage/constructionStorage';

export default defineBackground(() => {
  void syncConstructionAlerts();

  browser.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;

    if (changes[GAME_STATE_STORAGE_KEY]?.newValue) {
      void evaluateAlerts(changes[GAME_STATE_STORAGE_KEY].newValue as StoredGameState);
    }

    if (changes[CONSTRUCTION_QUEUE_STORAGE_KEY]?.newValue) {
      void syncConstructionAlerts();
    }
  });

  browser.runtime.onMessage.addListener((message: { type?: string }) => {
    if (message.type === CONSTRUCTION_QUEUE_UPDATED_MESSAGE) {
      void syncConstructionAlerts();
    }
  });

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CONSTRUCTION_SYNC_ALARM) {
      void runConstructionAlertCheck();
      return;
    }

    if (alarm.name.startsWith(CONSTRUCTION_FINISH_ALARM_PREFIX)) {
      void handleConstructionFinishAlarm(alarm.name);
    }
  });

  void browser.storage.local.get(GAME_STATE_STORAGE_KEY).then((result) => {
    const state = result[GAME_STATE_STORAGE_KEY] as StoredGameState | undefined;
    if (state) void evaluateAlerts(state);
  });
});
