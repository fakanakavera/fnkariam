import { getBuildingByKey, getBuildingName } from '../data/buildingRegistry';
import { findEntry, getUpdateBackgroundData, type BackgroundBuildingPosition, type BackgroundData, type PayloadEntry } from '../payload/ikariamPayload';
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
  governor: 'residenciadogovernador',
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

export function parseConstructionDuration(text: string): number | null {
  const normalized = text.replace(/\s+/g, ' ').trim();
  let totalSeconds = 0;
  let matched = false;

  const dayMatch = normalized.match(/(\d+)\s*d/i);
  const hourMatch = normalized.match(/(\d+)\s*h/i);
  const minuteMatch = normalized.match(/(\d+)\s*m/i);
  const secondMatch = normalized.match(/(\d+)\s*s/i);

  if (dayMatch) {
    totalSeconds += parseInt(dayMatch[1], 10) * 86400;
    matched = true;
  }
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    matched = true;
  }
  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
    matched = true;
  }
  if (secondMatch) {
    totalSeconds += parseInt(secondMatch[1], 10);
    matched = true;
  }

  return matched ? totalSeconds * 1000 : null;
}

function parseConstructionFromHtml(
  html: string,
  cityId: string,
  cityName: string,
  building?: BackgroundBuildingPosition,
): ConstructionItem | null {
  const durationMs = parseConstructionDuration(
    html.match(/Tempo de construção:\s*([^<]+)/i)?.[1] ?? '',
  );
  if (!durationMs) return null;

  const finishTime = Date.now() + durationMs;

  if (building && typeof building.buildingId === 'number') {
    return buildConstructionItem(cityId, cityName, building, finishTime);
  }

  const buildingKey = html.match(/class="building ([^"]+)_l"/i)?.[1];
  const registryKey = buildingKey ? IKARIAM_BUILDING_KEY_MAP[buildingKey] ?? buildingKey : undefined;
  const levelMatch = html.match(/Nível\s*(\d+)/i) || html.match(/Level\s*(\d+)/i);
  const currentLevel = levelMatch ? parseInt(levelMatch[1], 10) : 0;

  return {
    id: `${cityId}-html-${registryKey ?? 'building'}-${finishTime}`,
    cityId,
    cityName,
    buildingId: getBuildingByKey(registryKey ?? '')?.buildingId ?? -1,
    buildingName: registryKey ? getBuildingByKey(registryKey)?.name ?? buildingKey ?? 'Edifício' : 'Edifício',
    currentLevel,
    targetLevel: currentLevel + 1,
    finishTime,
    capturedAt: Date.now(),
  };
}

export function parseConstructionFromPayload(payload: PayloadEntry[]): ConstructionItem[] {
  const bg = getUpdateBackgroundData(payload);
  if (!bg?.id) return [];

  const cityId = String(bg.id);
  const cityName = bg.name || `Cidade ${cityId}`;
  const building = findConstructionBuilding(bg);
  const endUpgradeTime = typeof bg.endUpgradeTime === 'number' ? bg.endUpgradeTime : -1;

  if (!building && endUpgradeTime <= 0) return [];

  if (endUpgradeTime > 0 && building) {
    const item = buildConstructionItem(cityId, cityName, building, endUpgradeTime * 1000);
    return item ? [item] : [];
  }

  const changeView = findEntry(payload, 'changeView');
  const html = Array.isArray(changeView) && typeof changeView[1] === 'string' ? changeView[1] : '';

  if (building) {
    const htmlItem = html ? parseConstructionFromHtml(html, cityId, cityName, building) : null;
    if (htmlItem) return [htmlItem];

    const item = buildConstructionItem(cityId, cityName, building, Date.now() + 3600000);
    return item ? [item] : [];
  }

  if (html) {
    const htmlItem = parseConstructionFromHtml(html, cityId, cityName);
    return htmlItem ? [htmlItem] : [];
  }

  return [];
}
