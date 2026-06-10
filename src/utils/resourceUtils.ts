import type { City } from '../types/game';
import type { ResourceKey } from '../types/buildings';

export const RESOURCE_KEYS: ResourceKey[] = ['wood', 'wine', 'marble', 'crystal', 'sulfur'];

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  wood: 'Madeira',
  wine: 'Vinho',
  marble: 'Mármore',
  crystal: 'Cristal',
  sulfur: 'Enxofre',
};

export const RESOURCE_INDEX: Record<ResourceKey, number> = {
  wood: 0,
  wine: 1,
  marble: 2,
  crystal: 3,
  sulfur: 4,
};

export const TRADEGOOD_TO_RESOURCE: Record<number, ResourceKey> = {
  1: 'wine',
  2: 'marble',
  3: 'crystal',
  4: 'sulfur',
};

export function getResourceStock(city: City, resource: ResourceKey): number {
  const index = RESOURCE_INDEX[resource];
  return city.details?.currentResources[index] || 0;
}

export function getResourceProduction(city: City, resource: ResourceKey): number {
  if (!city.details) return 0;
  if (resource === 'wood') return city.details.resourceProduction;
  const tradegoodResource = TRADEGOOD_TO_RESOURCE[city.tradegood];
  if (tradegoodResource === resource) return city.details.tradegoodProduction;
  return 0;
}

/** Net hourly stock change (production minus tavern wine burn for wine). */
export function getResourceNetProduction(city: City, resource: ResourceKey): number {
  const production = getResourceProduction(city, resource);
  if (resource === 'wine') {
    return production - (city.details?.wineSpendings || 0);
  }
  return production;
}

export const WAREHOUSE_PROJECTION_HOURS = 12;

export type WarehouseRisk = 'safe' | 'warning' | 'danger';

export function getWarehouseRisk(stock: number, safe: number, hourlyProduction: number): WarehouseRisk {
  if (stock > safe) return 'danger';
  if (hourlyProduction > 0 && stock + hourlyProduction * WAREHOUSE_PROJECTION_HOURS > safe) {
    return 'warning';
  }
  return 'safe';
}

export function hoursUntilWarehouseUnsafe(stock: number, safe: number, hourlyProduction: number): number | null {
  if (hourlyProduction <= 0 || stock >= safe) return null;
  return (safe - stock) / hourlyProduction;
}

export function cityProducesResource(city: City, resource: ResourceKey): boolean {
  if (resource === 'wood') return (city.details?.resourceProduction || 0) > 0;
  return TRADEGOOD_TO_RESOURCE[city.tradegood] === resource;
}

export function formatDurationMs(ms: number): string {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatWineTimeLeft(stock: number, spending: number): string | null {
  if (!spending) return null;
  const hours = stock / spending;
  return hours <= 48 ? `${Math.floor(hours)}h` : `${Math.floor(hours / 24)}d`;
}

export function getSupplierAvailable(city: City, resource: ResourceKey): number {
  if (!city.details) return 0;

  const current = getResourceStock(city, resource);
  const safe = city.details.safeResources || 0;
  const wineReserve = (city.details.wineSpendings || 0) * 2;

  if (resource === 'wine') {
    return Math.max(0, current - wineReserve);
  }

  return Math.max(0, current - safe);
}

export function getResourceSurplus(city: City, resource: ResourceKey): number {
  return getSupplierAvailable(city, resource);
}
