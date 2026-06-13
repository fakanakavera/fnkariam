import type { SpyReport } from '../types/spyReport';
import { SPY_REPORTS_STORAGE_KEY } from '../types/spyReport';
import { syncReportsToCityMemos } from './cityMemoStorage';

export const SPY_REPORT_MESSAGE = 'SPY_REPORTS';

export async function saveSpyReports(reports: SpyReport[]) {
  const result = await browser.storage.local.get(SPY_REPORTS_STORAGE_KEY);
  const existing = (result[SPY_REPORTS_STORAGE_KEY] as SpyReport[] | undefined) || [];
  const byId = new Map<string, SpyReport>();

  for (const report of existing) {
    byId.set(report.id, report);
  }

  for (const report of reports) {
    const previous = byId.get(report.id);
    byId.set(report.id, {
      ...report,
      addedToMemo: previous?.addedToMemo || report.addedToMemo,
      capturedAt: previous?.capturedAt || report.capturedAt,
    });
  }

  const merged = Array.from(byId.values()).sort((a, b) => b.dateTimestamp - a.dateTimestamp);
  const withMemos = await syncReportsToCityMemos(merged);

  for (const report of withMemos) {
    byId.set(report.id, report);
  }

  const updated = Array.from(byId.values())
    .sort((a, b) => b.dateTimestamp - a.dateTimestamp)
    .slice(0, 500);

  await browser.storage.local.set({ [SPY_REPORTS_STORAGE_KEY]: updated });
  return updated;
}

export function notifySpyReports(reports: SpyReport[]) {
  browser.runtime
    .sendMessage({ type: SPY_REPORT_MESSAGE, payload: reports })
    .catch(() => {
      // Hub may be closed; data is still persisted.
    });
}

export async function clearSpyReports() {
  await browser.storage.local.set({ [SPY_REPORTS_STORAGE_KEY]: [] });
}
