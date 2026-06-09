import { loadAlertSettings } from './alertSettingsStorage';
import {
  CONSTRUCTION_ALERT_MINUTES,
  CONSTRUCTION_QUEUE_STORAGE_KEY,
  CONSTRUCTION_QUEUE_UPDATED_MESSAGE,
  type ConstructionItem,
  type StoredConstructionQueue,
} from '../types/construction';

const EMPTY_QUEUE: StoredConstructionQueue = { items: [], lastUpdated: 0 };

export async function loadConstructionQueue(): Promise<StoredConstructionQueue> {
  const result = await browser.storage.local.get(CONSTRUCTION_QUEUE_STORAGE_KEY);
  const stored = result[CONSTRUCTION_QUEUE_STORAGE_KEY] as StoredConstructionQueue | undefined;
  if (!stored) return { ...EMPTY_QUEUE };
  return {
    items: Array.isArray(stored.items) ? stored.items : [],
    lastUpdated: stored.lastUpdated ?? 0,
  };
}

export async function saveConstructionQueue(queue: StoredConstructionQueue) {
  await browser.storage.local.set({ [CONSTRUCTION_QUEUE_STORAGE_KEY]: queue });
}

export function notifyConstructionQueueUpdated(queue: StoredConstructionQueue) {
  browser.runtime
    .sendMessage({ type: CONSTRUCTION_QUEUE_UPDATED_MESSAGE, payload: queue })
    .catch(() => {});
}

export async function upsertCityConstruction(cityId: string, incoming: ConstructionItem[]) {
  const previous = await loadConstructionQueue();
  const now = Date.now();
  const withoutCity = previous.items.filter((item) => item.cityId !== cityId);
  const activeIncoming = incoming.filter((item) => item.finishTime > now - 60000);

  const queue: StoredConstructionQueue = {
    items: [...withoutCity, ...activeIncoming],
    lastUpdated: now,
  };

  await saveConstructionQueue(queue);
  notifyConstructionQueueUpdated(queue);
  await scheduleConstructionAlarms(queue.items);
  return queue;
}

export async function scheduleConstructionAlarms(items: ConstructionItem[]) {
  const settings = await loadAlertSettings();
  if (!settings.masterEnabled || !settings.construction.enabled) return;

  const existingAlarms = await browser.alarms.getAll();
  for (const alarm of existingAlarms) {
    if (alarm.name.startsWith('construction-')) {
      await browser.alarms.clear(alarm.name);
    }
  }

  const alertMs = CONSTRUCTION_ALERT_MINUTES * 60 * 1000;
  const now = Date.now();

  for (const item of items) {
    const fireAt = item.finishTime - alertMs;
    if (fireAt <= now) continue;
    await browser.alarms.create(`construction-${item.id}`, { when: fireAt });
  }
}
