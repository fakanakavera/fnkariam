import {
  updateEnemyCityBuildings,
} from '../storage/cityMemoStorage';
import type { BackgroundData } from '../payload/ikariamPayload';
import { isForeignCityPage } from '../utils/foreignCityDetection';
import { isOwnCityId, resolveOwnCityIdSet } from '../utils/ownCityFilter';
import {
  parseBuildingsFromPositions,
  WAREHOUSE_BUILDING_ID,
} from '../utils/enemyUnsecuredResources';

const BUILDING_KEY_TO_ID: Record<string, number> = {
  warehouse: WAREHOUSE_BUILDING_ID,
  townHall: 0,
  port: 3,
  shipyard: 5,
  barracks: 6,
  wall: 8,
  tavern: 9,
  palace: 11,
  branchOffice: 13,
  academy: 4,
};

function isForeignCityView(): boolean {
  return isForeignCityPage();
}

function extractUpdateBackgroundData(): BackgroundData | null {
  for (const script of document.scripts) {
    const text = script.textContent;
    if (!text?.includes('updateBackgroundData')) continue;

    const marker = '["updateBackgroundData",';
    const start = text.indexOf(marker);
    if (start === -1) continue;

    let index = start + marker.length;
    while (index < text.length && /\s/.test(text[index])) index += 1;
    if (text[index] !== '{') continue;

    let depth = 0;
    const begin = index;
    for (; index < text.length; index += 1) {
      const char = text[index];
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(begin, index + 1)) as BackgroundData;
          } catch {
            break;
          }
        }
      }
    }
  }

  return null;
}

function parseBuildingsFromDom(): ReturnType<typeof parseBuildingsFromPositions> {
  const buildings: Array<{ buildingId: number | null; level?: number; name?: string }> = [];

  document.querySelectorAll('div[id^="position"].building').forEach((element) => {
    const className = element.className;
    const levelMatch = className.match(/\blevel(\d+)\b/);
    const typeMatch = className.match(/\bbuilding\s+([a-zA-Z]+)/);
    if (!levelMatch || !typeMatch) return;

    const buildingKey = typeMatch[1];
    const buildingId = BUILDING_KEY_TO_ID[buildingKey];
    if (buildingId == null) return;

    const title = element.querySelector('a[title]')?.getAttribute('title') || '';
    const name = title.replace(/\s*\(\d+\)\s*$/, '').trim() || buildingKey;

    buildings.push({
      buildingId,
      level: parseInt(levelMatch[1], 10),
      name,
    });
  });

  return parseBuildingsFromPositions(buildings);
}

function parseCityTarget(backgroundData: BackgroundData | null) {
  const cityIdFromSpy = document
    .querySelector('#js_spiesInsideText a[href*="targetCityId="]')
    ?.getAttribute('href')
    ?.match(/targetCityId=(\d+)/)?.[1];

  const cityId = backgroundData?.id
    ? parseInt(String(backgroundData.id), 10)
    : cityIdFromSpy
      ? parseInt(cityIdFromSpy, 10)
      : undefined;

  const extended = (backgroundData || {}) as BackgroundData & {
    ownerName?: string;
    islandXCoord?: string | number;
    islandYCoord?: string | number;
  };

  const islandX = parseInt(String(extended.islandXCoord || 0), 10);
  const islandY = parseInt(String(extended.islandYCoord || 0), 10);
  const cityName = backgroundData?.name || document.title.split('(').pop()?.replace(')', '').trim() || '';

  return {
    cityId: cityId && !Number.isNaN(cityId) ? cityId : undefined,
    islandX,
    islandY,
    cityName,
    playerName: extended.ownerName || '',
  };
}

let lastCaptureKey = '';

async function captureForeignCityIntel() {
  if (!isForeignCityView()) return;

  const backgroundData = extractUpdateBackgroundData();
  const target = parseCityTarget(backgroundData);
  if (!target.cityName || !target.islandX || !target.islandY) return;

  const ownCityIds = await resolveOwnCityIdSet();
  if (isOwnCityId(target.cityId, ownCityIds)) return;

  const buildings = backgroundData?.position?.length
    ? parseBuildingsFromPositions(backgroundData.position)
    : parseBuildingsFromDom();
  if (buildings.length === 0) return;

  const captureKey = `${target.cityId || target.cityName}:${buildings.length}`;
  if (captureKey === lastCaptureKey) return;
  lastCaptureKey = captureKey;

  const timestamp = Date.now();
  const dateLabel = new Date(timestamp).toLocaleString('pt-BR');

  await updateEnemyCityBuildings(target, buildings, dateLabel, timestamp);
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleCapture() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void captureForeignCityIntel();
  }, 300);
}

export default defineContentScript({
  matches: ['*://*.ikariam.gameforge.com/*'],
  main() {
    scheduleCapture();

    const observer = new MutationObserver(() => scheduleCapture());
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('IKARIAM_DATA_CAPTURED', () => scheduleCapture());
  },
});
