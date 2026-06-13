import { useEffect, useMemo, useState } from 'react';
import { loadCityMemos, saveCityMemos, updateCityMemo } from '../storage/cityMemoStorage';
import { clearSpyReports, SPY_REPORT_MESSAGE } from '../storage/spyStorage';
import { SPY_REPORTS_STORAGE_KEY } from '../types/spyReport';
import type { CityMemo } from '../types/cityMemo';
import type { SpyReport } from '../types/spyReport';
import {
  formatNumber,
  isResourceMission,
  isTroopMission,
} from '../utils/spyReportParser';

type SortField = 'date' | 'owner' | 'city' | 'mission';
type SortOrder = 'asc' | 'desc';
type MissionFilter = 'all' | 'resources' | 'troops' | 'other';

function missionType(report: SpyReport): MissionFilter {
  if (isResourceMission(report.mission)) return 'resources';
  if (isTroopMission(report.mission)) return 'troops';
  return 'other';
}

function sortReports(reports: SpyReport[], field: SortField, order: SortOrder) {
  const factor = order === 'asc' ? 1 : -1;

  return [...reports].sort((a, b) => {
    switch (field) {
      case 'owner':
        return a.targetOwner.localeCompare(b.targetOwner, 'pt-BR') * factor;
      case 'city':
        return a.targetCityName.localeCompare(b.targetCityName, 'pt-BR') * factor;
      case 'mission':
        return a.mission.localeCompare(b.mission, 'pt-BR') * factor;
      case 'date':
      default:
        return (a.dateTimestamp - b.dateTimestamp) * factor;
    }
  });
}

