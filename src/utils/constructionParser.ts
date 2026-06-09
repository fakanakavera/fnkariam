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

function resolveBuildingName(building: BackgroundBuildingPosition): string {
  if (building.name) return building.name;

  if (building.building) {
    const registryKey = IKARIAM_BUILDING_KEY_MAP[building.building] ?? building.building;
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

/** underConstruction is a city ground slot id, not a building type id. */
export function findConstructionBuilding(bg: BackgroundData): BackgroundBuildingPosition | undefined {
  const positions = bg.position ?? [];
  const busyBuildings = positions.filter((building) => building.isBusy);
  const slot = typeof bg.underConstruction === 'number' && bg.underConstruction >= 0
    ? bg.underConstruction
    : undefined;

  if (slot != null) {
    const bySlot =
      positions.find((building) => slotId(building) === slot && building.isBusy) ??
      positions.find((building) => slotId(building) === slot);
    if (bySlot) return bySlot;
  }

  if (busyBuildings.length === 1) return busyBuildings[0];
  if (busyBuildings.length > 1 && slot != null) {
    return busyBuildings.find((building) => slotId(building) === slot) ?? busyBuildings[0];
  }

  return busyBuildings[0];
}

export function hasActiveConstruction(bg: BackgroundData): boolean {
  const endUpgradeTime = typeof bg.endUpgradeTime === 'number' ? bg.endUpgradeTime : -1;
  if (endUpgradeTime <= 0) return false;

  const underConstruction = typeof bg.underConstruction === 'number' ? bg.underConstruction : -1;
  if (underConstruction >= 0) return true;

  return (bg.position ?? []).some((building) => building.isBusy);
}

function isBuildingUnderConstruction(
  bg: BackgroundData,
  building: BackgroundBuildingPosition,
): boolean {
  if (building.isBusy) return true;

  const slot =
    typeof bg.underConstruction === 'number' && bg.underConstruction >= 0
      ? bg.underConstruction
      : undefined;

  return slot != null && slotId(building) === slot;
}

function buildConstructionItem(
  cityId: string,
  cityName: string,
  building: BackgroundBuildingPosition,
  finishTime: number,
): ConstructionItem | null {
  if (typeof building.buildingId !== 'number' || building.buildingId < 0) return null;

  const currentLevel = building.level ?? 0;
  const slot = slotId(building) ?? 0;

  return {
    id: `${cityId}-${building.buildingId}-${slot}-${finishTime}`,
    cityId,
    cityName,
    buildingId: building.buildingId,
    buildingName: resolveBuildingName(building),
    currentLevel,
    targetLevel: currentLevel + 1,
    finishTime,
    capturedAt: Date.now(),
  };
}

export function parseConstructionFromPayload(payload: PayloadEntry[]): ConstructionItem[] {
  const bg = getUpdateBackgroundData(payload);
  if (!bg?.id || !hasActiveConstruction(bg)) return [];

  const building = findConstructionBuilding(bg);
  if (!building || !isBuildingUnderConstruction(bg, building)) return [];

  const endUpgradeTime = bg.endUpgradeTime as number;
  const cityId = String(bg.id);
  const cityName = bg.name || `Cidade ${cityId}`;
  const item = buildConstructionItem(cityId, cityName, building, endUpgradeTime * 1000);
  return item ? [item] : [];
}
