export type PayloadEntry = [string, unknown];

export interface UpdateGlobalData {
  headerData?: Record<string, unknown>;
  backgroundData?: BackgroundData;
}

export interface BackgroundData {
  id?: string;
  name?: string;
  position?: Array<{ buildingId: number; level: number; position?: number }>;
  barbarians?: { level?: string };
}

export function asPayloadEntries(payload: unknown): PayloadEntry[] | null {
  if (!Array.isArray(payload)) return null;
  return payload as PayloadEntry[];
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
