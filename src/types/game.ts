export interface CityBuilding {
  position: number;
  buildingId: number;
  level: number;
}

export interface CityDetails {
  resourceProduction: number;
  tradegoodProduction: number;
  currentResources: Record<number, number>;
  wineSpendings: number;
  citizens: number;
  population: number;
  safeResources: number;
  /** Max inhabitants from town hall (exact after visiting Câmara Municipal). */
  maxInhabitants?: number;
  /** Population growth per hour (from Câmara Municipal). */
  populationGrowth?: number;
  /** Total satisfaction score (from Câmara Municipal). */
  satisfaction?: number;
  satisfactionLabel?: string;
  wineTavernBonus?: number;
  wineServingBonus?: number;
  townHallLevel?: number;
  tavernLevel?: number;
  buildings?: CityBuilding[];
}

export interface City {
  id: string;
  name: string;
  coords: string;
  tradegood: number;
  lastUpdate: number | null;
  details?: CityDetails;
}

export interface AccountData {
  gold: number;
  freeTransporters: number;
  maxTransporters: number;
  freeFreighters: number;
  maxFreighters: number;
  scientistsUpkeep: number;
  income: number;
  upkeep: number;
  godGoldResult: number;
}
