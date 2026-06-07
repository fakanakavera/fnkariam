import type { CombatReport } from '../types/combatReport';
import { mergeAndSaveViewData, notifyGameStateUpdated } from './gameStorage';
import { findCombatReportHtml, parseCombatReportHtml } from './combatReportParser';

type PayloadEntry = [string, unknown];

function findEntry(payload: PayloadEntry[], key: string): unknown {
  const entry = payload.find((item) => item[0] === key);
  return entry?.[1];
}

export class GameHandler {
  static handleServerResponse(url: string, payload: PayloadEntry[]) {
    if (url.includes('plunder') && url.includes('barbarianVillage')) {
      this.processBarbariansPillage(payload);
    }

    if (url.includes('view')) {
      this.processBuildingUpgrade(payload);
      this.processCombatReport(url, payload);
    }

    this.processView(payload);
  }

  static processView(payload: PayloadEntry[]) {
    try {
      void mergeAndSaveViewData(payload).then((state) => {
        if (state) notifyGameStateUpdated(state);
      });
    } catch (error) {
      console.error('[gameHandler] Erro ao processar dados de request view', error);
    }
  }

  static processCombatReport(url: string, payload: PayloadEntry[]) {
    if (!url.includes('militaryAdvisor') && !findCombatReportHtml(payload)) return;

    try {
      const html = findCombatReportHtml(payload);
      if (!html) return;

      const report = parseCombatReportHtml(html, url);
      if (!report) return;

      void saveCombatReport(report);

      const message = { type: 'COMBAT_REPORT', payload: report };
      browser.runtime.sendMessage(message).catch(() => {
        console.log('[gameHandler] Nenhuma interface aberta para receber COMBAT_REPORT.');
      });
    } catch (error) {
      console.error('[gameHandler] Erro ao processar relatório de combate', error);
    }
  }

  static processBarbariansPillage(payload: PayloadEntry[]) {
    try {
      const first = payload[0]?.[1] as { backgroundData?: { barbarians?: { level?: string } } };
      const level = first?.backgroundData?.barbarians?.level;
      if (!level) return;

      window.dispatchEvent(
        new CustomEvent('BARBARIAN_PILLAGE_OPENED', {
          detail: { level: parseInt(level, 10) },
        }),
      );
    } catch (error) {
      console.error('[gameHandler] Erro ao obter nível dos bárbaros do payload:', error);
    }
  }

  static processBuildingUpgrade(payload: PayloadEntry[]) {
    try {
      const changeView = findEntry(payload, 'changeView') as [string, string][] | undefined;
      if (!changeView) return;

      const updateGlobalData = findEntry(payload, 'updateGlobalData') as
        | { headerData?: Record<string, unknown> }
        | undefined;
      if (!updateGlobalData?.headerData) return;

      const building = changeView[0]?.[0];
      const viewHtml = changeView[0]?.[1];

      if (!viewHtml?.includes('id="buildingUpgrade"')) return;

      const headerData = updateGlobalData.headerData as Record<string, unknown>;
      const currentResources = headerData.currentResources as Record<string, number>;

      const resources = {
        wood: currentResources.resource,
        wine: currentResources[1],
        marble: currentResources[2],
        crystal: currentResources[3],
        sulfur: currentResources[4],
      };

      window.dispatchEvent(
        new CustomEvent('IKARIAM_BUILDING_OPENED', {
          detail: {
            building,
            currentResources: resources,
            woodProduction: (headerData.resourceProduction as number) * 3600,
            producedTradegood: headerData.producedTradegood,
            tradegoodProduction: (headerData.tradegoodProduction as number) * 3600,
          },
        }),
      );
    } catch (error) {
      console.error('[gameHandler] Erro ao processar atualização de edifício:', error);
    }
  }
}

export async function saveCombatReport(report: CombatReport) {
  const result = await browser.storage.local.get('combatReports');
  const existing = (result.combatReports as CombatReport[] | undefined) || [];
  const withoutDuplicate = existing.filter((item) => item.id !== report.id);
  const updated = [report, ...withoutDuplicate].slice(0, 100);
  await browser.storage.local.set({ combatReports: updated });
}
