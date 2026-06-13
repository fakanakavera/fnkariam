import {
  ISLAND_NOTES_STORAGE_KEY,
  islandNoteKey,
  type IslandNote,
  type IslandNotesStore,
} from '../types/islandNotes';

export async function loadIslandNotes(): Promise<IslandNotesStore> {
  const result = await browser.storage.local.get(ISLAND_NOTES_STORAGE_KEY);
  const stored = result[ISLAND_NOTES_STORAGE_KEY] as IslandNotesStore | undefined;
  return stored ?? {};
}

export async function getIslandNote(islandX: number, islandY: number): Promise<IslandNote | null> {
  const store = await loadIslandNotes();
  return store[islandNoteKey(islandX, islandY)] ?? null;
}

export async function upsertIslandNote(
  note: Omit<IslandNote, 'key' | 'updatedAt'> & { note: string },
) {
  const key = islandNoteKey(note.islandX, note.islandY);
  const store = await loadIslandNotes();
  const existing = store[key];

  const entry: IslandNote = {
    ...existing,
    ...note,
    key,
    updatedAt: Date.now(),
  };

  store[key] = entry;
  await browser.storage.local.set({ [ISLAND_NOTES_STORAGE_KEY]: store });
  return entry;
}

export async function deleteIslandNote(islandX: number, islandY: number) {
  const key = islandNoteKey(islandX, islandY);
  const store = await loadIslandNotes();
  if (!store[key]) return;
  delete store[key];
  await browser.storage.local.set({ [ISLAND_NOTES_STORAGE_KEY]: store });
}
