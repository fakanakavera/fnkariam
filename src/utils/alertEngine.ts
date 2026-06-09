import { loadAlertSettings, loadAlertState, saveAlertState } from '../storage/alertSettingsStorage';
import { GAME_STATE_STORAGE_KEY } from '../types/gameState';
import type { StoredGameState } from '../types/gameState';
import type { City } from '../types/game';
import { RESOURCE_INDEX, RESOURCE_KEYS, RESOURCE_LABELS, formatWineTimeLeft } from './resourceUtils';

const ALERT_COOLDOWN_MS = 60 * 60 * 1000;

interface PendingAlert {
  key: string;
  title: string;
  message: string;
}

function isQuietHour(hour: number, start: number, end: number) {
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function getWarehouseAlerts(cities: City[], thresholdPercent: number): PendingAlert[] {
  const alerts: PendingAlert[] = [];

  cities.forEach((city) => {
    if (!city.details) return;
    const safe = city.details.safeResources || 0;
    if (safe <= 0) return;

    const limit = (safe * thresholdPercent) / 100;

    RESOURCE_KEYS.forEach((resource) => {
      const stock = city.details!.currentResources[RESOURCE_INDEX[resource]] || 0;
      if (stock >= limit) {
        const over = stock > safe;
        alerts.push({
          key: `warehouse-${city.id}-${resource}`,
          title: over ? 'Armazém acima do seguro' : 'Armazém perto do limite',
          message: `${city.name}: ${RESOURCE_LABELS[resource]} ${stock.toLocaleString('pt-BR')} / ${safe.toLocaleString('pt-BR')} seguro`,
        });
      }
    });
  });

  return alerts;
}

function getGoldAlert(state: StoredGameState, minimum: number): PendingAlert | null {
  const gold = state.account?.gold || 0;
  if (gold >= minimum) return null;

  const income = state.account?.income || 0;
  const upkeep = state.account?.upkeep || 0;
  const scientists = state.account?.scientistsUpkeep || 0;
  const netGold = income + upkeep + scientists;

  let message = `Ouro atual: ${gold.toFixed(0)} (mínimo: ${minimum})`;
  if (netGold < 0 && gold > 0) {
    const hoursLeft = gold / Math.abs(netGold);
    message += `. Falência em ~${Math.floor(hoursLeft)}h`;
  }

  return {
    key: 'gold-low',
    title: 'Ouro baixo',
    message,
  };
}

function getStaleCityAlerts(cities: City[], hours: number): PendingAlert[] {
  const thresholdMs = hours * 60 * 60 * 1000;
  const now = Date.now();
  const stale = cities.filter((city) => !city.lastUpdate || now - city.lastUpdate > thresholdMs);
  if (stale.length === 0) return [];

  return [
    {
      key: 'stale-cities',
      title: 'Cidades desatualizadas',
      message: `${stale.length} cidade(s) sem dados recentes: ${stale.map((c) => c.name).join(', ')}`,
    },
  ];
}

function getWineAlerts(cities: City[], hoursRemaining: number): PendingAlert[] {
  const alerts: PendingAlert[] = [];

  cities.forEach((city) => {
    if (!city.details) return;
    const stock = city.details.currentResources[1] || 0;
    const spending = city.details.wineSpendings || 0;
    if (!spending) return;

    const hours = stock / spending;
    if (hours < hoursRemaining) {
      alerts.push({
        key: `wine-${city.id}`,
        title: 'Risco de corrupção',
        message: `${city.name}: vinho acaba em ${formatWineTimeLeft(stock, spending)} (${spending}/h)`,
      });
    }
  });

  return alerts;
}

async function fireAlert(alert: PendingAlert, state: { lastFired: Record<string, number> }) {
  const last = state.lastFired[alert.key] || 0;
  if (Date.now() - last < ALERT_COOLDOWN_MS) return;

  await browser.notifications.create(alert.key, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/wxt.svg'),
    title: `ika-ext — ${alert.title}`,
    message: alert.message,
  });

  state.lastFired[alert.key] = Date.now();
}

export async function evaluateAlerts(gameState?: StoredGameState) {
  const settings = await loadAlertSettings();
  if (!settings.masterEnabled) return;

  const now = new Date();
  if (
    settings.quietHours.enabled &&
    isQuietHour(now.getHours(), settings.quietHours.startHour, settings.quietHours.endHour)
  ) {
    return;
  }

  let state = gameState;
  if (!state) {
    const result = await browser.storage.local.get(GAME_STATE_STORAGE_KEY);
    state = result[GAME_STATE_STORAGE_KEY] as StoredGameState | undefined;
  }
  if (!state?.cities?.length) return;

  const pending: PendingAlert[] = [];

  if (settings.warehouse.enabled) {
    pending.push(...getWarehouseAlerts(state.cities, settings.warehouse.thresholdPercent));
  }
  if (settings.gold.enabled) {
    const goldAlert = getGoldAlert(state, settings.gold.minimum);
    if (goldAlert) pending.push(goldAlert);
  }
  if (settings.staleCities.enabled) {
    pending.push(...getStaleCityAlerts(state.cities, settings.staleCities.hours));
  }
  if (settings.wine.enabled) {
    pending.push(...getWineAlerts(state.cities, settings.wine.hoursRemaining));
  }

  const alertState = await loadAlertState();

  for (const alert of pending) {
    await fireAlert(alert, alertState);
  }

  await saveAlertState(alertState);

  if (pending.length > 0) {
    browser.action.setBadgeText({ text: String(pending.length) }).catch(() => {});
    browser.action.setBadgeBackgroundColor({ color: '#cc0000' }).catch(() => {});
  } else {
    browser.action.setBadgeText({ text: '' }).catch(() => {});
  }
}
