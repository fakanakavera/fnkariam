import { getChangeViewHtml, getHeaderData, getUpdateGlobalData } from '../payload/ikariamPayload';
import { renderBuildingUpgradePanel } from '../ui/buildingUpgradePanel';
import type { PayloadProcessor } from './types';

const BUILDING_UPGRADE_MARKER = 'id="buildingUpgrade"';

export const buildingUpgradeProcessor: PayloadProcessor = {
  name: 'buildingUpgrade',

  canHandle({ payload }) {
    return getChangeViewHtml(payload, BUILDING_UPGRADE_MARKER) != null;
  },

  handle({ payload }) {
    const updateGlobalData = getUpdateGlobalData(payload);
    const headerData = getHeaderData(payload);

    if (!updateGlobalData || !headerData) return;
    if (!getChangeViewHtml(payload, BUILDING_UPGRADE_MARKER)) return;

    const currentResources = headerData.currentResources as Record<string, number>;

    renderBuildingUpgradePanel({
      currentResources: {
        wood: currentResources.resource,
        wine: currentResources[1],
        marble: currentResources[2],
        crystal: currentResources[3],
        sulfur: currentResources[4],
      },
      woodProduction: (headerData.resourceProduction as number) * 3600,
      producedTradegood: headerData.producedTradegood as number,
      tradegoodProduction: (headerData.tradegoodProduction as number) * 3600,
    });
  },
};
