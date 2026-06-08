import type { AccountData, City, CityDetails } from '../types/game';

export type { AccountData, City, CityDetails };

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GAME_STATE_STORAGE_KEY, GAME_STATE_UPDATED_MESSAGE } from '../types/gameState';
import { loadGameState } from '../utils/gameStorage';

const STALE_MS = 30 * 60 * 1000;

interface GameContextValue {
  account: AccountData | null;
  cities: City[];
  isCityStale: (city: City) => boolean;
  lastSavedAt: number | null;
}

const GameContext = createContext<GameContextValue | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountData | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    const applyStoredState = (state: { account: AccountData | null; cities: City[]; lastUpdated: number }) => {
      setAccount(state.account);
      setCities(state.cities);
      setLastSavedAt(state.lastUpdated || null);
    };

    void loadGameState().then(applyStoredState);

    const onMessage = (message: {
      type?: string;
      payload?: { account: AccountData | null; cities: City[]; lastUpdated: number };
    }) => {
      if (message.type !== GAME_STATE_UPDATED_MESSAGE || !message.payload) return;
      applyStoredState(message.payload);
    };

    const onStorageChanged = (
      changes: Record<string, browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[GAME_STATE_STORAGE_KEY]?.newValue) return;
      applyStoredState(changes[GAME_STATE_STORAGE_KEY].newValue as {
        account: AccountData | null;
        cities: City[];
        lastUpdated: number;
      });
    };

    browser.runtime.onMessage.addListener(onMessage);
    browser.storage.onChanged.addListener(onStorageChanged);

    return () => {
      browser.runtime.onMessage.removeListener(onMessage);
      browser.storage.onChanged.removeListener(onStorageChanged);
    };
  }, []);

  return (
    <GameContext.Provider
      value={{
        account,
        cities,
        lastSavedAt,
        isCityStale: (city) => (city.lastUpdate ? Date.now() - city.lastUpdate > STALE_MS : true),
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame deve ser usado dentro de um GameProvider');
  return context;
}
