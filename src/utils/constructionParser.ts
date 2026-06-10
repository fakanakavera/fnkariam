import { getBuildingByKey, getBuildingName } from '../data/buildingRegistry';
import { getUpdateBackgroundData, type BackgroundBuildingPosition, type BackgroundData, type PayloadEntry } from '../payload/ikariamPayload';
import type { ConstructionItem } from '../types/construction';

const IKARIAM_BUILDING_KEY_MAP: Record<string, string> = {
  townHall: 'camaramunicipal',
  port: 'porto',
  academy: 'academia',
  shipyard: 'estaleiro',
  dockyard: 'estaleiro',
  barracks: 'quartel',
  warehouse: 'armazem',
  wall: 'muralha',
  tavern: 'taverna',
  museum: 'museu',
  palace: 'palacio',
  embassy: 'embaixada',
  marketplace: 'mercado',
  workshop: 'oficina',
  hideout: 'espionagem',
  safehouse: 'espionagem',
  governor: 'residenciadogovernador',
  palaceColony: 'residenciadogovernador',
  forest: 'guardaflorestal',
  stonemason: 'pedreiro',
  glassblower: 'fabricadevidro',
  winegrower: 'viticultor',
  alchemist: 'torrealquimista',
  carpenter: 'carpintaria',
  architect: 'atelierdearquitetura',
  optician: 'oculista',
  winecellar: 'cavesdevinho',
  firework: 'fabricadepirotecnia',
  temple: 'templo',
  dump: 'deposito',
  pirate: 'fortalezadospiratas',
  blackmarket: 'mercadonegro',
  archive: 'arquivosdecartasnauticas',
  tradeport: 'estaleirocomercial',
  shrine: 'santuariodosdeuses',
  forge: 'forjadecronos',
};

function normalizeBuildingKey(building?: string): string | undefined {
  if (!building) return undefined;
  const base = building.split(' ')[0];
  return IKARIAM_BUILDING_KEY_MAP[base] ?? IKARIAM_BUILDING_KEY_MAP[building] ?? base;
}

function isConstructionSite(building: BackgroundBuildingPosition): boolean {
  return Boolean(
    building.building?.includes('constructionSite') ||
    building.buildingimg === 'constructionSite',
  );
}

function resolveBuildingName(building: BackgroundBuildingPosition): string {
  if (building.name) return building.name;

  const registryKey = normalizeBuildingKey(building.building);
  if (registryKey) {
    const fromRegistry = getBuildingByKey(registryKey)?.name;
    if (fromRegistry) return fromRegistry;
  }

  if (typeof building.buildingId === 'number' && building.buildingId >= 0) {
    return getBuildingName(building.buildingId);
  }

  return 'Edifício';
}

function slotId(building: BackgroundBuildingPosition): number | undefined {
  if (typeof building.groundId === 'number') return building.groundId;
  if (typeof building.position === 'number') return building.position;
  return undefined;
}

function underConstructionIndex(bg: BackgroundData): number | undefined {
  const slot = bg.underConstruction;
  if (typeof slot !== 'number' || slot < 0) return undefined;
  return slot;
}

/** underConstruction is primarily a position[] index; groundId is a legacy fallback. */
export function findConstructionBuilding(bg: BackgroundData): BackgroundBuildingPosition | undefined {
  const positions = bg.position ?? [];
  const index = underConstructionIndex(bg);

  if (index != null && index < positions.length) {
    const byIndex = positions[index];
    if (byIndex && (isConstructionSite(byIndex) || byIndex.isBusy || typeof byIndex.buildingId === 'number')) {
      return byIndex;
    }
  }

  const busyBuildings = positions.filter((building) => building.isBusy);
  const constructionSites = positions.filter(isConstructionSite);

  if (constructionSites.length === 1) return constructionSites[0];

  const groundSlot = index;
  if (groundSlot != null) {
    const byGround =
      positions.find((building) => slotId(building) === groundSlot && building.isBusy) ??
      positions.find((building) => slotId(building) === groundSlot);
    if (byGround && (isConstructionSite(byGround) || typeof byGround.buildingId === 'number')) {
      return byGround;
    }
  }

  if (busyBuildings.length === 1) return busyBuildings[0];
  if (busyBuildings.length > 1 && index != null) {
    return busyBuildings.find((building) => positions.indexOf(building) === index) ?? busyBuildings[0];
  }

  return busyBuildings[0];
}

export function hasActiveConstruction(bg: BackgroundData): boolean {
  const endUpgradeTime = typeof bg.endUpgradeTime === 'number' ? bg.endUpgradeTime : -1;
  if (endUpgradeTime <= 0) return false;

  const underConstruction = typeof bg.underConstruction === 'number' ? bg.underConstruction : -1;
  if (underConstruction >= 0) return true;

  return (bg.position ?? []).some((building) => building.isBusy || isConstructionSite(building));
}

function isBuildingUnderConstruction(
  bg: BackgroundData,
  building: BackgroundBuildingPosition,
): boolean {
  if (building.isBusy || isConstructionSite(building)) return true;

  const index = underConstructionIndex(bg);
  if (index == null) return false;

  const positions = bg.position ?? [];
  if (positions[index] === building) return true;

  return slotId(building) === index;
}

function resolveFinishTime(bg: BackgroundData, building: BackgroundBuildingPosition): number | null {
  const endUpgradeTime = typeof bg.endUpgradeTime === 'number' ? bg.endUpgradeTime : -1;
  if (endUpgradeTime > 0) return endUpgradeTime * 1000;

  const completed = typeof building.completed === 'number' ? building.completed : -1;
  if (completed > 0) return completed * 1000;

  return null;
}

export function parseConstructionFromPayload(payload: PayloadEntry[]): ConstructionItem[] {
  const bg = getUpdateBackgroundData(payload);
  if (!bg?.id || !hasActiveConstruction(bg)) return [];

  const building = findConstructionBuilding(bg);
  if (!building || !isBuildingUnderConstruction(bg, building)) return [];

  const finishTime = resolveFinishTime(bg, building);
  if (!finishTime || typeof building.buildingId !== 'number' || building.buildingId < 0) return [];

  const cityId = String(bg.id);
  const cityName = bg.name || `Cidade ${cityId}`;
  const slot = underConstructionIndex(bg) ?? slotId(building) ?? 0;
  const currentLevel = building.level ?? 0;

  return [{
    id: `${cityId}-${building.buildingId}-${slot}-${finishTime}`,
    cityId,
    cityName,
    buildingId: building.buildingId,
    buildingName: resolveBuildingName(building),
    currentLevel,
    targetLevel: currentLevel + 1,
    finishTime,
    capturedAt: Date.now(),
  }];
}
