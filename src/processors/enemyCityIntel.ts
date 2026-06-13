import {
  getHeaderData,
  getUpdateBackgroundData,
  type BackgroundData,
  type PayloadEntry,
} from '../payload/ikariamPayload';
import {
  updateEnemyCityBuildings,
  updateEnemyCityResources,
} from '../storage/cityMemoStorage';
import { parseBuildingsFromPositions } from '../utils/enemyUnsecuredResources';
import type { SpyResources } from '../types/spyReport';
import type { PayloadProcessor } from './types';

function isForeignCity(backgroundData: BackgroundData): boolean {
  const extended = backgroundData as BackgroundData & {
    cityLeftMenu?: { ownCity?: number };
    ownerId?: string | number;
  };

  if (extended.cityLeftMenu?.ownCity === 0) return true;

  // When viewing a deployed spy city, relatedCity in header marks foreign context.
  return false;
}

function isForeignCityHeader(headerData: Record<string, unknown>, backgroundData: BackgroundData): boolean {
  if (isForeignCity(backgroundData)) return true;

  const relatedCity = headerData.relatedCity as { owncity?: number } | undefined;
  if (relatedCity?.owncity === 0) return true;

  const currentCityId = backgroundData.id ? String(backgroundData.id) : '';
  const dropdown = headerData.cityDropdownMenu as
    | Record<string, { id: string; relationship?: string }>
    | undefined;

  if (!currentCityId || !dropdown) return false;

  const entry = Object.values(dropdown).find((city) => city.id === currentCityId);
  return entry != null && entry.relationship !== 'ownCity';
}

function parseResources(headerData: Record<string, unknown>): SpyResources {
  const currentResources = (headerData.currentResources || {}) as Record<string, number>;

  return {
    wood: Math.floor(currentResources.resource || currentResources[0] || 0),
    wine: Math.floor(currentResources[1] || 0),
    marble: Math.floor(currentResources[2] || 0),
    crystal: Math.floor(currentResources[3] || 0),
    sulfur: Math.floor(currentResources[4] || 0),
    gold: 0,
  };
}

function parseIslandCoords(backgroundData: BackgroundData): { islandX: number; islandY: number } {
  const extended = backgroundData as BackgroundData & {
    islandXCoord?: string | number;
    islandYCoord?: string | number;
  };

  return {
    islandX: parseInt(String(extended.islandXCoord || 0), 10),
    islandY: parseInt(String(extended.islandYCoord || 0), 10),
  };
}

export const enemyCityIntelProcessor: PayloadProcessor = {
  name: 'enemyCityIntel',

  canHandle({ payload }) {
    const backgroundData = getUpdateBackgroundData(payload);
    const headerData = getHeaderData(payload);
    if (!backgroundData || !headerData || !backgroundData.id) return false;
    return isForeignCityHeader(headerData, backgroundData);
  },

  handle({ payload }) {
    const headerData = getHeaderData(payload);
    const backgroundData = getUpdateBackgroundData(payload);
    if (!headerData || !backgroundData || !backgroundData.id) return;
    if (!isForeignCityHeader(headerData, backgroundData)) return;

    const resources = parseResources(headerData);
    const buildings = parseBuildingsFromPositions(backgroundData.position);
    const { islandX, islandY } = parseIslandCoords(backgroundData);
    const cityId = parseInt(String(backgroundData.id), 10);
    const owner = backgroundData as BackgroundData & { ownerName?: string };

    if (!backgroundData.name || !islandX || !islandY || Number.isNaN(cityId)) return;

    const target = {
      cityId,
      islandX,
      islandY,
      cityName: backgroundData.name,
      playerName: owner.ownerName || '',
    };

    const timestamp = Date.now();
    const dateLabel = new Date(timestamp).toLocaleString('pt-BR');

    if (buildings.length > 0) {
      void updateEnemyCityBuildings(target, buildings, dateLabel, timestamp);
    }

    void updateEnemyCityResources(target, resources, dateLabel, timestamp);
  },
};

export function isForeignCityPayload(payload: PayloadEntry[]): boolean {
  const backgroundData = getUpdateBackgroundData(payload);
  const headerData = getHeaderData(payload);
  if (!backgroundData || !headerData) return false;
  return isForeignCityHeader(headerData, backgroundData);
}
