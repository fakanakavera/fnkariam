import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  deleteCityNote,
  loadCityNotes,
  upsertCityNote,
} from '../storage/cityNotesStorage';
import {
  deleteIslandNote,
  loadIslandNotes,
  upsertIslandNote,
} from '../storage/islandNotesStorage';
import { CITY_NOTES_STORAGE_KEY, type CityNote } from '../types/cityNotes';
import { ISLAND_NOTES_STORAGE_KEY, type IslandNote } from '../types/islandNotes';

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type NoteSection = 'island' | 'city';

export function IslandCityNotes() {
  const [islandNotes, setIslandNotes] = useState<IslandNote[]>([]);
  const [cityNotes, setCityNotes] = useState<CityNote[]>([]);
  const [section, setSection] = useState<NoteSection>('island');
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [islandForm, setIslandForm] = useState({ islandX: '', islandY: '', islandName: '', note: '' });
  const [cityForm, setCityForm] = useState({
    islandX: '',
    islandY: '',
    position: '',
    playerName: '',
    cityName: '',
    note: '',
  });

  const reload = useCallback(async () => {
    const [islands, cities] = await Promise.all([loadIslandNotes(), loadCityNotes()]);
    setIslandNotes(Object.values(islands).sort((a, b) => b.updatedAt - a.updatedAt));
    setCityNotes(Object.values(cities).sort((a, b) => b.updatedAt - a.updatedAt));
  }, []);

  useEffect(() => {
    void reload();

    const onStorageChanged = (
      changes: Record<string, browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (changes[CITY_NOTES_STORAGE_KEY] || changes[ISLAND_NOTES_STORAGE_KEY]) void reload();
    };

    browser.storage.onChanged.addListener(onStorageChanged);
    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, [reload]);

  const filteredIslands = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return islandNotes;
    return islandNotes.filter((n) =>
      [n.islandName, n.note, `${n.islandX}:${n.islandY}`].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [islandNotes, search]);

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cityNotes;
    return cityNotes.filter((n) =>
      [
        n.playerName,
        n.cityName,
        n.islandName,
        n.note,
        `${n.islandX}:${n.islandY}`,
        String(n.position),
      ].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [cityNotes, search]);

  const startEdit = (key: string, note: string) => {
    setEditingKey(key);
    setEditNote(note);
  };

  const saveIslandEdit = async (note: IslandNote) => {
    await upsertIslandNote({
      islandX: note.islandX,
      islandY: note.islandY,
      islandName: note.islandName,
      note: editNote,
    });
    setEditingKey(null);
    setEditNote('');
    await reload();
  };

  const saveCityEdit = async (note: CityNote) => {
    await upsertCityNote({
      islandX: note.islandX,
      islandY: note.islandY,
      position: note.position,
      islandName: note.islandName,
      cityId: note.cityId,
      cityName: note.cityName,
      playerId: note.playerId,
      playerName: note.playerName,
      note: editNote,
    });
    setEditingKey(null);
    setEditNote('');
    await reload();
  };

  const handleAddIsland = async () => {
    const islandX = parseInt(islandForm.islandX, 10);
    const islandY = parseInt(islandForm.islandY, 10);
    if (Number.isNaN(islandX) || Number.isNaN(islandY)) return;

    await upsertIslandNote({
      islandX,
      islandY,
      islandName: islandForm.islandName.trim() || undefined,
      note: islandForm.note,
    });

    setIslandForm({ islandX: '', islandY: '', islandName: '', note: '' });
    await reload();
  };

  const handleAddCity = async () => {
    const islandX = parseInt(cityForm.islandX, 10);
    const islandY = parseInt(cityForm.islandY, 10);
    const position = parseInt(cityForm.position, 10);
    if (Number.isNaN(islandX) || Number.isNaN(islandY) || Number.isNaN(position)) return;

    await upsertCityNote({
      islandX,
      islandY,
      position,
      cityName: cityForm.cityName.trim(),
      playerName: cityForm.playerName.trim(),
      note: cityForm.note,
    });

    setCityForm({ islandX: '', islandY: '', position: '', playerName: '', cityName: '', note: '' });
    await reload();
  };

  const inputStyle: CSSProperties = {
    padding: '6px 8px',
    border: '1px solid #d4c9b0',
    borderRadius: 'var(--radius)',
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  };

  const tabStyle = (active: boolean): CSSProperties => ({
    padding: '8px 16px',
    border: active ? 'var(--border-wood)' : '1px solid transparent',
    borderRadius: 'var(--radius)',
    backgroundColor: active ? 'var(--bg-main)' : 'transparent',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  });

  const renderNoteActions = (
    key: string,
    onSave: () => void,
    onDelete: () => void,
    noteText: string,
  ) =>
    editingKey === key ? (
      <>
        <textarea
          style={{ ...inputStyle, minHeight: '72px', marginBottom: '8px' }}
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => void onSave()}
            style={{
              backgroundColor: 'var(--bg-dark-wood)',
              color: '#fff',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Salvar
          </button>
          <button
            onClick={() => {
              setEditingKey(null);
              setEditNote('');
            }}
            style={{
              background: 'none',
              border: '1px solid #d4c9b0',
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
        </div>
      </>
    ) : (
      <>
        <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>
          {noteText || <em style={{ color: 'var(--text-muted)' }}>Sem nota</em>}
        </p>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => startEdit(key, noteText)}
            style={{
              background: 'none',
              border: '1px solid #d4c9b0',
              padding: '4px 10px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Editar
          </button>
          <button
            onClick={() => void onDelete()}
            style={{
              background: 'none',
              border: '1px solid #c9a0a0',
              color: '#990033',
              padding: '4px 10px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Remover
          </button>
        </div>
      </>
    );

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Notas de Ilha e Cidade</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Notas de ilha por coordenadas [X:Y]. Notas de cidade por posição no mapa (slot 0–16).
            No jogo: clique na ilha (recurso, comércio, monumento) ou numa cidade para ver o painel
            correspondente na barra lateral.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button style={tabStyle(section === 'island')} onClick={() => setSection('island')}>
          Ilhas ({islandNotes.length})
        </button>
        <button style={tabStyle(section === 'city')} onClick={() => setSection('city')}>
          Cidades ({cityNotes.length})
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <input
          style={inputStyle}
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {section === 'island' && (
        <>
          <section
            className="dashboard-section"
            style={{ padding: '16px', marginBottom: '20px', backgroundColor: '#fdfaf0' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Adicionar nota de ilha</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <input
                style={inputStyle}
                placeholder="Ilha X"
                value={islandForm.islandX}
                onChange={(e) => setIslandForm((f) => ({ ...f, islandX: e.target.value }))}
              />
              <input
                style={inputStyle}
                placeholder="Ilha Y"
                value={islandForm.islandY}
                onChange={(e) => setIslandForm((f) => ({ ...f, islandY: e.target.value }))}
              />
              <input
                style={inputStyle}
                placeholder="Nome da ilha (opcional)"
                value={islandForm.islandName}
                onChange={(e) => setIslandForm((f) => ({ ...f, islandName: e.target.value }))}
              />
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: '64px', marginBottom: '8px' }}
              placeholder="Nota sobre a ilha"
              value={islandForm.note}
              onChange={(e) => setIslandForm((f) => ({ ...f, note: e.target.value }))}
            />
            <button
              onClick={() => void handleAddIsland()}
              style={{
                backgroundColor: 'var(--bg-dark-wood)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Adicionar
            </button>
          </section>

          {filteredIslands.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>
              Nenhuma nota de ilha. Clique num recurso, comércio ou monumento no mapa da ilha.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredIslands.map((note) => (
                <div
                  key={note.key}
                  style={{
                    border: 'var(--border-wood)',
                    borderRadius: 'var(--radius)',
                    padding: '12px 16px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <strong>[{note.islandX}:{note.islandY}]</strong>
                      {note.islandName ? ` — ${note.islandName}` : ''}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                  {renderNoteActions(
                    note.key,
                    () => saveIslandEdit(note),
                    async () => {
                      await deleteIslandNote(note.islandX, note.islandY);
                      if (editingKey === note.key) {
                        setEditingKey(null);
                        setEditNote('');
                      }
                      await reload();
                    },
                    note.note,
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {section === 'city' && (
        <>
          <section
            className="dashboard-section"
            style={{ padding: '16px', marginBottom: '20px', backgroundColor: '#fdfaf0' }}
          >
            <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Adicionar nota de cidade</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <input
                style={inputStyle}
                placeholder="Ilha X"
                value={cityForm.islandX}
                onChange={(e) => setCityForm((f) => ({ ...f, islandX: e.target.value }))}
              />
              <input
                style={inputStyle}
                placeholder="Ilha Y"
                value={cityForm.islandY}
                onChange={(e) => setCityForm((f) => ({ ...f, islandY: e.target.value }))}
              />
              <input
                style={inputStyle}
                placeholder="Posição (0–16)"
                value={cityForm.position}
                onChange={(e) => setCityForm((f) => ({ ...f, position: e.target.value }))}
              />
              <input
                style={inputStyle}
                placeholder="Jogador"
                value={cityForm.playerName}
                onChange={(e) => setCityForm((f) => ({ ...f, playerName: e.target.value }))}
              />
              <input
                style={inputStyle}
                placeholder="Cidade (opcional)"
                value={cityForm.cityName}
                onChange={(e) => setCityForm((f) => ({ ...f, cityName: e.target.value }))}
              />
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: '64px', marginBottom: '8px' }}
              placeholder="Nota sobre a cidade"
              value={cityForm.note}
              onChange={(e) => setCityForm((f) => ({ ...f, note: e.target.value }))}
            />
            <button
              onClick={() => void handleAddCity()}
              style={{
                backgroundColor: 'var(--bg-dark-wood)',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Adicionar
            </button>
          </section>

          {filteredCities.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>
              Nenhuma nota de cidade. Clique numa cidade no mapa da ilha para abrir o painel na barra
              lateral.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredCities.map((note) => (
                <div
                  key={note.key}
                  style={{
                    border: 'var(--border-wood)',
                    borderRadius: 'var(--radius)',
                    padding: '12px 16px',
                    backgroundColor: '#fff',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <strong>
                        [{note.islandX}:{note.islandY}] pos {note.position}
                      </strong>
                      {note.islandName ? ` — ${note.islandName}` : ''}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {formatDate(note.updatedAt)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Jogador:</span> {note.playerName || '—'}{' '}
                    · <span style={{ color: 'var(--text-muted)' }}>Cidade:</span> {note.cityName || '—'}
                  </div>
                  {renderNoteActions(
                    note.key,
                    () => saveCityEdit(note),
                    async () => {
                      await deleteCityNote(note.islandX, note.islandY, note.position);
                      if (editingKey === note.key) {
                        setEditingKey(null);
                        setEditNote('');
                      }
                      await reload();
                    },
                    note.note,
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
