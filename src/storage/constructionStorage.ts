import { loadAlertSettings } from './alertSettingsStorage';
import {
  CONSTRUCTION_ALERT_MINUTES,
  CONSTRUCTION_FINISH_ALARM_PREFIX,
  CONSTRUCTION_NOTIFIED_STORAGE_KEY,
  CONSTRUCTION_QUEUE_STORAGE_KEY,
  CONSTRUCTION_QUEUE_UPDATED_MESSAGE,
  CONSTRUCTION_SYNC_ALARM,
  type ConstructionItem,
  type StoredConstructionQueue,
} from '../types/construction';

const EMPTY_QUEUE: StoredConstructionQueue = { items: [], lastUpdated: 0 };

function isQuietHour(hour: number, start: number, end: number) {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function finishAlarmName(item: ConstructionItem): string {
  return `${CONSTRUCTION_FINISH_ALARM_PREFIX}${item.id}`;
}

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

async function clearConstructionFinishAlarms() {
  const alarms = await browser.alarms.getAll();
  await Promise.all(
    alarms
      .filter((alarm) => alarm.name.startsWith(CONSTRUCTION_FINISH_ALARM_PREFIX))
      .map((alarm) => browser.alarms.clear(alarm.name)),
  );
}

export async function scheduleConstructionFinishAlarms(queue: StoredConstructionQueue) {
  const settings = await loadAlertSettings();
  await clearConstructionFinishAlarms();

  if (!settings.masterEnabled || !settings.construction.enabled) return;

  const now = Date.now();
  const alertLeadMs = CONSTRUCTION_ALERT_MINUTES * 60 * 1000;

  for (const item of queue.items) {
    const remaining = item.finishTime - now;
    if (remaining <= 0) continue;

    const fireAt = item.finishTime - alertLeadMs;
    if (fireAt <= now) continue;

    await browser.alarms.create(finishAlarmName(item), { when: fireAt });
  }
}

async function fireConstructionNotification(item: ConstructionItem) {
  const settings = await loadAlertSettings();
  if (settings.quietHours.enabled) {
    const hour = new Date().getHours();
    if (isQuietHour(hour, settings.quietHours.startHour, settings.quietHours.endHour)) {
      return;
    }
  }

  const remainingMin = Math.max(1, Math.ceil((item.finishTime - Date.now()) / 60000));

  try {
    await browser.notifications.create(`construction-alert-${item.id}`, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon-48.png'),
      title: 'ika-ext — Construção terminando',
      message: `${item.buildingName} (${item.cityName}) termina em ~${remainingMin} min`,
    });
  } catch (error) {
    console.error('[constructionStorage] Falha ao criar notificação:', error);
  }
}

export async function runConstructionAlertCheck() {
  const settings = await loadAlertSettings();
  if (!settings.masterEnabled || !settings.construction.enabled) return;

  if (settings.quietHours.enabled) {
    const hour = new Date().getHours();
    if (isQuietHour(hour, settings.quietHours.startHour, settings.quietHours.endHour)) return;
  }

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

/** Background-only: schedule alarms and run the 5-minute window check. */
export async function syncConstructionAlerts() {
  const queue = await loadConstructionQueue();
  await ensureConstructionSyncAlarm();
  await scheduleConstructionFinishAlarms(queue);
  await runConstructionAlertCheck();
}

export async function handleConstructionFinishAlarm(alarmName: string) {
  const itemId = alarmName.slice(CONSTRUCTION_FINISH_ALARM_PREFIX.length);
  const queue = await loadConstructionQueue();
  const item = queue.items.find((entry) => entry.id === itemId);
  if (!item) return;

  const notified = await loadNotifiedConstruction();
  if (notified[item.id]) return;

  await fireConstructionNotification(item);
  await saveNotifiedConstruction({ ...notified, [item.id]: Date.now() });
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
  return queue;
}
