import { getBuildingById, getBuildingLevel } from '../data/buildingRegistry';
import { XLSX_RESEARCH_DISCOUNT_PERCENT } from '../data/resourceCosts';
import type { City, CityBuilding } from '../types/game';
import type { BuildingLevelData, ResourceKey } from '../types/buildings';

const RESOURCE_KEYS: ResourceKey[] = ['wood', 'wine', 'marble', 'crystal', 'sulfur'];

const RESOURCE_INDEX: Record<ResourceKey, number> = {
  wood: 0,
  wine: 1,
  marble: 2,
  crystal: 3,
  sulfur: 4,
};

const TRADEGOOD_TO_RESOURCE: Record<number, ResourceKey> = {
  1: 'wine',
  2: 'marble',
  3: 'crystal',
  4: 'sulfur',
};

/** Applied at runtime together with per-city reduction buildings. */
const RESEARCH_BUILD_DISCOUNT_PERCENT = XLSX_RESEARCH_DISCOUNT_PERCENT;

/** Ikariam reduction buildings: 1% per level, max 50%. buildingId per resource. */
const REDUCTION_BUILDING_BY_RESOURCE: Partial<Record<ResourceKey, number>> = {
  wood: 23,
  wine: 26,
  marble: 24,
  crystal: 25,
  sulfur: 27,
};

const MAX_REDUCTION_BUILDING_PERCENT = 50;

export interface UpgradeCost {
  wood?: number;
  wine?: number;
  marble?: number;
  crystal?: number;
  sulfur?: number;
}

export interface UpgradeOption {
  cityId: string;
  cityName: string;
  buildingId: number;
  buildingName: string;
  position: number;
  currentLevel: number;
  nextLevel: number;
  cost: UpgradeCost;
  totalCost: number;
  timeSec: number;
  resourcePerMin: number;
  affordable: boolean;
  missingResources: Partial<Record<ResourceKey, number>>;
  hoursToAfford: number | null;
}

export interface UpgradePlan {
  shortSession: UpgradeOption[];
  longSession: UpgradeOption[];
  byCity: Record<string, UpgradeOption[]>;
}

function getLevelData(buildingId: number, targetLevel: number): BuildingLevelData | undefined {
  return getBuildingLevel(buildingId, targetLevel);
}

function extractCost(levelData: BuildingLevelData): UpgradeCost {
  const cost: UpgradeCost = {};
  for (const key of RESOURCE_KEYS) {
    const value = levelData[key];
    if (value && value > 0) cost[key] = value;
  }
  return cost;
}

function sumCost(cost: UpgradeCost): number {
  return RESOURCE_KEYS.reduce((sum, key) => sum + (cost[key] || 0), 0);
}

function getReductionBuildingDiscount(city: City, resource: ResourceKey): number {
  const buildingId = REDUCTION_BUILDING_BY_RESOURCE[resource];
  if (buildingId === undefined) return 0;

  const building = city.details?.buildings?.find((entry) => entry.buildingId === buildingId);
  if (!building) return 0;

  return Math.min(building.level, MAX_REDUCTION_BUILDING_PERCENT);
}

function applyCityCostModifiers(city: City, baseCost: UpgradeCost): UpgradeCost {
  const adjusted: UpgradeCost = {};

  for (const key of RESOURCE_KEYS) {
    const base = baseCost[key];
    if (!base || base <= 0) continue;

    const totalDiscount = RESEARCH_BUILD_DISCOUNT_PERCENT + getReductionBuildingDiscount(city, key);
    adjusted[key] = Math.floor((base * (100 - totalDiscount)) / 100);
  }

  return adjusted;
}

function getResourceStock(city: City, resource: ResourceKey): number {
  const index = RESOURCE_INDEX[resource];
  return city.details?.currentResources[index] || 0;
}

