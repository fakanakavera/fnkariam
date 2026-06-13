import { notifySpyReports, saveSpyReports } from '../storage/spyStorage';
import { findSpyReportHtml, parseSpyReportsHtml } from '../utils/spyReportParser';
import type { PayloadProcessor } from './types';

export const spyReportProcessor: PayloadProcessor = {
  name: 'spyReport',

  canHandle({ url, payload }) {
    return url.includes('view=safehouse') || findSpyReportHtml(payload) != null;
  },

  handle({ payload }) {
    const html = findSpyReportHtml(payload);
    if (!html) return;

    const reports = parseSpyReportsHtml(html);
    if (reports.length === 0) return;

    void saveSpyReports(reports).then((saved) => {
      notifySpyReports(saved);
    });
  },
};
