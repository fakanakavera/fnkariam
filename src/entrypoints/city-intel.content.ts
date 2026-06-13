import {
  updateEnemyCityBuildings,
  updateEnemyCityResources,
} from '../storage/cityMemoStorage';
import type { BackgroundData } from '../payload/ikariamPayload';
import {
  parseBuildingsFromPositions,
  WAREHOUSE_BUILDING_ID,
} from '../utils/enemyUnsecuredResources';
import type { SpyResources } from '../types/spyReport';

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

function parseNumber(text: string): number {
  return parseInt(text.replace(/\./g, '').replace(/,/g, ''), 10) || 0;
}

function isForeignCityView(): boolean {
  if (document.body.id !== 'city') return false;
  if (document.getElementById('cityAmbrosiaFountain')?.classList.contains('fountain_foreign')) {
    return true;
  }
  if (document.getElementById('js_spiesInsideText')) return true;

  for (const script of document.scripts) {
    const text = script.textContent || '';
    if (text.includes('cityLeftMenu') && /"ownCity"\s*:\s*0/.test(text)) return true;
  }

  return false;
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

function parseResourcesFromDom(): SpyResources | null {
  const fromVars = extractDataSetForView();
  if (fromVars) return fromVars;

  const wood = document.getElementById('js_GlobalMenu_wood')?.textContent;
  if (!wood) return null;

  return {
    wood: parseNumber(wood),
    wine: parseNumber(document.getElementById('js_GlobalMenu_wine')?.textContent || '0'),
    marble: parseNumber(document.getElementById('js_GlobalMenu_marble')?.textContent || '0'),
    crystal: parseNumber(document.getElementById('js_GlobalMenu_crystal')?.textContent || '0'),
    sulfur: parseNumber(document.getElementById('js_GlobalMenu_sulfur')?.textContent || '0'),
    gold: 0,
  };
}

function extractDataSetForView(): SpyResources | null {
  for (const script of document.scripts) {
    const text = script.textContent || '';
    const match = text.match(/currentResources:\s*JSON\.parse\('([^']+)'\)/);
    if (!match) continue;

    try {
      const parsed = JSON.parse(match[1]) as Record<string, number>;
      return {
        wood: Math.floor(parsed.resource || parsed[0] || 0),
        wine: Math.floor(parsed[1] || 0),
        marble: Math.floor(parsed[2] || 0),
        crystal: Math.floor(parsed[3] || 0),
        sulfur: Math.floor(parsed[4] || 0),
        gold: 0,
      };
    } catch {
      return null;
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

  const buildings = backgroundData?.position?.length
    ? parseBuildingsFromPositions(backgroundData.position)
    : parseBuildingsFromDom();
  const resources = parseResourcesFromDom();
  if (buildings.length === 0 && !resources) return;

  const captureKey = `${target.cityId || target.cityName}:${buildings.length}:${JSON.stringify(resources)}`;
  if (captureKey === lastCaptureKey) return;
  lastCaptureKey = captureKey;

  const timestamp = Date.now();
  const dateLabel = new Date(timestamp).toLocaleString('pt-BR');

  if (buildings.length > 0) {
    await updateEnemyCityBuildings(target, buildings, dateLabel, timestamp);
  }

  if (resources) {
    await updateEnemyCityResources(target, resources, dateLabel, timestamp);
  }
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
