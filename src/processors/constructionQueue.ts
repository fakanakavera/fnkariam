import {
  getChangeView,
  getChangeViewHtml,
  getUpdateBackgroundData,
  type PayloadEntry,
} from '../payload/ikariamPayload';
import { upsertCityConstruction } from '../storage/constructionStorage';
import { hasActiveConstruction, parseConstructionFromPayload } from '../utils/constructionParser';
import type { PayloadProcessor } from './types';

function isTownHallPayload(payload: PayloadEntry[], url: string): boolean {
  if (url.includes('view=townHall') || url.includes('oldView=townHall')) return true;

  const views = getChangeView(payload);
  if (views?.some(([view]) => view === 'townHall')) return true;

  const townHallHtml = getChangeViewHtml(payload, 'id="townHall"');
  if (townHallHtml?.includes('sidebar_townHall')) return true;

  return false;
}

export const constructionQueueProcessor: PayloadProcessor = {
  name: 'constructionQueue',

  canHandle({ payload, url }) {
    const bg = getUpdateBackgroundData(payload);
    if (!bg?.id) return false;

    if (isTownHallPayload(payload, url)) return true;

    // City background refresh carries construction state while town hall is open.
    if (url.includes('view=city') && hasActiveConstruction(bg)) return true;

    return false;
  },

  handle({ payload }) {
    const bg = getUpdateBackgroundData(payload);
    if (!bg?.id) return;
    const cityId = String(bg.id);
    const items = parseConstructionFromPayload(payload);
    void upsertCityConstruction(cityId, items);
  },
};
