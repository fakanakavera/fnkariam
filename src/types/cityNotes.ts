import type { ResourceKey } from './buildings';

export const CITY_NOTES_STORAGE_KEY = 'cityNotes';

export interface CityNoteTarget {
  islandX: number;
  islandY: number;
  position?: number;
  cityId?: number;
  cityName?: string;
}

export interface CityNote {
  /** Stable key from {@link cityNoteKeyFromTarget} */
  key: string;
  islandX: number;
  islandY: number;
  /** Island slot index; omitted when only cityId is known (e.g. spy intel). */
  position?: number;
  islandName?: string;
  cityId?: number;
  cityName: string;
  playerId?: string;
  playerName: string;
  note: string;
  /** Parsed from the auto-generated unsecured-resources block. */
  unsecuredResources?: Partial<Record<ResourceKey, number>>;
  updatedAt: number;
}

export type CityNotesStore = Record<string, CityNote>;

export function cityNoteKey(islandX: number, islandY: number, position: number): string {
  return `${islandX}:${islandY}:${position}`;
}

export function cityNoteKeyFromTarget(target: CityNoteTarget): string {
  if (target.position != null) {
    return cityNoteKey(target.islandX, target.islandY, target.position);
  }
  if (target.cityId != null) {
    return `${target.islandX}:${target.islandY}:id:${target.cityId}`;
  }
  throw new Error('City note requires position or cityId');
}