function filterReports(
  reports: SpyReport[],
  search: string,
  missionFilter: MissionFilter,
  successOnly: boolean,
) {
  const query = search.trim().toLowerCase();

  return reports.filter((report) => {
    if (successOnly && !report.success) return false;
    if (missionFilter !== 'all' && missionType(report) !== missionFilter) return false;
    if (!query) return true;

    const haystack = [
      report.targetOwner,
      report.targetCityName,
      report.coords,
      report.mission,
      report.statusText,
      report.textReport || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

function ResourceSummary({ report }: { report: SpyReport }) {
  if (!report.resources) return null;

  const items = [
    { label: 'Madeira', value: report.resources.wood },
    { label: 'Vinho', value: report.resources.wine },
    { label: 'Mármore', value: report.resources.marble },
    { label: 'Cristal', value: report.resources.crystal },
    { label: 'Enxofre', value: report.resources.sulfur },
    { label: 'Ouro', value: report.resources.gold },
  ].filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <div className="loot-grid" style={{ marginTop: '12px' }}>
      {items.map((item) => (
        <div key={item.label} className="loot-item">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</div>
          <div>{formatNumber(item.value)}</div>
        </div>
      ))}
    </div>
  );
}

function TroopSummary({ report }: { report: SpyReport }) {
  if (!report.troops?.length) return null;

  return (
    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {report.troops.map((section, index) => (
        <div key={`${section.category}-${index}`}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>{section.category}</div>
          {section.units.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }}>Nenhuma unidade disponível.</div>
          ) : (
            <div className="table-responsive">
              <table className="ikariam-table">
                <thead>
                  <tr>
                    <th>Unidade</th>
                    <th>Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {section.units.map((unit) => (
                    <tr key={unit.name}>
                      <td>{unit.name}</td>
                      <td>{formatNumber(unit.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CityMemosPanel({
  memos,
  onSave,
}: {
  memos: CityMemo[];
  onSave: (cityId: string, memo: string) => Promise<void>;
}) {
  const [selectedMemoId, setSelectedMemoId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');

  const filteredMemos = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return memos;
    return memos.filter((memo) =>
      [memo.cityName, memo.coords, memo.owner, memo.memo].join(' ').toLowerCase().includes(query),
    );
  }, [memos, search]);

  const selected = filteredMemos.find((memo) => memo.cityId === selectedMemoId) || null;

  useEffect(() => {
    if (filteredMemos.length === 0) {
      setSelectedMemoId(null);
      setDraft('');
      return;
    }

    if (!selectedMemoId || !filteredMemos.some((memo) => memo.cityId === selectedMemoId)) {
      setSelectedMemoId(filteredMemos[0].cityId);
      setDraft(filteredMemos[0].memo);
    }
  }, [filteredMemos, selectedMemoId]);

  useEffect(() => {
    if (selected) setDraft(selected.memo);
  }, [selected?.cityId, selected?.memo]);

  return (
    <section className="dashboard-section" style={{ marginTop: '24px' }}>
      <div className="dashboard-section-header">
        <h3>Memos de Cidades</h3>
      </div>
      <div style={{ padding: '16px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.9rem' }}>
          Relatórios de recursos e tropas são adicionados automaticamente ao memo da cidade alvo.
        </p>

        {memos.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>Nenhum memo de cidade ainda.</div>
        ) : (
          <div className="combat-layout">
            <div className="combat-list">
              <div style={{ padding: '10px', borderBottom: '1px solid #e8e1cf' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Filtrar cidades..."
                  style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius)', border: '1px solid #d8caa8' }}
                />
              </div>
              {filteredMemos.map((memo) => (
                <button
                  key={memo.cityId}
                  className={`combat-list-item ${selectedMemoId === memo.cityId ? 'active' : ''}`}
                  onClick={() => setSelectedMemoId(memo.cityId)}
                >
                  <div style={{ fontWeight: 'bold' }}>{memo.cityName || 'Cidade desconhecida'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {memo.coords} · {memo.owner}
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <div className="combat-detail">
                <h3 style={{ marginBottom: '4px' }}>{selected.cityName}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {selected.coords} · {selected.owner}
                </p>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius)',
                    border: '1px solid #d8caa8',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    lineHeight: 1.5,
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={() => void onSave(selected.cityId, draft)}
                  style={{
                    marginTop: '12px',
                    backgroundColor: 'var(--color-gold)',
                    color: '#321',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                  }}
                >
                  Salvar memo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function SpyReports() {
  const [reports, setReports] = useState<SpyReport[]>([]);
  const [memos, setMemos] = useState<CityMemo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [missionFilter, setMissionFilter] = useState<MissionFilter>('all');
  const [successOnly, setSuccessOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const loadData = async () => {
      const [reportResult, memoList] = await Promise.all([
        browser.storage.local.get(SPY_REPORTS_STORAGE_KEY),
        loadCityMemos(),
      ]);

      const stored = (reportResult[SPY_REPORTS_STORAGE_KEY] as SpyReport[] | undefined) || [];
      setReports(stored);
      setMemos(memoList);
      if (stored.length > 0) setSelectedId(stored[0].id);
    };

    void loadData();

    const onMessage = (message: { type?: string; payload?: SpyReport[] }) => {
      if (message.type !== SPY_REPORT_MESSAGE || !message.payload) return;
      setReports(message.payload);
      if (message.payload.length > 0) setSelectedId(message.payload[0].id);
      void loadCityMemos().then(setMemos);
    };

    const onStorageChange = (
      changes: Record<string, browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (changes[SPY_REPORTS_STORAGE_KEY]) {
        const next = changes[SPY_REPORTS_STORAGE_KEY].newValue as SpyReport[] | undefined;
        setReports(next || []);
      }
      if (changes.cityMemos) {
        setMemos((changes.cityMemos.newValue as CityMemo[] | undefined) || []);
      }
    };

    browser.runtime.onMessage.addListener(onMessage);
    browser.storage.onChanged.addListener(onStorageChange);

    return () => {
      browser.runtime.onMessage.removeListener(onMessage);
      browser.storage.onChanged.removeListener(onStorageChange);
    };
  }, []);

  const visibleReports = useMemo(
    () => sortReports(filterReports(reports, search, missionFilter, successOnly), sortField, sortOrder),
    [reports, search, missionFilter, successOnly, sortField, sortOrder],
  );

  const selected = visibleReports.find((report) => report.id === selectedId) || null;

  const handleClear = async () => {
    await clearSpyReports();
    setReports([]);
    setSelectedId(null);
  };

  const handleSaveMemo = async (cityId: string, memo: string) => {
    await updateCityMemo(cityId, memo);
    const updated = await loadCityMemos();
    setMemos(updated);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortOrder(field === 'date' ? 'desc' : 'asc');
  };

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Relatórios de Espionagem</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Abra a aba de relatórios no Esconderijo do jogo para capturar todos os relatórios aqui.
          </p>
        </div>
        {reports.length > 0 && (
          <button
            onClick={() => void handleClear()}
            style={{
              backgroundColor: '#990033',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Limpar histórico
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Nenhum relatório capturado ainda.</p>
          <p>
            No Ikariam, vá em <strong>Esconderijo → Relatórios de espionagem</strong>. A lista completa
            será importada automaticamente.
          </p>
        </div>
      ) : (
        <>
          <div className="spy-controls">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filtrar por dono, cidade, coordenadas ou missão..."
              className="spy-control-input"
            />
            <select
              value={missionFilter}
              onChange={(event) => setMissionFilter(event.target.value as MissionFilter)}
              className="spy-control-input"
            >
              <option value="all">Todas as missões</option>
              <option value="resources">Recursos</option>
              <option value="troops">Tropas / Frotas</option>
              <option value="other">Outras</option>
            </select>
            <label className="spy-control-checkbox">
              <input
                type="checkbox"
                checked={successOnly}
                onChange={(event) => setSuccessOnly(event.target.checked)}
              />
              Apenas sucesso
            </label>
            <div className="spy-sort-buttons">
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ordenar:</span>
              {(['date', 'owner', 'city', 'mission'] as SortField[]).map((field) => (
                <button
                  key={field}
                  className={`spy-sort-button ${sortField === field ? 'active' : ''}`}
                  onClick={() => toggleSort(field)}
                >
                  {field === 'date' && 'Data'}
                  {field === 'owner' && 'Dono'}
                  {field === 'city' && 'Cidade'}
                  {field === 'mission' && 'Missão'}
                  {sortField === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              ))}
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {visibleReports.length} de {reports.length} relatórios
          </p>

          <div className="combat-layout">
            <div className="combat-list">
              {visibleReports.map((report) => (
                <button
                  key={report.id}
                  className={`combat-list-item ${selectedId === report.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(report.id)}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{report.mission}</div>
                  <div style={{ fontSize: '0.8rem' }}>
                    {report.targetCityName} {report.coords}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {report.targetOwner} · {report.date.trim()}
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '4px', color: report.success ? '#007700' : '#990033' }}>
                    {report.statusText}
                  </div>
                </button>
              ))}
            </div>

            {selected ? (
              <div className="combat-detail">
                <h3 style={{ marginBottom: '6px' }}>{selected.mission}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{selected.date.trim()}</p>

                <div className="combat-meta">
                  <div className="combat-meta-card">
                    <label>Dono</label>
                    <div style={{ fontWeight: 'bold' }}>{selected.targetOwner}</div>
                  </div>
                  <div className="combat-meta-card">
                    <label>Cidade</label>
                    <div style={{ fontWeight: 'bold' }}>
                      {selected.targetCityName} {selected.coords}
                    </div>
                  </div>
                  <div className="combat-meta-card">
                    <label>Agentes</label>
                    <div>
                      {selected.agentsLost}/{selected.agentsDeployed} perdidos
                    </div>
                  </div>
                  <div className="combat-meta-card">
                    <label>Chamarizes</label>
                    <div>
                      {selected.decoysLost}/{selected.decoysDeployed} perdidos
                    </div>
                  </div>
                </div>

                {selected.resources && (
                  <section className="dashboard-section" style={{ marginBottom: '16px' }}>
                    <div className="dashboard-section-header">
                      <h3>Recursos</h3>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <ResourceSummary report={selected} />
                    </div>
                  </section>
                )}

                {selected.troops && (
                  <section className="dashboard-section" style={{ marginBottom: '16px' }}>
                    <div className="dashboard-section-header">
                      <h3>Tropas e Frotas</h3>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <TroopSummary report={selected} />
                    </div>
                  </section>
                )}

                {selected.textReport && (
                  <section className="dashboard-section">
                    <div className="dashboard-section-header">
                      <h3>Relatório</h3>
                    </div>
                    <div style={{ padding: '16px' }}>{selected.textReport}</div>
                  </section>
                )}

                {selected.addedToMemo && (
                  <p style={{ marginTop: '12px', color: '#007700', fontSize: '0.85rem' }}>
                    Informação de recursos/tropas adicionada ao memo da cidade.
                  </p>
                )}
              </div>
            ) : (
              <div className="combat-detail empty-state">
                Nenhum relatório corresponde aos filtros atuais.
              </div>
            )}
          </div>
        </>
      )}

      <CityMemosPanel memos={memos} onSave={handleSaveMemo} />
    </div>
  );
}
