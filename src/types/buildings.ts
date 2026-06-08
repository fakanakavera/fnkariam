export type ResourceKey = 'wood' | 'wine' | 'marble' | 'crystal' | 'sulfur';

export interface BuildingLevelData {
  level: number;
  wood?: number;
  wine?: number;
  marble?: number;
  crystal?: number;
  sulfur?: number;
  timeSec: number;
  bonus?: Record<string, number>;
}

export interface BuildingDefinition {
  key: string;
  buildingId: number;
  name: string;
  levels: BuildingLevelData[];
}

export interface BuildingsDataFile {
  buildings: BuildingDefinition[];
}
