import { asPayloadEntries } from '../payload/ikariamPayload';
import { barbarianProcessor } from './barbarian';
import { combatReportProcessor } from './combatReport';
import { constructionQueueProcessor } from './constructionQueue';
import { enemyCityIntelProcessor } from './enemyCityIntel';
import { resourceStateProcessor } from './resourceState';
import { spyReportProcessor } from './spyReport';
import type { PayloadProcessor, ServerResponse } from './types';

/**
 * Registered processors run independently. Add new features by creating
 * a processor module and appending it to this list.
 */
export const processors: PayloadProcessor[] = [
  resourceStateProcessor,
  enemyCityIntelProcessor,
  combatReportProcessor,
  spyReportProcessor,
  barbarianProcessor,
  constructionQueueProcessor,
];

export async function dispatchServerResponse(url: string, payload: unknown) {
  const entries = asPayloadEntries(payload);
  if (!entries) return;

  const response: ServerResponse = { url, payload: entries };

  for (const processor of processors) {
    if (!processor.canHandle(response)) continue;

    try {
      await processor.handle(response);
    } catch (error) {
      console.error(`[processor:${processor.name}]`, error);
    }
  }
}
