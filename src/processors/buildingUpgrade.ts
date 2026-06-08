import {
  getChangeView,
  getChangeViewHtml,
  getHeaderData,
  getUpdateGlobalData,
} from '../payload/ikariamPayload';
import type { PayloadProcessor } from './types';

const BUILDING_UPGRADE_MARKER = 'id="buildingUpgrade"';

export const buildingUpgradeProcessor: PayloadProcessor = {
  name: 'buildingUpgrade',

  canHandle({ payload }) {
    return getChangeViewHtml(payload, BUILDING_UPGRADE_MARKER) != null;
  },

  handle({ payload }) {
    const changeView = getChangeView(payload);
    const updateGlobalData = getUpdateGlobalData(payload);
    const headerData = getHeaderData(payload);

    if (!changeView || !updateGlobalData || !headerData) return;
    if (!getChangeViewHtml(payload, BUILDING_UPGRADE_MARKER)) return;

    const building =
      changeView.find(([, html]) => html.includes(BUILDING_UPGRADE_MARKER))?.[0] ??
      changeView[0][0];
    const currentResources = headerData.currentResources as Record<string, number>;

    document.dispatchEvent(
      new CustomEvent('IKARIAM_BUILDING_OPENED', {
        detail: {
          building,
          currentResources: {
            wood: currentResources.resource,
            wine: currentResources[1],
            marble: currentResources[2],
            crystal: currentResources[3],
            sulfur: currentResources[4],
          },
          woodProduction: (headerData.resourceProduction as number) * 3600,
          producedTradegood: headerData.producedTradegood,
          tradegoodProduction: (headerData.tradegoodProduction as number) * 3600,
        },
      }),
    );
  },
};
