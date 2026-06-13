import type { SpyBuilding, SpyResources } from '../types/spyReport';
import type { UnsecuredResources } from '../utils/enemyUnsecuredResources';
import {
  calculateSafeCapacity,
  calculateUnsecuredResources,
  hasUnsecuredResources,
} from '../utils/enemyUnsecuredResources';
import { getOwnCityIdSet, isOwnCityId } from '../utils/ownCityFilter';

export const ENEMY_CITY_INTEL_STORAGE_KEY = 'enemyCityIntel';

export interface EnemyCityIntel {
  key: string;
  cityId?: number;
  islandX: number;
  islandY: number;
  position?: number;
  cityName: string;
  playerName: string;
  resources?: SpyResources;
  resourcesDate?: string;
  resourcesTimestamp?: number;
  buildings?: SpyBuilding[];
  buildingsDate?: string;
  buildingsTimestamp?: number;
  safeCapacity?: number;
  unsecuredResources?: UnsecuredResources;
  updatedAt: number;
}

export type EnemyCityIntelStore = Record<string, EnemyCityIntel>;

function canonicalKey(cityId?: number, islandX?: number, islandY?: number, cityName?: string): string | null {
  if (cityId) return `city:${cityId}`;
  if (islandX != null && islandY != null && cityName) return `loc:${islandX}:${islandY}:${cityName}`;
  return null;
}

function enrichIntel(entry: EnemyCityIntel): EnemyCityIntel {
  const safeCapacity =
    entry.buildings?.length ? calculateSafeCapacity(entry.buildings) : entry.safeCapacity;
  const unsecuredResources =
    entry.resources && safeCapacity != null
      ? calculateUnsecuredResources(entry.resources, safeCapacity)
      : entry.unsecuredResources;

  return {
    ...entry,
    safeCapacity: safeCapacity ?? undefined,
    unsecuredResources: unsecuredResources && hasUnsecuredResources(unsecuredResources)
      ? unsecuredResources
      : undefined,
  };
}

function findExistingEntry(
  store: EnemyCityIntelStore,
  input: Pick<EnemyCityIntel, 'cityId' | 'islandX' | 'islandY' | 'cityName'>,
): { key: string; entry: EnemyCityIntel } | null {
  if (input.cityId) {
    const key = `city:${input.cityId}`;
    if (store[key]) return { key, entry: store[key] };
  }

  const values = Object.entries(store);
  for (const [key, entry] of values) {
    if (input.cityId && entry.cityId === input.cityId) return { key, entry };
    if (
      entry.islandX === input.islandX &&
      entry.islandY === input.islandY &&
      entry.cityName === input.cityName
    ) {
      return { key, entry };
    }
  }

  const locKey = canonicalKey(undefined, input.islandX, input.islandY, input.cityName);
  if (locKey && store[locKey]) return { key: locKey, entry: store[locKey] };

  return null;
}

export async function loadEnemyCityIntel(): Promise<EnemyCityIntelStore> {
  const result = await browser.storage.local.get(ENEMY_CITY_INTEL_STORAGE_KEY);
  return (result[ENEMY_CITY_INTEL_STORAGE_KEY] as EnemyCityIntelStore | undefined) ?? {};
}

export async function listEnemyCityIntel(): Promise<EnemyCityIntel[]> {
  const store = await loadEnemyCityIntel();
  const ownCityIds = await getOwnCityIdSet();

  return Object.values(store)
    .filter((entry) => !isOwnCityId(entry.cityId, ownCityIds))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function purgeOwnCityIntel(): Promise<number> {
  const store = await loadEnemyCityIntel();
  const ownCityIds = await getOwnCityIdSet();
  let removed = 0;

  for (const [key, entry] of Object.entries(store)) {
    if (isOwnCityId(entry.cityId, ownCityIds)) {
      delete store[key];
      removed += 1;
    }
  }

  if (removed > 0) {
    await browser.storage.local.set({ [ENEMY_CITY_INTEL_STORAGE_KEY]: store });
  }

  return removed;
}

export async function getEnemyCityIntelByCityId(cityId: number): Promise<EnemyCityIntel | null> {
  const store = await loadEnemyCityIntel();
  return store[`city:${cityId}`] ?? Object.values(store).find((entry) => entry.cityId === cityId) ?? null;
}

export async function upsertEnemyCityIntel(
  input: Omit<EnemyCityIntel, 'key' | 'updatedAt'> & { key?: string },
): Promise<EnemyCityIntel | null> {
  const store = await loadEnemyCityIntel();
  const existingMatch = findExistingEntry(store, input);
  const nextKey =
    canonicalKey(input.cityId, input.islandX, input.islandY, input.cityName) ||
    input.key ||
    existingMatch?.key;

  if (!nextKey) return null;

  const ownCityIds = await getOwnCityIdSet();
  const cityId = input.cityId ?? existingMatch?.entry.cityId;
  if (isOwnCityId(cityId, ownCityIds)) return null;

  const existing = existingMatch?.entry ?? store[nextKey];
  const merged: EnemyCityIntel = enrichIntel({
    ...existing,
    ...input,
    key: nextKey,
    cityId: input.cityId ?? existing?.cityId,
    islandX: input.islandX || existing?.islandX || 0,
    islandY: input.islandY || existing?.islandY || 0,
    cityName: input.cityName || existing?.cityName || '',
    playerName: input.playerName || existing?.playerName || '',
    updatedAt: Date.now(),
  });

  if (existingMatch && existingMatch.key !== nextKey) {
    delete store[existingMatch.key];
  }

  store[nextKey] = merged;

  if (merged.cityId) {
    for (const [storedKey, value] of Object.entries(store)) {
      if (storedKey === nextKey) continue;
      if (
        value.cityName === merged.cityName &&
        value.islandX === merged.islandX &&
        value.islandY === merged.islandY
      ) {
        store[nextKey] = enrichIntel({ ...merged, ...value, key: nextKey, cityId: merged.cityId });
        delete store[storedKey];
      }
    }
  }

  await browser.storage.local.set({ [ENEMY_CITY_INTEL_STORAGE_KEY]: store });
  return store[nextKey];
}

export async function findEnemyCityIntel(options: {
  cityId?: number;
  islandX?: number;
  islandY?: number;
  cityName?: string;
}): Promise<EnemyCityIntel | null> {
  const store = await loadEnemyCityIntel();
  const match = findExistingEntry(store, {
    cityId: options.cityId,
    islandX: options.islandX || 0,
    islandY: options.islandY || 0,
    cityName: options.cityName || '',
  });
  if (!match) return null;

  const ownCityIds = await getOwnCityIdSet();
  if (isOwnCityId(match.entry.cityId, ownCityIds)) return null;

  return match.entry;
}

export async function deleteEnemyCityIntel(key: string): Promise<void> {
  const store = await loadEnemyCityIntel();
  if (!store[key]) return;
  delete store[key];
  await browser.storage.local.set({ [ENEMY_CITY_INTEL_STORAGE_KEY]: store });
}
