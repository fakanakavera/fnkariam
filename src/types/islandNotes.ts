export const ISLAND_NOTES_STORAGE_KEY = 'islandNotes';

export interface IslandNote {
  /** Stable key: `${islandX}:${islandY}` */
  key: string;
  islandX: number;
  islandY: number;
  islandName?: string;
  note: string;
  updatedAt: number;
}

export type IslandNotesStore = Record<string, IslandNote>;

export function islandNoteKey(islandX: number, islandY: number): string {
  return `${islandX}:${islandY}`;
}
