import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  deleteCityNote,
  loadCityNotes,
  upsertCityNote,
} from '../storage/cityNotesStorage';
import { CITY_NOTES_STORAGE_KEY, type CityNote } from '../types/cityNotes';

function formatDate(ms: number) {
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function IslandCityNotes() {
  const [notes, setNotes] = useState<CityNote[]>([]);
  const [search, setSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [form, setForm] = useState({
    islandX: '',
    islandY: '',
    position: '',
    playerName: '',
    cityName: '',
    note: '',
  });

  const reload = useCallback(async () => {
    const store = await loadCityNotes();
    const list = Object.values(store).sort((a, b) => b.updatedAt - a.updatedAt);
    setNotes(list);
  }, []);

  useEffect(() => {
    void reload();

    const onStorageChanged = (
      changes: Record<string, browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[CITY_NOTES_STORAGE_KEY]) return;
      void reload();
    };

    browser.storage.onChanged.addListener(onStorageChanged);
    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      [
        n.playerName,
        n.cityName,
        n.islandName,
        n.note,
        `${n.islandX}:${n.islandY}`,
        String(n.position),
      ].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [notes, search]);

  const startEdit = (note: CityNote) => {
    setEditingKey(note.key);
    setEditNote(note.note);
  };

  const saveEdit = async (note: CityNote) => {
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

  const handleAdd = async () => {
    const islandX = parseInt(form.islandX, 10);
    const islandY = parseInt(form.islandY, 10);
    const position = parseInt(form.position, 10);
    if (Number.isNaN(islandX) || Number.isNaN(islandY) || Number.isNaN(position)) return;

    await upsertCityNote({
      islandX,
      islandY,
      position,
      cityName: form.cityName.trim(),
      playerName: form.playerName.trim(),
      note: form.note,
    });

    setForm({ islandX: '', islandY: '', position: '', playerName: '', cityName: '', note: '' });
    await reload();
  };

  const handleDelete = async (note: CityNote) => {
    await deleteCityNote(note.islandX, note.islandY, note.position);
    if (editingKey === note.key) {
      setEditingKey(null);
      setEditNote('');
    }
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

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Notas de Ilha</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Notas por posição na ilha ([X:Y] + slot). O nome da cidade pode mudar — a posição é
            estável. Salve direto no mapa da ilha ao clicar numa cidade de outro jogador.
          </p>
        </div>
      </div>

      <section
        className="dashboard-section"
        style={{ padding: '16px', marginBottom: '20px', backgroundColor: '#fdfaf0' }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Adicionar manualmente</h3>
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
            value={form.islandX}
            onChange={(e) => setForm((f) => ({ ...f, islandX: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Ilha Y"
            value={form.islandY}
            onChange={(e) => setForm((f) => ({ ...f, islandY: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Posição (0–16)"
            value={form.position}
            onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Jogador"
            value={form.playerName}
            onChange={(e) => setForm((f) => ({ ...f, playerName: e.target.value }))}
          />
          <input
            style={inputStyle}
            placeholder="Cidade (opcional)"
            value={form.cityName}
            onChange={(e) => setForm((f) => ({ ...f, cityName: e.target.value }))}
          />
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: '64px', marginBottom: '8px' }}
          placeholder="Nota"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        />
        <button
          onClick={() => void handleAdd()}
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

      <div style={{ marginBottom: '12px' }}>
        <input
          style={inputStyle}
          placeholder="Buscar jogador, cidade, ilha, nota…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>
          Nenhuma nota salva. Abra uma ilha no jogo, clique numa cidade de outro jogador e use o
          painel na barra lateral.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((note) => (
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

              {editingKey === note.key ? (
                <>
                  <textarea
                    style={{ ...inputStyle, minHeight: '72px', marginBottom: '8px' }}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => void saveEdit(note)}
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
                    {note.note || <em style={{ color: 'var(--text-muted)' }}>Sem nota</em>}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startEdit(note)}
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
                      onClick={() => void handleDelete(note)}
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
