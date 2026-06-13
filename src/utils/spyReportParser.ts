import type { SpyReport, SpyResources, SpyTroopSection, SpyUnit } from '../types/spyReport';
import {
  asPayloadEntries,
  getChangeViewHtml,
  type PayloadEntry,
} from '../payload/ikariamPayload';

function parseNumber(text: string): number {
  return parseInt(text.replace(/\./g, '').replace(/,/g, ''), 10) || 0;
}

function parseDateTimestamp(dateText: string): number {
  const match = dateText.trim().match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) return 0;

  const [, day, month, year, hour, minute, second] = match;
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10),
  ).getTime();
}

function parseAgentPair(text: string): { lost: number; deployed: number } {
  const match = text.replace(/\s+/g, ' ').trim().match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return { lost: 0, deployed: 0 };
  return { lost: parseInt(match[1], 10), deployed: parseInt(match[2], 10) };
}

function parseCityLink(cityCell: Element | null): {
  name: string;
  coords: string;
  cityId: string;
  islandX: number;
  islandY: number;
} {
  const link = cityCell?.querySelector('a');
  const href = link?.getAttribute('href') || '';
  const cityId = href.match(/selectCity=(\d+)/)?.[1] || '';
  const islandX = parseInt(href.match(/xcoord=(\d+)/)?.[1] || '0', 10);
  const islandY = parseInt(href.match(/ycoord=(\d+)/)?.[1] || '0', 10);

  const linkText = link?.textContent?.replace(/\s+/g, ' ').trim() || '';
  const coordsMatch = linkText.match(/\[(\d+)\s*:\s*(\d+)\]/);
  const coords = coordsMatch ? `[${coordsMatch[1]}:${coordsMatch[2]}]` : '';
  const name = linkText.replace(/\[\d+\s*:\s*\d+\]/, '').trim();

  return { name, coords, cityId, islandX, islandY };
}

function parseResourcesTable(table: HTMLTableElement): SpyResources | null {
  const resources: SpyResources = {
    wood: 0,
    wine: 0,
    marble: 0,
    crystal: 0,
    sulfur: 0,
    gold: 0,
  };

  let found = false;
  table.querySelectorAll('tr').forEach((row) => {
    const img = row.querySelector('td.unitname img');
    const countCell = row.querySelector('td.count');
    if (!img || !countCell) return;

    found = true;
    const amount = parseNumber(countCell.textContent || '0');
    const title = (img.getAttribute('title') || img.getAttribute('alt') || '').toLowerCase();

    if (title.includes('ouro')) resources.gold = amount;
    else if (title.includes('constru') || title.includes('madeira')) resources.wood = amount;
    else if (title.includes('vinho')) resources.wine = amount;
    else if (title.includes('mármore') || title.includes('marmore')) resources.marble = amount;
    else if (title.includes('cristal')) resources.crystal = amount;
    else if (title.includes('enxofre')) resources.sulfur = amount;
  });

  return found ? resources : null;
}

function getUnitNamesFromHeader(row: Element): string[] {
  const headers = Array.from(row.querySelectorAll('th'));
  return headers.slice(1).map((th) => {
    const img = th.querySelector('img');
    return img?.getAttribute('title') || img?.getAttribute('alt') || th.getAttribute('title') || '';
  }).filter(Boolean);
}

function parseTroopTable(table: HTMLTableElement): SpyTroopSection | null {
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return null;

  const unitNames = getUnitNamesFromHeader(rows[0]);
  const dataRow = rows[1];
  const category = dataRow.querySelector('td.category')?.textContent?.trim() || '';
  if (!category) return null;

  const cells = Array.from(dataRow.querySelectorAll('td')).slice(1);
  const units: SpyUnit[] = [];

  if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
    const emptyText = cells[0].textContent?.trim() || '';
    if (emptyText.toLowerCase().includes('nenhuma')) {
      return { category, units: [] };
    }
  }

  cells.forEach((cell, index) => {
    if (cell.hasAttribute('colspan')) return;
    const count = parseNumber(cell.textContent || '0');
    if (count <= 0) return;
    units.push({
      name: unitNames[index] || `Unidade ${index + 1}`,
      count,
    });
  });

  return { category, units };
}

function parseReportDetail(detailRow: Element | null): Pick<SpyReport, 'resources' | 'troops' | 'textReport' | 'statusText'> {
  if (!detailRow) return {};

  const statusText =
    detailRow.querySelector('tr.status td:last-child')?.textContent?.trim() ||
    detailRow.querySelector('.resultImage img')?.getAttribute('title') ||
    '';

  const resourcesTable = detailRow.querySelector('table.resourcesTable');
  const resources = resourcesTable ? parseResourcesTable(resourcesTable as HTMLTableElement) || undefined : undefined;

  const troops: SpyTroopSection[] = [];
  detailRow.querySelectorAll('table.reportTable:not(.resourcesTable)').forEach((table) => {
    const section = parseTroopTable(table as HTMLTableElement);
    if (section) troops.push(section);
  });

  let textReport: string | undefined;
  const reportCell = detailRow.querySelector('td.report');
  if (reportCell && !resourcesTable && troops.length === 0) {
    const text = reportCell.textContent?.replace(/\s+/g, ' ').trim();
    if (text) textReport = text;
  }

  return {
    statusText,
    resources,
    troops: troops.length > 0 ? troops : undefined,
    textReport,
  };
}

