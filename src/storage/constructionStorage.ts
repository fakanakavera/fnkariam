import { loadAlertSettings } from './alertSettingsStorage';
import {
  CONSTRUCTION_ALERT_MINUTES,
  CONSTRUCTION_NOTIFIED_STORAGE_KEY,
  CONSTRUCTION_QUEUE_STORAGE_KEY,
  CONSTRUCTION_QUEUE_UPDATED_MESSAGE,
  CONSTRUCTION_SYNC_ALARM,
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

async function loadNotifiedConstruction(): Promise<Record<string, number>> {
  const result = await browser.storage.local.get(CONSTRUCTION_NOTIFIED_STORAGE_KEY);
  return (result[CONSTRUCTION_NOTIFIED_STORAGE_KEY] as Record<string, number> | undefined) ?? {};
}

async function saveNotifiedConstruction(notified: Record<string, number>) {
  await browser.storage.local.set({ [CONSTRUCTION_NOTIFIED_STORAGE_KEY]: notified });
}

export async function ensureConstructionSyncAlarm() {
  const existing = await browser.alarms.get(CONSTRUCTION_SYNC_ALARM);
  if (!existing) {
    await browser.alarms.create(CONSTRUCTION_SYNC_ALARM, { periodInMinutes: 1 });
  }
}

async function fireConstructionNotification(item: ConstructionItem) {
  const remainingMin = Math.max(1, Math.ceil((item.finishTime - Date.now()) / 60000));
  await browser.notifications.create(`construction-alert-${item.id}`, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon-48.png'),
    title: 'ika-ext — Construção terminando',
    message: `${item.buildingName} (${item.cityName}) termina em ~${remainingMin} min`,
  });
}

export async function runConstructionAlertCheck() {
  const settings = await loadAlertSettings();
  if (!settings.masterEnabled || !settings.construction.enabled) return;

  const queue = await loadConstructionQueue();
  const notified = await loadNotifiedConstruction();
  const now = Date.now();
  const alertWindowMs = CONSTRUCTION_ALERT_MINUTES * 60 * 1000;
  const activeIds = new Set(queue.items.map((item) => item.id));
  const nextNotified: Record<string, number> = {};

  for (const [id, ts] of Object.entries(notified)) {
    if (activeIds.has(id)) nextNotified[id] = ts;
  }

  for (const item of queue.items) {
    const remaining = item.finishTime - now;
    if (remaining <= 0) continue;
    if (remaining > alertWindowMs) continue;
    if (nextNotified[item.id]) continue;

    await fireConstructionNotification(item);
    nextNotified[item.id] = now;
  }

  await saveNotifiedConstruction(nextNotified);
}

export async function upsertCityConstruction(cityId: string, incoming: ConstructionItem[]) {
  const previous = await loadConstructionQueue();
  const now = Date.now();
  const withoutCity = previous.items.filter((item) => item.cityId !== cityId);
  const activeIncoming = incoming.filter(
    (item) => item.finishTime > now - 60000 && item.buildingId >= 0 && item.buildingName,
  );

  const queue: StoredConstructionQueue = {
    items: [...withoutCity, ...activeIncoming],
    lastUpdated: now,
  };

  await saveConstructionQueue(queue);
  notifyConstructionQueueUpdated(queue);
  await ensureConstructionSyncAlarm();
  await runConstructionAlertCheck();
  return queue;
}
