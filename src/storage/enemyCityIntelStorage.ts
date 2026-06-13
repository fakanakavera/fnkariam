import type { SpyBuilding, SpyResources } from '../types/spyReport';

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
  updatedAt: number;
}

export type EnemyCityIntelStore = Record<string, EnemyCityIntel>;

function intelKey(cityId?: number, islandX?: number, islandY?: number, cityName?: string): string | null {
  if (cityId) return `city:${cityId}`;
  if (islandX != null && islandY != null && cityName) return `loc:${islandX}:${islandY}:${cityName}`;
  return null;
}

export async function loadEnemyCityIntel(): Promise<EnemyCityIntelStore> {
  const result = await browser.storage.local.get(ENEMY_CITY_INTEL_STORAGE_KEY);
  return (result[ENEMY_CITY_INTEL_STORAGE_KEY] as EnemyCityIntelStore | undefined) ?? {};
}

export async function getEnemyCityIntelByCityId(cityId: number): Promise<EnemyCityIntel | null> {
  const store = await loadEnemyCityIntel();
  return store[`city:${cityId}`] ?? null;
}

export async function upsertEnemyCityIntel(
  input: Omit<EnemyCityIntel, 'key' | 'updatedAt'> & { key?: string },
): Promise<EnemyCityIntel | null> {
  const key = input.key || intelKey(input.cityId, input.islandX, input.islandY, input.cityName);
  if (!key) return null;

  const store = await loadEnemyCityIntel();
  const existing = store[key];

  const entry: EnemyCityIntel = {
    ...existing,
    ...input,
    key,
    updatedAt: Date.now(),
  };

  store[key] = entry;

  if (input.cityId) {
    for (const [storedKey, value] of Object.entries(store)) {
      if (
        storedKey !== key &&
        value.cityName === input.cityName &&
        value.islandX === input.islandX &&
        value.islandY === input.islandY
      ) {
        store[storedKey] = { ...value, cityId: input.cityId, updatedAt: Date.now() };
      }
    }
  }

  await browser.storage.local.set({ [ENEMY_CITY_INTEL_STORAGE_KEY]: store });
  return entry;
}

export async function findEnemyCityIntel(options: {
  cityId?: number;
  islandX?: number;
  islandY?: number;
  cityName?: string;
}): Promise<EnemyCityIntel | null> {
  const store = await loadEnemyCityIntel();
  const values = Object.values(store);

  if (options.cityId) {
    const byId = values.find((entry) => entry.cityId === options.cityId);
    if (byId) return byId;
  }

  if (options.islandX != null && options.islandY != null && options.cityName) {
    return (
      values.find(
        (entry) =>
          entry.islandX === options.islandX &&
          entry.islandY === options.islandY &&
          entry.cityName === options.cityName,
      ) ?? null
    );
  }

  return null;
}
