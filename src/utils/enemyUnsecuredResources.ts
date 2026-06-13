import { BUILDINGS, getBuildingById } from '../data/buildingRegistry';
import type { ResourceKey } from '../types/buildings';
import type { SpyBuilding, SpyResources } from '../types/spyReport';
import { RESOURCE_KEYS, RESOURCE_LABELS } from './resourceUtils';

function formatAmount(value: number): string {
  return value.toLocaleString('pt-BR');
}

export const WAREHOUSE_BUILDING_ID = 7;
export const TOWN_HALL_SAFE_PER_RESOURCE = 100;
export const WAREHOUSE_SAFE_PER_LEVEL = 480;

export const AUTO_NOTE_MARKER_START = '[ika-unsecured]';
export const AUTO_NOTE_MARKER_END = '[/ika-unsecured]';

export type UnsecuredResources = Partial<Record<ResourceKey, number>>;

export function calculateSafeCapacity(buildings: SpyBuilding[]): number {
  const warehouseLevels = buildings
    .filter((building) => building.buildingId === WAREHOUSE_BUILDING_ID || building.isWarehouse)
    .reduce((sum, building) => sum + (building.level || 0), 0);

  return TOWN_HALL_SAFE_PER_RESOURCE + warehouseLevels * WAREHOUSE_SAFE_PER_LEVEL;
}

export function calculateUnsecuredResources(
  resources: SpyResources,
  safeCapacity: number,
): UnsecuredResources {
  const unsecured: UnsecuredResources = {};

  const stockByResource: Record<ResourceKey, number> = {
    wood: resources.wood,
    wine: resources.wine,
    marble: resources.marble,
    crystal: resources.crystal,
    sulfur: resources.sulfur,
  };

  for (const key of RESOURCE_KEYS) {
    const stock = stockByResource[key] || 0;
    const lootable = Math.max(0, stock - safeCapacity);
    if (lootable > 0) unsecured[key] = lootable;
  }

  return unsecured;
}

export function hasUnsecuredResources(unsecured: UnsecuredResources): boolean {
  return Object.values(unsecured).some((value) => (value || 0) > 0);
}

export function totalUnsecuredResources(unsecured: UnsecuredResources): number {
  return Object.values(unsecured).reduce((sum, value) => sum + (value || 0), 0);
}

export const LOOT_SHIP_CAPACITY = 500;

export function shipsNeededForLoot(unsecured: UnsecuredResources): number {
  const total = totalUnsecuredResources(unsecured);
  if (total <= 0) return 0;
  return Math.ceil(total / LOOT_SHIP_CAPACITY);
}

export function getResourceStock(resources: SpyResources): Record<ResourceKey, number> {
  return {
    wood: resources.wood,
    wine: resources.wine,
    marble: resources.marble,
    crystal: resources.crystal,
    sulfur: resources.sulfur,
  };
}

function normalizeBuildingName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isWarehouseName(name: string): boolean {
  const normalized = normalizeBuildingName(name);
  return normalized.includes('armazem') || normalized.includes('warehouse');
}

