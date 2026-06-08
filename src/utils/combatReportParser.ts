import type { CombatLoot, CombatReport, CombatRound, CombatUnitResult } from '../types/combatReport';
import {
  asPayloadEntries,
  getChangeViewHtml,
  type PayloadEntry,
} from '../payload/ikariamPayload';

function parseNumber(text: string): number {
  return parseInt(text.replace(/\./g, '').replace(/,/g, ''), 10) || 0;
}

function parseLosses(text: string): number {
  const match = text.match(/\((-?\d+)\)/);
  return match ? Math.abs(parseInt(match[1], 10)) : 0;
}

function parseLoot(doc: Document): CombatLoot {
  const loot: CombatLoot = {
    gold: 0,
    wood: 0,
    wine: 0,
    marble: 0,
    crystal: 0,
    sulfur: 0,
  };

  doc.querySelectorAll('.result ul.resources li.value').forEach((li) => {
    const text = li.textContent?.trim() || '';
    const amount = parseNumber(text);
    const imgTitle = li.querySelector('img')?.getAttribute('title')?.toLowerCase() || '';

    if (imgTitle.includes('ouro')) loot.gold = amount;
    else if (imgTitle.includes('constru') || imgTitle.includes('madeira')) loot.wood = amount;
    else if (imgTitle.includes('vinho')) loot.wine = amount;
    else if (imgTitle.includes('mármore') || imgTitle.includes('marmore')) loot.marble = amount;
    else if (imgTitle.includes('cristal')) loot.crystal = amount;
    else if (imgTitle.includes('enxofre')) loot.sulfur = amount;
  });

  return loot;
}

function getUnitNamesFromRow(row: Element | null): string[] {
  if (!row) return [];
  return Array.from(row.querySelectorAll('.tooltip'))
    .map((tooltip) => tooltip.textContent?.trim() || '')
    .filter(Boolean);
}

function parseUnitRow(row: Element, unitNames: string[], side: 'attacker' | 'defender'): CombatUnitResult[] {
  const units: CombatUnitResult[] = [];
  const cells = row.querySelectorAll('td.numbers, td.numbers2');

  let unitIndex = 0;
  for (let i = 0; i < cells.length; i += 2) {
    const countCell = cells[i];
    const lossCell = cells[i + 1];
    if (!countCell || countCell.classList.contains('center')) continue;

    const count = parseNumber(countCell.textContent || '0');
    const losses = parseLosses(lossCell?.textContent || '');

    if (count > 0 || losses > 0) {
      units.push({
        name: unitNames[unitIndex] || `${side === 'attacker' ? 'Atacante' : 'Defensor'} ${unitIndex + 1}`,
        count,
        losses,
      });
    }
    unitIndex += 1;
  }

  return units;
}

function parseRoundTable(table: HTMLTableElement): CombatRound | null {
  const content = table.closest('.content');
  const roundLabel = content?.querySelector('h5')?.textContent?.trim() || 'Resultado da batalha';

  const attackerUnits: CombatUnitResult[] = [];
  const defenderUnits: CombatUnitResult[] = [];

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  let lastHeaderRow: Element | null = null;

  rows.forEach((row) => {
    if (row.querySelector('.tooltip')) {
      lastHeaderRow = row;
      return;
    }

    const firstCol = row.querySelector('td.firstCol');
    if (!firstCol) return;

    const unitNames = getUnitNamesFromRow(lastHeaderRow);

    if (firstCol.classList.contains('attackerLine')) {
      attackerUnits.push(...parseUnitRow(row, unitNames, 'attacker'));
    }

    if (firstCol.classList.contains('defenderLine')) {
      defenderUnits.push(...parseUnitRow(row, unitNames, 'defender'));
    }
  });

  if (attackerUnits.length === 0 && defenderUnits.length === 0) return null;

  return { roundLabel, attackerUnits, defenderUnits };
}

function extractCombatId(doc: Document, sourceUrl: string): string {
  const exportLink = doc.querySelector('a[href*="combatId="]')?.getAttribute('href') || '';
  const fromLink = exportLink.match(/combatId=(\d+)/)?.[1];
  if (fromLink) return fromLink;

  const fromUrl = sourceUrl.match(/combatId=(\d+)/)?.[1];
  if (fromUrl) return fromUrl;

  const detailedLink = doc.querySelector('a[href*="detailedCombatId="]')?.getAttribute('href') || '';
  const fromDetailed = detailedLink.match(/detailedCombatId=(\d+)/)?.[1];
  if (fromDetailed) return fromDetailed;

  return `report-${Date.now()}`;
}

export function parseCombatReportHtml(html: string, sourceUrl = ''): CombatReport | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const reportRoot = doc.querySelector('#troopsReport') || doc.querySelector('.contentBox01h');
  if (!reportRoot) return null;

  const titleNode = reportRoot.querySelector('h3.header');
  const titleText = titleNode?.childNodes[0]?.textContent?.trim() || 'Relatório de combate';
  const date = titleNode?.querySelector('.date')?.textContent?.replace(/[()]/g, '').trim() || '';

  const attacker = reportRoot.querySelector('.attacker span')?.textContent?.trim() || '';
  const defender = reportRoot.querySelector('.defender span')?.textContent?.trim() || '';
  const winner = reportRoot.querySelector('.result .winners')?.textContent?.replace(/Vencedores:\s*/i, '').trim() || '';
  const loser = reportRoot.querySelector('.result .losers')?.textContent?.replace(/Perdedores:\s*/i, '').trim() || '';

  const notes: string[] = [];
  reportRoot.querySelectorAll('.result > div').forEach((div) => {
    if (div.classList.contains('winners') || div.classList.contains('losers') || div.classList.contains('headline')) return;
    const text = div.textContent?.trim();
    if (text) notes.push(text);
  });

  const rounds: CombatRound[] = [];
  reportRoot.querySelectorAll('table.table01.overview').forEach((table) => {
    const round = parseRoundTable(table as HTMLTableElement);
    if (round) rounds.push(round);
  });

  const loot = parseLoot(doc);

  return {
    id: extractCombatId(doc, sourceUrl),
    title: titleText,
    date,
    attacker,
    defender,
    winner,
    loser,
    loot,
    rounds,
    notes,
    capturedAt: Date.now(),
  };
}

export function findCombatReportHtml(payload: unknown): string | null {
  const entries = asPayloadEntries(payload);
  if (!entries) return null;

  return findCombatReportHtmlFromEntries(entries);
}

export function findCombatReportHtmlFromEntries(payload: PayloadEntry[]): string | null {
  const fromChangeView = getChangeViewHtml(payload, 'troopsReport');
  if (fromChangeView) return fromChangeView;

  for (const [, data] of payload) {
    if (typeof data === 'string' && data.includes('troopsReport')) return data;
  }

  return null;
}
