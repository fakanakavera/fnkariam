export const CITY_NOTES_STORAGE_KEY = 'cityNotes';

export interface CityNote {
  /** Stable key: `${islandX}:${islandY}:${position}` */
  key: string;
  islandX: number;
  islandY: number;
  position: number;
  islandName?: string;
  cityId?: number;
  cityName: string;
  playerId?: string;
  playerName: string;
  note: string;
  updatedAt: number;
}

export type CityNotesStore = Record<string, CityNote>;

export function cityNoteKey(islandX: number, islandY: number, position: number): string {
  return `${islandX}:${islandY}:${position}`;
}