export function parseBuildingsFromTextReport(text: string): SpyBuilding[] {
  const buildings: SpyBuilding[] = [];
  const pattern = /([^,(\n]+?)\s*\((\d+)\)/g;

  for (const match of text.matchAll(pattern)) {
    const name = match[1].trim();
    const level = parseInt(match[2], 10);
    if (!name || Number.isNaN(level) || level <= 0) continue;

    const definition = BUILDINGS_BY_NORMALIZED_NAME.get(normalizeBuildingName(name));
    const buildingId = definition?.buildingId;
    const isWarehouse = buildingId === WAREHOUSE_BUILDING_ID || isWarehouseName(name);

    buildings.push({
      name,
      level,
      buildingId,
      isWarehouse,
    });
  }

  return buildings;
}

const BUILDINGS_BY_NORMALIZED_NAME = new Map(
  BUILDINGS.map((definition) => [normalizeBuildingName(definition.name), definition] as const),
);

export function parseBuildingsFromPositions(
  position: Array<{ buildingId: number | null; level?: number; name?: string }> | undefined,
): SpyBuilding[] {
  if (!position) return [];

  return position
    .filter((entry) => typeof entry.buildingId === 'number' && entry.level && entry.level > 0)
    .map((entry) => ({
      buildingId: entry.buildingId as number,
      name: entry.name || getBuildingById(entry.buildingId as number)?.name || `Edifício #${entry.buildingId}`,
      level: entry.level as number,
      isWarehouse: entry.buildingId === WAREHOUSE_BUILDING_ID,
    }));
}

export function formatUnsecuredNote(
  unsecured: UnsecuredResources,
  safeCapacity: number,
  dateLabel: string,
): string | null {
  if (!hasUnsecuredResources(unsecured)) return null;

  const parts = RESOURCE_KEYS.filter((key) => (unsecured[key] || 0) > 0).map(
    (key) => `${RESOURCE_LABELS[key]}: ${formatAmount(unsecured[key] || 0)}`,
  );

  return [
    AUTO_NOTE_MARKER_START,
    `Recursos inseguros (${dateLabel})`,
    `Seguro/armazém: ${formatAmount(safeCapacity)} por recurso`,
    parts.join(' | '),
    AUTO_NOTE_MARKER_END,
  ].join('\n');
}

export function formatIntelStatusNote(input: {
  resources: SpyResources;
  safeCapacity: number;
  unsecured: UnsecuredResources;
  resourcesDate: string;
  buildingsDate?: string;
  warehouseLevels?: number[];
}): string {
  const stockParts = RESOURCE_KEYS.map((key) => {
    const stockMap: Record<ResourceKey, number> = {
      wood: input.resources.wood,
      wine: input.resources.wine,
      marble: input.resources.marble,
      crystal: input.resources.crystal,
      sulfur: input.resources.sulfur,
    };
    const stock = stockMap[key];
    if (!stock) return null;
    return `${RESOURCE_LABELS[key]} ${formatAmount(stock)}`;
  }).filter(Boolean);

  const warehouseText = input.warehouseLevels?.length
    ? `Armazéns nível ${input.warehouseLevels.join(', ')}`
    : 'Armazéns conhecidos';

  const unsecuredParts = RESOURCE_KEYS.filter((key) => (input.unsecured[key] || 0) > 0).map(
    (key) => `${RESOURCE_LABELS[key]}: ${formatAmount(input.unsecured[key] || 0)}`,
  );

  const lines = [
    AUTO_NOTE_MARKER_START,
    `Intel inimiga (${input.resourcesDate})`,
    warehouseText,
    `Seguro: ${formatAmount(input.safeCapacity)} por recurso`,
    `Estoque: ${stockParts.join(' | ') || '—'}`,
    unsecuredParts.length > 0
      ? `Inseguro: ${unsecuredParts.join(' | ')}`
      : 'Inseguro: nenhum',
    AUTO_NOTE_MARKER_END,
  ];

  if (input.buildingsDate && input.buildingsDate !== input.resourcesDate) {
    lines.splice(2, 0, `Edifícios vistos: ${input.buildingsDate}`);
  }

  return lines.join('\n');
}

export function stripAutoNote(note: string): string {
  const start = note.indexOf(AUTO_NOTE_MARKER_START);
  if (start === -1) return note.trim();

  const end = note.indexOf(AUTO_NOTE_MARKER_END, start);
  if (end === -1) {
    return note.slice(0, start).trim();
  }

  const before = note.slice(0, start).trim();
  const after = note.slice(end + AUTO_NOTE_MARKER_END.length).trim();
  return [before, after].filter(Boolean).join('\n\n');
}

export function mergeAutoNote(manualNote: string, autoBlock: string | null): string {
  const manual = stripAutoNote(manualNote);
  if (!autoBlock) return manual;
  if (!manual) return autoBlock;
  return `${autoBlock}\n\n${manual}`;
}

export function parseUnsecuredFromNote(note: string): UnsecuredResources {
  const start = note.indexOf(AUTO_NOTE_MARKER_START);
  const end = note.indexOf(AUTO_NOTE_MARKER_END, start);
  if (start === -1 || end === -1) return {};

  const block = note.slice(start + AUTO_NOTE_MARKER_START.length, end);
  const unsecured: UnsecuredResources = {};

  for (const key of RESOURCE_KEYS) {
    const label = RESOURCE_LABELS[key];
    const match = block.match(new RegExp(`${label}:\\s*([\\d.]+)`, 'i'));
    if (!match) continue;
    const amount = parseInt(match[1].replace(/\./g, ''), 10);
    if (amount > 0) unsecured[key] = amount;
  }

  return unsecured;
}
