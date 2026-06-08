export interface CityDetails {
  resourceProduction: number;
  tradegoodProduction: number;
  currentResources: Record<number, number>;
  wineSpendings: number;
  citizens: number;
  population: number;
  safeResources: number;
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
