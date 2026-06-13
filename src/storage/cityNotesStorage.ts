import {
  CITY_NOTES_STORAGE_KEY,
  cityNoteKey,
  cityNoteKeyFromTarget,
  type CityNote,
  type CityNoteTarget,
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

export async function findCityNote(target: CityNoteTarget): Promise<CityNote | null> {
  const store = await loadCityNotes();
  const notes = Object.values(store);

  if (target.cityId != null) {
    const byIdKey = store[`${target.islandX}:${target.islandY}:id:${target.cityId}`];
    if (byIdKey) return byIdKey;

    const byId = notes.find((note) => note.cityId === target.cityId);
    if (byId) return byId;
  }

  if (target.position != null) {
    const byPosition = store[cityNoteKey(target.islandX, target.islandY, target.position)];
    if (byPosition) return byPosition;
  }

  if (target.cityName) {
    return (
      notes.find(
        (note) =>
          note.islandX === target.islandX &&
          note.islandY === target.islandY &&
          note.cityName === target.cityName,
      ) ?? null
    );
  }

  return null;
}

export async function getCityNote(
  islandX: number,
  islandY: number,
  position: number,
): Promise<CityNote | null> {
  return findCityNote({ islandX, islandY, position });
}

export async function upsertCityNote(
  note: Omit<CityNote, 'key' | 'updatedAt'> & { note: string; position?: number },
) {
  const store = await loadCityNotes();
  const existing = await findCityNote({
    islandX: note.islandX,
    islandY: note.islandY,
    position: note.position,
    cityId: note.cityId,
    cityName: note.cityName,
  });

  const merged = {
    ...existing,
    ...note,
    position: note.position ?? existing?.position,
    cityId: note.cityId ?? existing?.cityId,
  };

  const key = cityNoteKeyFromTarget(merged);
  const unsecuredResources = parseUnsecuredFromNote(note.note);
  const entry: CityNote = {
    ...merged,
    key,
    unsecuredResources: hasUnsecuredResources(unsecuredResources) ? unsecuredResources : undefined,
    updatedAt: Date.now(),
  };

  if (existing && existing.key !== key) {
    delete store[existing.key];
  }

  store[key] = entry;
  await browser.storage.local.set({ [CITY_NOTES_STORAGE_KEY]: store });
  return entry;
}

export async function deleteCityNote(islandX: number, islandY: number, position: number) {
  const key = cityNoteKey(islandX, islandY, position);
  await deleteCityNoteByKey(key);
}

export async function deleteCityNoteByKey(key: string) {
  const store = await loadCityNotes();
  if (!store[key]) return;
  delete store[key];
  await browser.storage.local.set({ [CITY_NOTES_STORAGE_KEY]: store });
}