function getHourlyProduction(city: City, resource: ResourceKey): number {
  if (!city.details) return 0;
  if (resource === 'wood') return city.details.resourceProduction;
  const tradeResource = TRADEGOOD_TO_RESOURCE[city.tradegood];
  if (tradeResource === resource) return city.details.tradegoodProduction;
  return 0;
}

function evaluateUpgrade(city: City, building: CityBuilding): UpgradeOption | null {
  const nextLevel = building.level + 1;
  const levelData = getLevelData(building.buildingId, nextLevel);
  if (!levelData) return null;

  const definition = getBuildingById(building.buildingId);
  const cost = applyCityCostModifiers(city, extractCost(levelData));
  const totalCost = sumCost(cost);
  const timeSec = levelData.timeSec;
  const resourcePerMin = timeSec > 0 ? totalCost / (timeSec / 60) : 0;

  const missingResources: Partial<Record<ResourceKey, number>> = {};
  let affordable = true;
  let maxHoursToAfford = 0;

  for (const key of RESOURCE_KEYS) {
    const required = cost[key] || 0;
    if (required <= 0) continue;

    const available = getResourceStock(city, key);
    if (available < required) {
      affordable = false;
      missingResources[key] = required - available;
      const production = getHourlyProduction(city, key);
      if (production > 0) {
        maxHoursToAfford = Math.max(maxHoursToAfford, (required - available) / production);
      } else {
        maxHoursToAfford = Infinity;
      }
    }
  }

  return {
    cityId: city.id,
    cityName: city.name,
    buildingId: building.buildingId,
    buildingName: definition?.name ?? `Edifício #${building.buildingId}`,
    position: building.position,
    currentLevel: building.level,
    nextLevel,
    cost,
    totalCost,
    timeSec,
    resourcePerMin,
    affordable,
    missingResources,
    hoursToAfford: affordable ? 0 : maxHoursToAfford === Infinity ? null : maxHoursToAfford,
  };
}

function pickCityRecommendation(
  options: UpgradeOption[],
  mode: 'short' | 'long',
): UpgradeOption | null {
  if (options.length === 0) return null;

  const affordable = options.filter((option) => option.affordable);
  const pool = affordable.length > 0 ? affordable : options;

  const sorted = [...pool].sort((a, b) =>
    mode === 'short' ? b.resourcePerMin - a.resourcePerMin : a.resourcePerMin - b.resourcePerMin,
  );
  return sorted[0] ?? null;
}

export function buildUpgradePlan(cities: City[]): UpgradePlan {
  const allOptions: UpgradeOption[] = [];

  for (const city of cities) {
    const buildings = city.details?.buildings;
    if (!buildings?.length) continue;

    for (const building of buildings) {
      const option = evaluateUpgrade(city, building);
      if (option) allOptions.push(option);
    }
  }

  const shortSession: UpgradeOption[] = [];
  const longSession: UpgradeOption[] = [];

  for (const city of cities) {
    const cityOptions = allOptions.filter((option) => option.cityId === city.id);
    const shortPick = pickCityRecommendation(cityOptions, 'short');
    const longPick = pickCityRecommendation(cityOptions, 'long');
    if (shortPick) shortSession.push(shortPick);
    if (longPick) longSession.push(longPick);
  }

  const byCity: Record<string, UpgradeOption[]> = {};
  for (const city of cities) {
    const cityOptions = allOptions
      .filter((option) => option.cityId === city.id)
      .sort((a, b) => b.resourcePerMin - a.resourcePerMin);
    if (cityOptions.length > 0) byCity[city.id] = cityOptions;
  }

  return { shortSession, longSession, byCity };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

export function formatResourcePerMin(value: number): string {
  if (value >= 100) return `${Math.round(value)}/min`;
  if (value >= 10) return `${value.toFixed(1)}/min`;
  return `${value.toFixed(2)}/min`;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return 'Sem produção';
  if (hours <= 0) return 'Pronto';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${hours.toFixed(1)}h`;
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`;
}
