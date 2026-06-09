import { getBuildingByKey } from '../data/buildingRegistry';

/** Matches the original wxt-react-starter GameHandler.processBuildingUpgrade exactly. */
export function processBuildingUpgrade(payload: unknown) {
  try {
    if (!Array.isArray(payload)) return;

    const changeView = payload.find((entry) => entry[0] === 'changeView')?.[1];
    if (!Array.isArray(changeView)) return;

    const updateGlobalData = payload.find((entry) => entry[0] === 'updateGlobalData')?.[1] as
      | { headerData?: Record<string, unknown> }
      | undefined;
    if (!updateGlobalData?.headerData) return;

    const viewName = changeView[0];
    const viewHtml = changeView[1];
    if (typeof viewHtml !== 'string' || !viewHtml.includes('id="buildingUpgrade"')) return;

    const headerData = updateGlobalData.headerData;
    const currentResources = headerData.currentResources as Record<string, number>;

    const levelMatch = viewHtml.match(/Nível\s*(\d+)/i) || viewHtml.match(/Level\s*(\d+)/i);
    const currentLevel = levelMatch ? parseInt(levelMatch[1], 10) : 0;
    const nextLevel = currentLevel + 1;

    const buildingDef = typeof viewName === 'string' ? getBuildingByKey(viewName) : undefined;
    const currentLevelData = buildingDef?.levels.find((l) => l.level === currentLevel);
    const nextLevelData = buildingDef?.levels.find((l) => l.level === nextLevel);

    let productionPreview: string | null = null;
    if (currentLevelData?.bonus && nextLevelData?.bonus) {
      const bonusKey = Object.keys(nextLevelData.bonus).find((key) => key in (currentLevelData.bonus || {}));
      if (bonusKey) {
        const delta = (nextLevelData.bonus[bonusKey] || 0) - (currentLevelData.bonus[bonusKey] || 0);
        if (delta !== 0) {
          productionPreview = `${delta > 0 ? '+' : ''}${delta} ${bonusKey}`;
        }
      }
    }

    window.dispatchEvent(
      new CustomEvent('IKARIAM_BUILDING_OPENED', {
        detail: {
          building: viewName,
          buildingName: buildingDef?.name,
          currentLevel,
          nextLevel,
          productionPreview,
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
  } catch (error) {
    console.error('[gameHandler] Erro ao processar atualização de edifício:', error);
  }
}
