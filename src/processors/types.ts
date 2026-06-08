import type { PayloadEntry } from '../payload/ikariamPayload';

export interface ServerResponse {
  url: string;
  payload: PayloadEntry[];
}

export interface PayloadProcessor {
  name: string;
  canHandle(response: ServerResponse): boolean;
  handle(response: ServerResponse): Promise<void> | void;
}
