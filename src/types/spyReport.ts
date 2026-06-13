export interface SpyResources {
  wood: number;
  wine: number;
  marble: number;
  crystal: number;
  sulfur: number;
  gold: number;
}

export interface SpyUnit {
  name: string;
  count: number;
}

export interface SpyTroopSection {
  category: string;
  units: SpyUnit[];
}

export interface SpyReport {
  id: string;
  targetOwner: string;
  targetCityName: string;
  targetCityId: string;
  coords: string;
  mission: string;
  success: boolean;
  statusText: string;
  agentsLost: number;
  agentsDeployed: number;
  decoysLost: number;
  decoysDeployed: number;
  date: string;
  dateTimestamp: number;
  resources?: SpyResources;
  troops?: SpyTroopSection[];
  textReport?: string;
  addedToMemo: boolean;
  capturedAt: number;
}

export const SPY_REPORTS_STORAGE_KEY = 'spyReports';
