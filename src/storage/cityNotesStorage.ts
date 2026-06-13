import {
  CITY_NOTES_STORAGE_KEY,
  cityNoteKey,
  type CityNote,
  type CityNotesStore,
} from '../types/cityNotes';
import {
  hasUnsecuredResources,
  parseUnsecuredFromNote,
} from '../utils/enemyUnsecuredResources';

export async function loadCityNotes(): Promise<CityNotesStore> {
  const result = await browser.storage.local.get(CITY_NOTES_STORAGE_KEY);
  const stored = result[CITY_NOTES_STORAGE_KEY] as CityNotesStore | undefined;
  return stored ?? {};
}

export async function getCityNote(
  islandX: number,
  islandY: number,
  position: number,
): Promise<CityNote | null> {
  const store = await loadCityNotes();
  return store[cityNoteKey(islandX, islandY, position)] ?? null;
}

export async function upsertCityNote(note: Omit<CityNote, 'key' | 'updatedAt'> & { note: string }) {
  const key = cityNoteKey(note.islandX, note.islandY, note.position);
  const store = await loadCityNotes();
  const existing = store[key];

  const unsecuredResources = parseUnsecuredFromNote(note.note);
  const entry: CityNote = {
    ...existing,
    ...note,
    key,
    unsecuredResources: hasUnsecuredResources(unsecuredResources) ? unsecuredResources : undefined,
    updatedAt: Date.now(),
  };

  store[key] = entry;
  await browser.storage.local.set({ [CITY_NOTES_STORAGE_KEY]: store });
  return entry;
}

export async function deleteCityNote(islandX: number, islandY: number, position: number) {
  const key = cityNoteKey(islandX, islandY, position);
  const store = await loadCityNotes();
  if (!store[key]) return;
  delete store[key];
  await browser.storage.local.set({ [CITY_NOTES_STORAGE_KEY]: store });
}
