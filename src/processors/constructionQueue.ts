import { getUpdateBackgroundData } from '../payload/ikariamPayload';
import { upsertCityConstruction } from '../storage/constructionStorage';
import { parseConstructionFromPayload } from '../utils/constructionParser';
import type { PayloadProcessor } from './types';

export const constructionQueueProcessor: PayloadProcessor = {
  name: 'constructionQueue',

  canHandle({ payload }) {
    return getUpdateBackgroundData(payload) != null;
  },

  handle({ payload }) {
    const bg = getUpdateBackgroundData(payload);
    if (!bg?.id) return;
    const cityId = String(bg.id);
    const items = parseConstructionFromPayload(payload);
    void upsertCityConstruction(cityId, items);
  },
};
