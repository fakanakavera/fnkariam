import type { StoredGameState } from '../types/gameState';
import { GAME_STATE_STORAGE_KEY, GAME_STATE_UPDATED_MESSAGE } from '../types/gameState';
import { applyViewDataPayload } from './viewDataParser';

const EMPTY_STATE: StoredGameState = {
  account: null,
  cities: [],
  lastUpdated: 0,
};

export async function loadGameState(): Promise<StoredGameState> {
  const result = await browser.storage.local.get(GAME_STATE_STORAGE_KEY);
  const stored = result[GAME_STATE_STORAGE_KEY] as StoredGameState | undefined;
  if (!stored) return { ...EMPTY_STATE };

  return {
    account: stored.account ?? null,
    cities: Array.isArray(stored.cities) ? stored.cities : [],
    lastUpdated: stored.lastUpdated ?? 0,
  };
}

export async function saveGameState(state: StoredGameState) {
  await browser.storage.local.set({ [GAME_STATE_STORAGE_KEY]: state });
}

export async function mergeAndSaveViewData(payload: unknown): Promise<StoredGameState | null> {
  const previous = await loadGameState();
  const next = applyViewDataPayload(payload, previous);
  if (!next) return null;

  await saveGameState(next);
  return next;
}

export function notifyGameStateUpdated(state: StoredGameState) {
  browser.runtime
    .sendMessage({
      type: GAME_STATE_UPDATED_MESSAGE,
      payload: state,
    })
    .catch(() => {
      // Hub may be closed; data is still persisted.
    });
}
