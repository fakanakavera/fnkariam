import type { CombatReport } from '../types/combatReport';

export const COMBAT_REPORTS_STORAGE_KEY = 'combatReports';
export const COMBAT_REPORT_MESSAGE = 'COMBAT_REPORT';

export async function saveCombatReport(report: CombatReport) {
  const result = await browser.storage.local.get(COMBAT_REPORTS_STORAGE_KEY);
  const existing = (result[COMBAT_REPORTS_STORAGE_KEY] as CombatReport[] | undefined) || [];
  const withoutDuplicate = existing.filter((item) => item.id !== report.id);
  const updated = [report, ...withoutDuplicate].slice(0, 100);
  await browser.storage.local.set({ [COMBAT_REPORTS_STORAGE_KEY]: updated });
}

export function notifyCombatReport(report: CombatReport) {
  browser.runtime
    .sendMessage({ type: COMBAT_REPORT_MESSAGE, payload: report })
    .catch(() => {
      // Hub may be closed; data is still persisted.
    });
}
