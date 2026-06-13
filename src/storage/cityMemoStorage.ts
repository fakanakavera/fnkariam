import type { CityMemo } from '../types/cityMemo';
import { CITY_MEMOS_STORAGE_KEY } from '../types/cityMemo';
import type { SpyReport } from '../types/spyReport';
import { buildMemoEntryForReport, getCityMemoKey } from '../utils/spyReportParser';

export async function loadCityMemos(): Promise<CityMemo[]> {
  const result = await browser.storage.local.get(CITY_MEMOS_STORAGE_KEY);
  return (result[CITY_MEMOS_STORAGE_KEY] as CityMemo[] | undefined) || [];
}

export async function saveCityMemos(memos: CityMemo[]) {
  await browser.storage.local.set({ [CITY_MEMOS_STORAGE_KEY]: memos });
}

export async function getCityMemo(cityKey: string): Promise<CityMemo | null> {
  const memos = await loadCityMemos();
  return memos.find((memo) => memo.cityId === cityKey) || null;
}

export async function updateCityMemo(cityKey: string, memoText: string) {
  const memos = await loadCityMemos();
  const index = memos.findIndex((memo) => memo.cityId === cityKey);
  if (index === -1) return;

  memos[index] = {
    ...memos[index],
    memo: memoText,
    lastUpdated: Date.now(),
  };

  await saveCityMemos(memos);
}

export async function appendReportToCityMemo(report: SpyReport): Promise<boolean> {
  const entry = buildMemoEntryForReport(report);
  if (!entry || (!report.targetCityId && !report.targetCityName)) return false;

  const cityKey = getCityMemoKey(report);
  const memos = await loadCityMemos();
  const existingIndex = memos.findIndex((memo) => memo.cityId === cityKey);

  const marker = `[spy:${report.id}]`;
  if (existingIndex >= 0 && memos[existingIndex].memo.includes(marker)) {
    return false;
  }

  const block = `${marker}\n${entry}`;
  const now = Date.now();

  if (existingIndex >= 0) {
    const current = memos[existingIndex];
    memos[existingIndex] = {
      ...current,
      cityName: report.targetCityName || current.cityName,
      coords: report.coords || current.coords,
      owner: report.targetOwner || current.owner,
      memo: current.memo ? `${block}\n\n${current.memo}` : block,
      lastUpdated: now,
    };
  } else {
    memos.unshift({
      cityId: cityKey,
      cityName: report.targetCityName,
      coords: report.coords,
      owner: report.targetOwner,
      memo: block,
      lastUpdated: now,
    });
  }

  await saveCityMemos(memos);
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
