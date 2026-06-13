import type { EnemyCityIntel } from '../storage/enemyCityIntelStorage';
import {
  calculateSafeCapacity,
  calculateUnsecuredResources,
  hasUnsecuredResources,
  type UnsecuredResources,
} from './enemyUnsecuredResources';
import type { SpyReport } from '../types/spyReport';

export interface EnemyIntelSummary {
  safeCapacity: number | null;
  unsecured: UnsecuredResources;
  hasLoot: boolean;
  hasResources: boolean;
  hasBuildings: boolean;
  isComplete: boolean;
}

export function summarizeEnemyIntel(intel: EnemyCityIntel): EnemyIntelSummary {
  const hasResources = intel.resources != null;
  const hasBuildings = (intel.buildings?.length || 0) > 0;
  const safeCapacity = hasBuildings ? calculateSafeCapacity(intel.buildings!) : null;
  const unsecured =
    hasResources && safeCapacity != null
      ? calculateUnsecuredResources(intel.resources!, safeCapacity)
      : {};

  return {
    safeCapacity,
    unsecured,
    hasLoot: hasUnsecuredResources(unsecured),
    hasResources,
    hasBuildings,
    isComplete: hasResources && hasBuildings,
  };
}

function cityKey(report: SpyReport): string {
  if (report.targetCityId) return `city:${report.targetCityId}`;
  return `loc:${report.islandX}:${report.islandY}:${report.targetCityName}`;
}

export function groupSpyReportsByCity(reports: SpyReport[]): Map<string, SpyReport[]> {
  const grouped = new Map<string, SpyReport[]>();

  for (const report of reports) {
    if (!report.success) continue;
    if (!report.targetCityName && !report.targetCityId) continue;

    const key = cityKey(report);
    const bucket = grouped.get(key) || [];
    bucket.push(report);
    grouped.set(key, bucket);
  }

  return grouped;
}

export function pickLatestResourceReport(reports: SpyReport[]): SpyReport | null {
  return (
    reports
      .filter((report) => report.resources)
      .sort((a, b) => b.dateTimestamp - a.dateTimestamp)[0] ?? null
  );
}

export function pickLatestBuildingReport(reports: SpyReport[]): SpyReport | null {
  return (
    reports
      .filter((report) => report.buildings?.length)
      .sort((a, b) => b.dateTimestamp - a.dateTimestamp)[0] ?? null
  );
}
