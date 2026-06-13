import { useEffect, useMemo, useState } from 'react';
import { clearSpyReports, SPY_REPORT_MESSAGE } from '../storage/spyStorage';
import { SPY_REPORTS_STORAGE_KEY } from '../types/spyReport';
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

export function SpyReports() {
  const [reports, setReports] = useState<SpyReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [missionFilter, setMissionFilter] = useState<MissionFilter>('all');
  const [successOnly, setSuccessOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const loadData = async () => {
      const reportResult = await browser.storage.local.get(SPY_REPORTS_STORAGE_KEY);
      const stored = (reportResult[SPY_REPORTS_STORAGE_KEY] as SpyReport[] | undefined) || [];
      setReports(stored);
      if (stored.length > 0) setSelectedId(stored[0].id);
    };

    void loadData();

    const onMessage = (message: { type?: string; payload?: SpyReport[] }) => {
      if (message.type !== SPY_REPORT_MESSAGE || !message.payload) return;
      setReports(message.payload);
      if (message.payload.length > 0) setSelectedId(message.payload[0].id);
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
            Relatórios de recursos e tropas são adicionados automaticamente em <strong>Notas Ilha</strong>.
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
                    Informação de recursos/tropas adicionada às notas da cidade em Notas Ilha.
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
    </div>
  );
}
