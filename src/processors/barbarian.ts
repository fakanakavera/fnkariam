import { getBackgroundData } from '../payload/ikariamPayload';
import type { PayloadProcessor } from './types';

export const barbarianProcessor: PayloadProcessor = {
  name: 'barbarian',

  canHandle({ url, payload }) {
    if (!url.includes('plunder') || !url.includes('barbarianVillage')) return false;
    return getBackgroundData(payload)?.barbarians?.level != null;
  },

  handle({ payload }) {
    const level = getBackgroundData(payload)?.barbarians?.level;
    if (!level) return;

    window.dispatchEvent(
      new CustomEvent('BARBARIAN_PILLAGE_OPENED', {
        detail: { level: parseInt(level, 10) },
      }),
    );
  },
};
