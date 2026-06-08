import type { BuildingDefinition } from '../types/buildings';
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
