import { getChangeView, getHeaderData, getUpdateGlobalData } from '../payload/ikariamPayload';
import type { PayloadProcessor } from './types';

export const buildingUpgradeProcessor: PayloadProcessor = {
  name: 'buildingUpgrade',

  canHandle({ payload }) {
    const changeView = getChangeView(payload);
    if (!changeView) return false;

    const viewHtml = changeView[0]?.[1];
    return typeof viewHtml === 'string' && viewHtml.includes('id="buildingUpgrade"');
  },

  handle({ payload }) {
    const changeView = getChangeView(payload);
    const updateGlobalData = getUpdateGlobalData(payload);
    const headerData = getHeaderData(payload);

    if (!changeView || !updateGlobalData || !headerData) return;

    const building = changeView[0]?.[0];
    const currentResources = headerData.currentResources as Record<string, number>;

    window.dispatchEvent(
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
