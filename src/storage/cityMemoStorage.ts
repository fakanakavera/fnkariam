import {
  calculateSafeCapacity,
  calculateUnsecuredResources,
  formatUnsecuredNote,
  hasUnsecuredResources,
  mergeAutoNote,
  parseUnsecuredFromNote,
} from '../utils/enemyUnsecuredResources';
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
  const dateLabel = intel.resourcesDate || new Date(intel.resourcesTimestamp || Date.now()).toLocaleString('pt-BR');
  const autoBlock = formatUnsecuredNote(unsecured, safeCapacity, dateLabel);

  const existing = await findCityNoteForTarget(target);

  const noteText = mergeAutoNote(existing?.note || '', autoBlock);
  const hasLoot = hasUnsecuredResources(unsecured);

  if (!hasLoot && !existing?.note?.trim()) {
    return false;
  }

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

  if (report.resources) {
    await updateEnemyCityResources(target, report.resources, report.date.trim(), report.dateTimestamp);
    return true;
  }

  if (report.buildings?.length) {
    await updateEnemyCityBuildings(target, report.buildings, report.date.trim(), report.dateTimestamp);
    return true;
  }

  return false;
}

export async function syncReportsToCityMemos(reports: SpyReport[]): Promise<SpyReport[]> {
  const updatedReports = [...reports];

  for (let i = 0; i < updatedReports.length; i += 1) {
    const report = updatedReports[i];
    if (report.addedToMemo) continue;
    if (!report.resources && !report.buildings?.length) continue;

    const added = await appendReportToCityMemo(report);
    if (added) {
      updatedReports[i] = { ...report, addedToMemo: true };
    }
  }

  return updatedReports;
}
