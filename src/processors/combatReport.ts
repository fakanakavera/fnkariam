import { findCombatReportHtml, parseCombatReportHtml } from '../utils/combatReportParser';
import { notifyCombatReport, saveCombatReport } from '../storage/combatStorage';
import type { PayloadProcessor } from './types';

export const combatReportProcessor: PayloadProcessor = {
  name: 'combatReport',

  canHandle({ url, payload }) {
    return url.includes('militaryAdvisor') || findCombatReportHtml(payload) != null;
  },

  handle({ url, payload }) {
    const html = findCombatReportHtml(payload);
    if (!html) return;

    const report = parseCombatReportHtml(html, url);
    if (!report) return;

    void saveCombatReport(report);
    notifyCombatReport(report);
  },
};
