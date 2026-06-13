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
  const cityLeftMenu = (backgroundData as BackgroundData & { cityLeftMenu?: { ownCity?: number } }).cityLeftMenu;
  return cityLeftMenu?.ownCity === 0;
}

function parseResources(headerData: Record<string, unknown>): SpyResources | null {
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
    return backgroundData != null && isForeignCity(backgroundData);
  },

  handle({ payload }) {
    const headerData = getHeaderData(payload);
    const backgroundData = getUpdateBackgroundData(payload);
    if (!headerData || !backgroundData || !isForeignCity(backgroundData)) return;

    const resources = parseResources(headerData);
    const buildings = parseBuildingsFromPositions(backgroundData.position);
    const { islandX, islandY } = parseIslandCoords(backgroundData);
    const cityId = backgroundData.id ? parseInt(String(backgroundData.id), 10) : undefined;
    const owner = backgroundData as BackgroundData & { ownerName?: string };

    if (!backgroundData.name || !islandX || !islandY) return;

    const target = {
      cityId: Number.isNaN(cityId) ? undefined : cityId,
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

    if (resources) {
      void updateEnemyCityResources(target, resources, dateLabel, timestamp);
    }
  },
};

export function isForeignCityPayload(payload: PayloadEntry[]): boolean {
  const backgroundData = getUpdateBackgroundData(payload);
  return backgroundData != null && isForeignCity(backgroundData);
}
