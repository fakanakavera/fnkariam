import {
  asPayloadEntries,
  getChangeViewHtml,
  type PayloadEntry,
} from '../payload/ikariamPayload';

export interface TownHallIntel {
  maxInhabitants: number;
  populationGrowth: number;
  satisfaction: number;
  satisfactionLabel: string;
  wineTavernBonus: number;
  wineServingBonus: number;
}

/** Parses Ikariam numbers like "1.357" or "0,44". */
export function parseIkariamNumber(text: string): number {
  const trimmed = text.trim().replace(/\s/g, '');
  if (!trimmed) return 0;

  if (trimmed.includes(',')) {
    return parseFloat(trimmed.replace(/\./g, '').replace(',', '.')) || 0;
  }

  return parseFloat(trimmed.replace(/\./g, '')) || 0;
}

function parseSignedBonus(text: string): number {
  const match = text.match(/([+-]?\d[\d.,]*)/);
  return match ? parseIkariamNumber(match[1]) : 0;
}

function readElementNumber(doc: Document, id: string): number {
  const text = doc.getElementById(id)?.textContent || '';
  return parseIkariamNumber(text);
}

function readElementText(doc: Document, id: string): string {
  return doc.getElementById(id)?.textContent?.trim() || '';
}

export function parseTownHallHtml(html: string): TownHallIntel | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  if (!doc.getElementById('js_TownHallOccupiedSpace')) return null;

  const maxInhabitants = readElementNumber(doc, 'js_TownHallMaxInhabitants');
  const populationGrowth = readElementNumber(doc, 'js_TownHallPopulationGrowthValue');
  const satisfaction = readElementNumber(doc, 'js_TownHallHappinessLargeValue');
  const satisfactionLabel =
    readElementText(doc, 'js_TownHallHappinessLargeText') ||
    readElementText(doc, 'js_TownHallHappinessSmallText');

  if (!maxInhabitants) return null;

  return {
    maxInhabitants,
    populationGrowth,
    satisfaction,
    satisfactionLabel,
    wineTavernBonus: parseSignedBonus(readElementText(doc, 'js_TownHallSatisfactionOverviewWineBoniTavernBonusValue')),
    wineServingBonus: parseSignedBonus(readElementText(doc, 'js_TownHallSatisfactionOverviewWineBoniServeBonusValue')),
  };
}

export function findTownHallHtml(payload: unknown): string | null {
  const entries = asPayloadEntries(payload);
  if (!entries) return null;
  return findTownHallHtmlFromEntries(entries);
}

export function findTownHallHtmlFromEntries(payload: PayloadEntry[]): string | null {
  const fromChangeView = getChangeViewHtml(payload, 'js_TownHallOccupiedSpace');
  if (fromChangeView) return fromChangeView;

  for (const [, data] of payload) {
    if (typeof data === 'string' && data.includes('js_TownHallOccupiedSpace')) return data;
  }

  return null;
}
