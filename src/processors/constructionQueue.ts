import { getChangeView, getUpdateBackgroundData, type PayloadEntry } from '../payload/ikariamPayload';
import { upsertCityConstruction } from '../storage/constructionStorage';
import { parseConstructionFromPayload } from '../utils/constructionParser';
import type { PayloadProcessor } from './types';

function isTownHallPayload(payload: PayloadEntry[], url: string): boolean {
  if (url.includes('view=townHall')) return true;

  const views = getChangeView(payload);
  return views?.some(([view]) => view === 'townHall') ?? false;
}

export const constructionQueueProcessor: PayloadProcessor = {
  name: 'constructionQueue',

  canHandle({ payload, url }) {
    if (!getUpdateBackgroundData(payload)?.id) return false;
    return isTownHallPayload(payload, url);
  },

  handle({ payload }) {
    const bg = getUpdateBackgroundData(payload);
    if (!bg?.id) return;
    const cityId = String(bg.id);
    const items = parseConstructionFromPayload(payload);
    void upsertCityConstruction(cityId, items);
  },
};
