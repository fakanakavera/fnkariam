import type { BuildingDefinition, BuildingLevelData } from '../types/buildings';
import { normalizeBuildingLevelResources } from './resourceCosts';
import buildingsJson from './buildings.json';

export const BUILDINGS: BuildingDefinition[] = buildingsJson as BuildingDefinition[];

const byBuildingId = new Map<number, BuildingDefinition>();
const byKey = new Map<string, BuildingDefinition>();

for (const building of BUILDINGS) {
  byBuildingId.set(building.buildingId, building);
  byKey.set(building.key, building);
}

export function getBuildingById(buildingId: number): BuildingDefinition | undefined {
  return byBuildingId.get(buildingId);
}

export function getBuildingByKey(key: string): BuildingDefinition | undefined {
  return byKey.get(key);
}

export function getBuildingName(buildingId: number): string {
  return byBuildingId.get(buildingId)?.name ?? `Edifício #${buildingId}`;
}

/** Level costs with resources converted to true base values (stored value × 100/94). */
export function getBuildingLevel(buildingId: number, level: number): BuildingLevelData | undefined {
  const definition = byBuildingId.get(buildingId);
  if (!definition) return undefined;

  const levelData = definition.levels.find((entry) => entry.level === level);
  if (!levelData) return undefined;

  return normalizeBuildingLevelResources(levelData);
}