function parseSummaryRow(row: Element): SpyReport | null {
  const idMatch = row.id.match(/^message(\d+)$/);
  if (!idMatch) return null;

  const id = idMatch[1];
  const targetOwner = row.querySelector('.targetOwner')?.textContent?.trim() || '';
  const cityInfo = parseCityLink(row.querySelector('.targetCity'));
  const mission = row.querySelector('.subject')?.textContent?.trim() || '';
  const resultImg = row.querySelector('.resultImage img');
  const statusText = resultImg?.getAttribute('title') || resultImg?.getAttribute('alt') || '';
  const success = statusText.toLowerCase().includes('sucesso');
  const agents = parseAgentPair(row.querySelector('.lostAgents')?.textContent || '');
  const decoys = parseAgentPair(row.querySelector('.lostDecoys')?.textContent || '');
  const date = row.querySelector('.date')?.textContent?.trim() || '';

  const detailRow = row.parentElement?.querySelector(`#tbl_mail${id}`);
  const detail = parseReportDetail(detailRow);

  return {
    id,
    targetOwner,
    targetCityName: cityInfo.name,
    targetCityId: cityInfo.cityId,
    islandX: cityInfo.islandX,
    islandY: cityInfo.islandY,
    coords: cityInfo.coords,
    mission,
    success,
    statusText: detail.statusText || statusText,
    agentsLost: agents.lost,
    agentsDeployed: agents.deployed,
    decoysLost: decoys.lost,
    decoysDeployed: decoys.deployed,
    date,
    dateTimestamp: parseDateTimestamp(date),
    resources: detail.resources,
    troops: detail.troops,
    textReport: detail.textReport,
    addedToMemo: false,
    capturedAt: Date.now(),
  };
}

export function parseSpyReportsHtml(html: string): SpyReport[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('#espionageReports');
  if (!table) return [];

  const reports: SpyReport[] = [];
  table.querySelectorAll('tr.espionageReports').forEach((row) => {
    const report = parseSummaryRow(row);
    if (report) reports.push(report);
  });

  return reports;
}

export function findSpyReportHtml(payload: unknown): string | null {
  const entries = asPayloadEntries(payload);
  if (!entries) return null;
  return findSpyReportHtmlFromEntries(entries);
}

export function findSpyReportHtmlFromEntries(payload: PayloadEntry[]): string | null {
  const fromChangeView = getChangeViewHtml(payload, 'espionageReports');
  if (fromChangeView) return fromChangeView;

  for (const [, data] of payload) {
    if (typeof data === 'string' && data.includes('espionageReports')) return data;
  }

  return null;
}

export function isResourceMission(mission: string): boolean {
  return /recursos/i.test(mission);
}

export function isTroopMission(mission: string): boolean {
  return /tropas|frotas/i.test(mission);
}

export function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

export function formatResourceMemoEntry(report: SpyReport): string | null {
  if (!report.resources) return null;

  const parts: string[] = [];
  if (report.resources.wood) parts.push(`Madeira: ${formatNumber(report.resources.wood)}`);
  if (report.resources.wine) parts.push(`Vinho: ${formatNumber(report.resources.wine)}`);
  if (report.resources.marble) parts.push(`Mármore: ${formatNumber(report.resources.marble)}`);
  if (report.resources.crystal) parts.push(`Cristal: ${formatNumber(report.resources.crystal)}`);
  if (report.resources.sulfur) parts.push(`Enxofre: ${formatNumber(report.resources.sulfur)}`);
  if (report.resources.gold) parts.push(`Ouro: ${formatNumber(report.resources.gold)}`);

  if (parts.length === 0) return null;
  return `[${report.date.trim()}] ${report.mission}\n${parts.join(' | ')}`;
}

export function formatTroopMemoEntry(report: SpyReport): string | null {
  if (!report.troops?.length) return null;

  const lines = report.troops.map((section) => {
    if (section.units.length === 0) return `${section.category}: nenhuma unidade`;
    const units = section.units.map((unit) => `${unit.name} ${formatNumber(unit.count)}`).join(', ');
    return `${section.category}: ${units}`;
  });

  return `[${report.date.trim()}] ${report.mission}\n${lines.join('\n')}`;
}

export function buildMemoEntryForReport(report: SpyReport): string | null {
  if (isResourceMission(report.mission)) return formatResourceMemoEntry(report);
  if (isTroopMission(report.mission)) return formatTroopMemoEntry(report);
  return null;
}
