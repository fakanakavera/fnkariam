import { asPayloadEntries } from '../payload/ikariamPayload';
import { barbarianProcessor } from './barbarian';
import { buildingUpgradeProcessor } from './buildingUpgrade';
import { combatReportProcessor } from './combatReport';
import { resourceStateProcessor } from './resourceState';
import { spyReportProcessor } from './spyReport';
import type { PayloadProcessor, ServerResponse } from './types';

/**
 * Registered processors run independently. Add new features by creating
 * a processor module and appending it to this list.
 */
export const processors: PayloadProcessor[] = [
  resourceStateProcessor,
  combatReportProcessor,
  spyReportProcessor,
  buildingUpgradeProcessor,
  barbarianProcessor,
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
