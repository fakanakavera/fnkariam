import {
  calculateSafeCapacity,
  calculateUnsecuredResources,
  formatIntelStatusNote,
  hasUnsecuredResources,
  mergeAutoNote,
  WAREHOUSE_BUILDING_ID,
} from '../utils/enemyUnsecuredResources';
import {
  groupSpyReportsByCity,
  pickLatestBuildingReport,
  pickLatestResourceReport,
} from '../utils/enemyIntelSync';
import { findEnemyCityIntel, upsertEnemyCityIntel } from './enemyCityIntelStorage';
import { findCityNote, upsertCityNote } from './cityNotesStorage';
import type { SpyBuilding, SpyReport, SpyResources } from '../types/spyReport';
import { getOwnCityIdSet, isOwnCityId } from '../utils/ownCityFilter';

interface CityTarget {
  cityId?: number;
  islandX: number;
  islandY: number;
  position?: number;
  cityName: string;
  playerName: string;
}

function warehouseLevels(buildings: SpyBuilding[]): number[] {
  return buildings
    .filter((building) => building.buildingId === WAREHOUSE_BUILDING_ID || building.isWarehouse)
    .map((building) => building.level);
}

export async function refreshCityNoteFromIntel(target: CityTarget): Promise<boolean> {
  const intel = await findEnemyCityIntel({
    cityId: target.cityId,
    islandX: target.islandX,
    islandY: target.islandY,
    cityName: target.cityName,
  });

  if (!intel?.resources || !intel.buildings?.length) return false;

  const safeCapacity = calculateSafeCapacity(intel.buildings);
  const unsecured = calculateUnsecuredResources(intel.resources, safeCapacity);
  const resourcesDate =
    intel.resourcesDate || new Date(intel.resourcesTimestamp || Date.now()).toLocaleString('pt-BR');

  const autoBlock = formatIntelStatusNote({
    resources: intel.resources,
    safeCapacity,
    unsecured,
    resourcesDate,
    buildingsDate: intel.buildingsDate,
    warehouseLevels: warehouseLevels(intel.buildings),
  });

  const existing = await findCityNote(target);
  const noteText = mergeAutoNote(existing?.note || '', autoBlock);
  const hasLoot = hasUnsecuredResources(unsecured);
  const resolvedPosition = existing?.position ?? target.position ?? intel.position;

  await upsertCityNote({
    islandX: existing?.islandX ?? target.islandX,
    islandY: existing?.islandY ?? target.islandY,
    position: resolvedPosition,
    islandName: existing?.islandName,
    cityName: target.cityName,
    playerName: target.playerName,
    cityId: target.cityId ?? existing?.cityId,
    note: noteText,
    unsecuredResources: hasLoot ? unsecured : undefined,
  });

  return true;
}

export async function updateEnemyCityResources(
  target: CityTarget,
  resources: SpyResources,
  dateLabel: string,
  timestamp = Date.now(),
): Promise<void> {
  const ownCityIds = await getOwnCityIdSet();
  if (isOwnCityId(target.cityId, ownCityIds)) return;

  await upsertEnemyCityIntel({
    cityId: target.cityId,
    islandX: target.islandX,
    islandY: target.islandY,
    position: target.position,
    cityName: target.cityName,
    playerName: target.playerName,
    resources,
    resourcesDate: dateLabel,
    resourcesTimestamp: timestamp,
  });

  await refreshCityNoteFromIntel(target);
}

export async function updateEnemyCityBuildings(
  target: CityTarget,
  buildings: SpyBuilding[],
  dateLabel: string,
  timestamp = Date.now(),
): Promise<void> {
  const ownCityIds = await getOwnCityIdSet();
  if (isOwnCityId(target.cityId, ownCityIds)) return;

  await upsertEnemyCityIntel({
    cityId: target.cityId,
    islandX: target.islandX,
    islandY: target.islandY,
    position: target.position,
    cityName: target.cityName,
    playerName: target.playerName,
    buildings,
    buildingsDate: dateLabel,
    buildingsTimestamp: timestamp,
  });

  await refreshCityNoteFromIntel(target);
}

export async function appendReportToCityMemo(report: SpyReport): Promise<boolean> {
  if (!report.success) return false;
  if (!report.targetCityId && !report.targetCityName) return false;

  const target: CityTarget = {
    cityId: report.targetCityId ? parseInt(report.targetCityId, 10) : undefined,
    islandX: report.islandX,
    islandY: report.islandY,
    cityName: report.targetCityName,
    playerName: report.targetOwner,
  };

  let updated = false;

  if (report.resources) {
    await updateEnemyCityResources(target, report.resources, report.date.trim(), report.dateTimestamp);
    updated = true;
  }

  if (report.buildings?.length) {
    await updateEnemyCityBuildings(target, report.buildings, report.date.trim(), report.dateTimestamp);
    updated = true;
  }

  return updated;
}

export async function rebuildEnemyIntelFromSpyReports(reports: SpyReport[]): Promise<void> {
  const grouped = groupSpyReportsByCity(reports);

  for (const cityReports of grouped.values()) {
    const sample = cityReports[0];
    const target: CityTarget = {
      cityId: sample.targetCityId ? parseInt(sample.targetCityId, 10) : undefined,
      islandX: sample.islandX,
      islandY: sample.islandY,
      cityName: sample.targetCityName,
      playerName: sample.targetOwner,
    };

    const ownCityIds = await getOwnCityIdSet();
    if (isOwnCityId(target.cityId, ownCityIds)) continue;

    const resourceReport = pickLatestResourceReport(cityReports);
    const buildingReport = pickLatestBuildingReport(cityReports);

    if (resourceReport?.resources) {
      await upsertEnemyCityIntel({
        cityId: target.cityId,
        islandX: target.islandX,
        islandY: target.islandY,
        cityName: target.cityName,
        playerName: target.playerName,
        resources: resourceReport.resources,
        resourcesDate: resourceReport.date.trim(),
        resourcesTimestamp: resourceReport.dateTimestamp,
      });
    }

    if (buildingReport?.buildings?.length) {
      await upsertEnemyCityIntel({
        cityId: target.cityId,
        islandX: target.islandX,
        islandY: target.islandY,
        cityName: target.cityName,
        playerName: target.playerName,
        buildings: buildingReport.buildings,
        buildingsDate: buildingReport.date.trim(),
        buildingsTimestamp: buildingReport.dateTimestamp,
      });
    }

    await refreshCityNoteFromIntel(target);
  }
}

export async function syncReportsToCityMemos(reports: SpyReport[]): Promise<SpyReport[]> {
  await rebuildEnemyIntelFromSpyReports(reports);

  return reports.map((report) => {
    if (!report.success) return report;
    if (!report.resources && !report.buildings?.length) return report;
    return { ...report, addedToMemo: true };
  });
}
