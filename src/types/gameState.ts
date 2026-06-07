import type { AccountData, City } from '../context/GameContext';

export interface StoredGameState {
  account: AccountData | null;
  cities: City[];
  lastUpdated: number;
}

export const GAME_STATE_STORAGE_KEY = 'gameState';

export const GAME_STATE_UPDATED_MESSAGE = 'GAME_STATE_UPDATED';
