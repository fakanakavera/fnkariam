import type { BackgroundData } from '../payload/ikariamPayload';

type ForeignBackgroundData = BackgroundData & {
  cityLeftMenu?: { ownCity?: number };
  spiesInside?: string;
};

/** True when the viewed city belongs to another player (spy city view). */
export function isForeignCityBackground(backgroundData: BackgroundData): boolean {
  const data = backgroundData as ForeignBackgroundData;

  if (data.cityLeftMenu?.ownCity === 0) return true;
  if (typeof data.spiesInside === 'string' && data.spiesInside.length > 0) return true;

  return false;
}

export function extractBgViewOwnCity(): number | null {
  for (const script of document.scripts) {
    const text = script.textContent || '';
    const match = text.match(/cityLeftMenu:\s*\{[^}]*"ownCity"\s*:\s*(\d+)/);
    if (match) return parseInt(match[1], 10);
  }

  return null;
}

export function isForeignCityPage(): boolean {
  if (document.body.id !== 'city') return false;

  const ownCity = extractBgViewOwnCity();
  if (ownCity === 1) return false;
  if (ownCity === 0) return true;

  if (document.getElementById('cityAmbrosiaFountain')?.classList.contains('fountain_foreign')) {
    return true;
  }

  // Spy deployed in the city being viewed.
  return document.getElementById('js_spiesInsideText') != null;
}
