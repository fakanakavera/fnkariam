export type PayloadEntry = [string, unknown];

export interface UpdateGlobalData {
  headerData?: Record<string, unknown>;
  backgroundData?: BackgroundData;
}

export interface BackgroundBuildingPosition {
  buildingId: number | null;
  level?: number;
  position?: number;
  groundId?: number;
  name?: string;
  isBusy?: boolean;
  building?: string;
  buildingimg?: string;
  completed?: number;
  countdownText?: string;
}

export interface BackgroundData {
  id?: string;
  name?: string;
  underConstruction?: number;
  endUpgradeTime?: number;
  startUpgradeTime?: number;
  position?: BackgroundBuildingPosition[];
  barbarians?: { level?: string };
}

export function getUpdateBackgroundData(payload: PayloadEntry[]): BackgroundData | null {
  const entry = findEntry(payload, 'updateBackgroundData');
  if (entry && typeof entry === 'object') {
    return entry as BackgroundData;
  }

  const fromGlobal = getUpdateGlobalData(payload)?.backgroundData;
  if (fromGlobal) return fromGlobal;

  return getBackgroundData(payload);
}

export function asPayloadEntries(payload: unknown): PayloadEntry[] | null {
  if (!Array.isArray(payload)) return null;
  return flattenPayloadEntries(payload as PayloadEntry[]);
}

/** Ikariam sometimes nests view updates inside ajax.Responder. */
export function flattenPayloadEntries(payload: PayloadEntry[]): PayloadEntry[] {
  const flat: PayloadEntry[] = [];

  for (const [key, value] of payload) {
    if (key === 'ajax.Responder' && Array.isArray(value)) {
      for (const item of value) {
        if (Array.isArray(item) && item.length >= 2 && typeof item[0] === 'string') {
          flat.push([item[0], item[1]]);
        }
      }
      continue;
    }

    flat.push([key, value]);
  }

  return flat;
}

export function findEntry(payload: PayloadEntry[], key: string): unknown {
  return payload.find(([entryKey]) => entryKey === key)?.[1];
}

export function getUpdateGlobalData(payload: PayloadEntry[]): UpdateGlobalData | null {
  const entry = findEntry(payload, 'updateGlobalData');
  if (!entry || typeof entry !== 'object') return null;
  return entry as UpdateGlobalData;
}

export function getHeaderData(payload: PayloadEntry[]): Record<string, unknown> | null {
  return getUpdateGlobalData(payload)?.headerData ?? null;
}

export function getBackgroundData(payload: PayloadEntry[]): BackgroundData | null {
  const fromGlobal = getUpdateGlobalData(payload)?.backgroundData;
  if (fromGlobal) return fromGlobal;

  for (const [, data] of payload) {
    if (data && typeof data === 'object' && 'backgroundData' in data) {
      const backgroundData = (data as { backgroundData?: BackgroundData }).backgroundData;
      if (backgroundData) return backgroundData;
    }
  }

  return null;
}

function normalizeChangeView(entry: unknown): [string, string][] {
  if (!Array.isArray(entry) || entry.length < 2) return [];

  // Ikariam sends a flat tuple: ["viewName", "<html>"]
  if (typeof entry[0] === 'string' && typeof entry[1] === 'string') {
    return [[entry[0], entry[1]]];
  }

  const views: [string, string][] = [];
  for (const item of entry) {
    if (Array.isArray(item) && typeof item[0] === 'string' && typeof item[1] === 'string') {
      views.push([item[0], item[1]]);
    }
  }

  return views;
}

export function getChangeView(payload: PayloadEntry[]): [string, string][] | null {
  const views = normalizeChangeView(findEntry(payload, 'changeView'));
  return views.length > 0 ? views : null;
}

export function getChangeViewHtml(payload: PayloadEntry[], marker: string): string | null {
  const changeView = getChangeView(payload);
  if (!changeView) return null;

  for (const [, html] of changeView) {
    if (typeof html === 'string' && html.includes(marker)) return html;
  }

  return null;
}
