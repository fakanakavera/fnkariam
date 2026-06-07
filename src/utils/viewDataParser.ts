import type { AccountData, City } from '../context/GameContext';
import type { StoredGameState } from '../types/gameState';

type PayloadEntry = [string, Record<string, unknown>];

function parseAccount(headerData: Record<string, unknown>): AccountData {
  return {
    gold: parseFloat(String(headerData.gold || 0)),
    freeTransporters: parseInt(String(headerData.freeTransporters || 0), 10),
    maxTransporters: parseInt(String(headerData.maxTransporters || 0), 10),
    freeFreighters: parseInt(String(headerData.freeFreighters || 0), 10),
    maxFreighters: parseInt(String(headerData.maxFreighters || 0), 10),
    scientistsUpkeep: parseFloat(String(headerData.scientistsUpkeep || 0)),
    income: parseFloat(String(headerData.income || 0)),
    upkeep: parseFloat(String(headerData.upkeep || 0)),
    godGoldResult: parseFloat(String(headerData.godGoldResult || 0)),
  };
}

function mergeCityList(
  cities: City[],
  cityDropdownMenu: Record<string, { id: string; name: string; coords: string; relationship: string; tradegood: number }>,
): City[] {
  const next = [...cities];

  Object.keys(cityDropdownMenu).forEach((key) => {
    if (!key.startsWith('city_')) return;

    const city = cityDropdownMenu[key];
    if (city.relationship !== 'ownCity') return;

    const existingIndex = next.findIndex((item) => item.id === city.id);
    if (existingIndex === -1) {
      next.push({
        id: city.id,
        name: city.name,
        coords: city.coords.trim(),
        tradegood: city.tradegood,
        lastUpdate: null,
      });
      return;
    }

    next[existingIndex] = {
      ...next[existingIndex],
      name: city.name,
      coords: city.coords.trim(),
      tradegood: city.tradegood,
    };
  });

  return next;
}

function updateCurrentCity(
  cities: City[],
  currentCityId: string,
  headerData: Record<string, unknown>,
  backgroundData: { name?: string; position?: Array<{ buildingId: number; level: number }> },
): City[] {
  const currentResources = (headerData.currentResources || {}) as Record<string, number>;
  const safeResources = (backgroundData.position || []).reduce(
    (sum, building) => (building.buildingId === 7 && building.level ? sum + building.level * 480 : sum),
    100,
  );

  return cities.map((city) => {
    if (city.id !== currentCityId) return city;

    return {
      ...city,
      name: backgroundData.name || city.name,
      lastUpdate: Date.now(),
      details: {
        resourceProduction: Math.round(Number(headerData.resourceProduction || 0) * 3600),
        tradegoodProduction: Math.round(Number(headerData.tradegoodProduction || 0) * 3600),
        currentResources: {
          0: Math.floor(currentResources.resource || 0),
          1: Math.floor(currentResources[1] || 0),
          2: Math.floor(currentResources[2] || 0),
          3: Math.floor(currentResources[3] || 0),
          4: Math.floor(currentResources[4] || 0),
        },
        wineSpendings: parseInt(String(headerData.wineSpendings || 0), 10),
        citizens: parseFloat(String(currentResources.citizens || 0)),
        population: parseFloat(String(currentResources.population || 0)),
        safeResources,
      },
    };
  });
}

export function applyViewDataPayload(
  payload: unknown,
  previous: StoredGameState = { account: null, cities: [], lastUpdated: 0 },
): StoredGameState | null {
  if (!Array.isArray(payload)) return null;

  const entries = payload as PayloadEntry[];
  const data = entries[0]?.[1];
  const headerData = data?.headerData as Record<string, unknown> | undefined;
  const backgroundData = data?.backgroundData as
    | { id?: string; name?: string; position?: Array<{ buildingId: number; level: number }> }
    | undefined;

  if (!headerData) return null;

  let cities = previous.cities;
  const cityDropdownMenu = headerData.cityDropdownMenu as
    | Record<string, { id: string; name: string; coords: string; relationship: string; tradegood: number; selectedCity?: string }>
    | undefined;

  if (cityDropdownMenu) {
    cities = mergeCityList(cities, cityDropdownMenu);
  }

  let currentCityId = backgroundData?.id;
  if (!currentCityId && cityDropdownMenu?.selectedCity) {
    const selectedKey = cityDropdownMenu.selectedCity as string;
    currentCityId = cityDropdownMenu[selectedKey]?.id;
  }

  if (currentCityId) {
    cities = updateCurrentCity(cities, currentCityId, headerData, backgroundData || {});
  }

  return {
    account: parseAccount(headerData),
    cities,
    lastUpdated: Date.now(),
  };
}
