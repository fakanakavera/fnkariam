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
import { loadCityNotes, upsertCityNote } from './cityNotesStorage';
import type { CityNote } from '../types/cityNotes';
import type { SpyBuilding, SpyReport, SpyResources } from '../types/spyReport';

interface CityTarget {
  cityId?: number;
  islandX: number;
  islandY: number;
  position?: number;
  cityName: string;
  playerName: string;
}

async function findCityNoteForTarget(target: CityTarget): Promise<CityNote | null> {
  const store = await loadCityNotes();
  const notes = Object.values(store);

  if (target.cityId) {
    const byId = notes.find((note) => note.cityId === target.cityId);
    if (byId) return byId;
  }

  if (target.position != null) {
    const byPosition = notes.find(
      (note) =>
        note.islandX === target.islandX &&
        note.islandY === target.islandY &&
        note.position === target.position,
    );
    if (byPosition) return byPosition;
  }

  return (
    notes.find(
      (note) =>
        note.islandX === target.islandX &&
        note.islandY === target.islandY &&
        note.cityName === target.cityName,
    ) ?? null
  );
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

  const existing = await findCityNoteForTarget(target);
  const noteText = mergeAutoNote(existing?.note || '', autoBlock);
  const hasLoot = hasUnsecuredResources(unsecured);

  await upsertCityNote({
    islandX: existing?.islandX ?? target.islandX,
    islandY: existing?.islandY ?? target.islandY,
    position: existing?.position ?? target.position ?? 0,
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
