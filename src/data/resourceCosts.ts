import type { BuildingLevelData, ResourceKey } from '../types/buildings';

/**
 * Building resource costs in buildings.json are stored exactly as exported from the
 * XLSX (include Pulley + Geometry 6%). Call normalizeBuildingLevelResources or
 * getBuildingLevel() whenever those costs are used.
 */
export const XLSX_RESEARCH_DISCOUNT_PERCENT = 6;

/** Multiply exported XLSX resource costs to restore true base values. */
export const RESOURCE_BASE_MULTIPLIER = 100 / (100 - XLSX_RESEARCH_DISCOUNT_PERCENT);

const RESOURCE_FIELDS: ResourceKey[] = ['wood', 'wine', 'marble', 'crystal', 'sulfur'];

export function normalizeExportedResourceCost(value: number): number {
  return Math.max(0, Math.round(value * RESOURCE_BASE_MULTIPLIER));
}

export function normalizeBuildingLevelResources(level: BuildingLevelData): BuildingLevelData {
  const normalized: BuildingLevelData = { ...level };

  for (const key of RESOURCE_FIELDS) {
    const value = level[key];
    if (value !== undefined && value > 0) {
      normalized[key] = normalizeExportedResourceCost(value);
    }
  }

  return normalized;
}
