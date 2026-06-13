import {
  getUpdateBackgroundData,
  type BackgroundData,
  type PayloadEntry,
} from '../payload/ikariamPayload';
import { updateEnemyCityBuildings } from '../storage/cityMemoStorage';
import { isForeignCityBackground } from '../utils/foreignCityDetection';
import { isOwnCityId, getOwnCityIdSet } from '../utils/ownCityFilter';
import { parseBuildingsFromPositions } from '../utils/enemyUnsecuredResources';
import type { PayloadProcessor } from './types';

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
    if (!backgroundData?.id) return false;
    return isForeignCityBackground(backgroundData);
  },

  handle({ payload }) {
    const backgroundData = getUpdateBackgroundData(payload);
    if (!backgroundData?.id || !isForeignCityBackground(backgroundData)) return;

    const buildings = parseBuildingsFromPositions(backgroundData.position);
    const { islandX, islandY } = parseIslandCoords(backgroundData);
    const cityId = parseInt(String(backgroundData.id), 10);
    const owner = backgroundData as BackgroundData & { ownerName?: string };

    if (!backgroundData.name || !islandX || !islandY || Number.isNaN(cityId)) return;

    void getOwnCityIdSet().then((ownCityIds) => {
      if (isOwnCityId(cityId, ownCityIds)) return;
      if (buildings.length === 0) return;

      const target = {
        cityId,
        islandX,
        islandY,
        cityName: backgroundData.name!,
        playerName: owner.ownerName || '',
      };

      const timestamp = Date.now();
      const dateLabel = new Date(timestamp).toLocaleString('pt-BR');
      void updateEnemyCityBuildings(target, buildings, dateLabel, timestamp);
    });
  },
};

export function isForeignCityPayload(payload: PayloadEntry[]): boolean {
  const backgroundData = getUpdateBackgroundData(payload);
  return backgroundData != null && isForeignCityBackground(backgroundData);
}
