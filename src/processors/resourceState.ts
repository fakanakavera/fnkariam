import { getHeaderData } from '../payload/ikariamPayload';
import { mergeAndSaveViewData, notifyGameStateUpdated } from '../utils/gameStorage';
import type { PayloadProcessor } from './types';

export const resourceStateProcessor: PayloadProcessor = {
  name: 'resourceState',

  canHandle({ payload }) {
    return getHeaderData(payload) != null;
  },

  handle({ payload }) {
    void mergeAndSaveViewData(payload).then((state) => {
      if (state) notifyGameStateUpdated(state);
    });
  },
};
