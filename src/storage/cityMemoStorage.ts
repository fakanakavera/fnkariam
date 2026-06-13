import { loadCityNotes, upsertCityNote } from './cityNotesStorage';
import type { CityNote } from '../types/cityNotes';
import type { SpyReport } from '../types/spyReport';
import { buildMemoEntryForReport } from '../utils/spyReportParser';

async function findCityNoteForReport(report: SpyReport): Promise<CityNote | null> {
  const store = await loadCityNotes();
  const notes = Object.values(store);
  const cityId = report.targetCityId ? parseInt(report.targetCityId, 10) : undefined;

  if (cityId) {
    const byId = notes.find((note) => note.cityId === cityId);
    if (byId) return byId;
  }

  if (report.islandX && report.islandY) {
    return (
      notes.find(
        (note) =>
          note.islandX === report.islandX &&
          note.islandY === report.islandY &&
          note.cityName === report.targetCityName,
      ) ?? null
    );
  }

  return null;
}

export async function appendReportToCityMemo(report: SpyReport): Promise<boolean> {
  const entry = buildMemoEntryForReport(report);
  if (!entry || (!report.targetCityId && !report.targetCityName)) return false;

  const marker = `[spy:${report.id}]`;
  const existing = await findCityNoteForReport(report);
  if (existing?.note.includes(marker)) return false;

  const block = `${marker}\n${entry}`;
  const noteText = existing?.note ? `${block}\n\n${existing.note}` : block;

  await upsertCityNote({
    islandX: existing?.islandX ?? report.islandX,
    islandY: existing?.islandY ?? report.islandY,
    position: existing?.position ?? 0,
    cityName: report.targetCityName,
    playerName: report.targetOwner,
    cityId: report.targetCityId ? parseInt(report.targetCityId, 10) : existing?.cityId,
    note: noteText,
  });

  return true;
}

export async function syncReportsToCityMemos(reports: SpyReport[]): Promise<SpyReport[]> {
  const updatedReports = [...reports];

  for (let i = 0; i < updatedReports.length; i += 1) {
    const report = updatedReports[i];
    if (report.addedToMemo) continue;
    if (!buildMemoEntryForReport(report)) continue;

    const added = await appendReportToCityMemo(report);
    if (added) {
      updatedReports[i] = { ...report, addedToMemo: true };
    }
  }

  return updatedReports;
}
