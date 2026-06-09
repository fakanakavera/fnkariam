import { getBuildingName } from '../data/buildingRegistry';
import { findEntry, getUpdateBackgroundData, type PayloadEntry } from '../payload/ikariamPayload';
import type { ConstructionItem } from '../types/construction';

export interface BackgroundBuilding {
  buildingId: number | null;
  name?: string;
  level?: number;
  isBusy?: boolean;
  building?: string;
}

export interface UpdateBackgroundData {
  id?: string;
  name?: string;
  underConstruction?: number;
  endUpgradeTime?: number;
  startUpgradeTime?: number;
  position?: BackgroundBuilding[];
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

export function parseConstructionFromHtml(html: string, cityId: string, cityName: string): ConstructionItem[] {
  const items: ConstructionItem[] = [];
  const timeMatch = html.match(/Tempo de construção:\s*([^<]+)/i);
  const durationMs = timeMatch ? parseConstructionDuration(timeMatch[1]) : null;
  if (!durationMs) return items;

  const buildingMatch = html.match(/class="building ([^"]+)_l"/i);
  const buildingKey = buildingMatch?.[1];
  const levelMatch = html.match(/Nível\s*(\d+)/i) || html.match(/Level\s*(\d+)/i);
  const currentLevel = levelMatch ? parseInt(levelMatch[1], 10) : 0;

  items.push({
    id: `${cityId}-html-${Date.now()}`,
    cityId,
    cityName,
    buildingId: -1,
    buildingName: buildingKey || 'Edifício',
    currentLevel,
    targetLevel: currentLevel + 1,
    finishTime: Date.now() + durationMs,
    capturedAt: Date.now(),
  });

  return items;
}

export function parseConstructionFromPayload(payload: PayloadEntry[]): ConstructionItem[] {
  const bg = getUpdateBackgroundData(payload);
  if (!bg?.id) return [];

  const cityId = String(bg.id);
  const cityName = bg.name || `Cidade ${cityId}`;
  const items: ConstructionItem[] = [];
  const now = Date.now();

  const endUpgradeTime = typeof bg.endUpgradeTime === 'number' ? bg.endUpgradeTime : -1;
  const underConstruction = typeof bg.underConstruction === 'number' ? bg.underConstruction : -1;
  const hasBusyBuilding = (bg.position || []).some((building) => building.isBusy);

  if (endUpgradeTime <= 0 && underConstruction < 0 && !hasBusyBuilding) {
    return [];
  }

  if (endUpgradeTime > 0) {
    const busyBuilding = bg.position?.find(
      (building) =>
        building.isBusy ||
        (typeof building.buildingId === 'number' && building.buildingId === underConstruction),
    );

    const buildingId =
      underConstruction >= 0
        ? underConstruction
        : typeof busyBuilding?.buildingId === 'number'
          ? busyBuilding.buildingId
          : -1;

    const currentLevel = busyBuilding?.level || 0;

    items.push({
      id: `${cityId}-${buildingId}-${endUpgradeTime}`,
      cityId,
      cityName,
      buildingId,
      buildingName: busyBuilding?.name || getBuildingName(buildingId),
      currentLevel,
      targetLevel: currentLevel + 1,
      finishTime: endUpgradeTime * 1000,
      capturedAt: now,
    });

    return items;
  }

  const busyBuildings = (bg.position || []).filter(
    (building) => building.isBusy && typeof building.buildingId === 'number',
  );

  for (const building of busyBuildings) {
    const buildingId = building.buildingId as number;
    const currentLevel = building.level || 0;
    items.push({
      id: `${cityId}-${buildingId}-busy`,
      cityId,
      cityName,
      buildingId,
      buildingName: building.name || getBuildingName(buildingId),
      currentLevel,
      targetLevel: currentLevel + 1,
      finishTime: now + 3600000,
      capturedAt: now,
    });
  }

  const changeView = findEntry(payload, 'changeView');
  if (Array.isArray(changeView) && typeof changeView[1] === 'string') {
    const htmlItems = parseConstructionFromHtml(changeView[1], cityId, cityName);
    if (htmlItems.length > 0 && items.length === 0) {
      return htmlItems;
    }
    if (htmlItems.length > 0 && items.length > 0) {
      items[0] = {
        ...items[0],
        finishTime: htmlItems[0].finishTime,
      };
    }
  }

  return items;
}
