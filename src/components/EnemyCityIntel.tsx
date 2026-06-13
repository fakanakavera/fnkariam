import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { rebuildEnemyIntelFromSpyReports } from '../storage/cityMemoStorage';
import {
  deleteEnemyCityIntel,
  ENEMY_CITY_INTEL_STORAGE_KEY,
  listEnemyCityIntel,
  purgeOwnCityIntel,
} from '../storage/enemyCityIntelStorage';
import { loadSpyReports } from '../storage/spyStorage';
import type { EnemyCityIntel } from '../storage/enemyCityIntelStorage';
import type { SpyResources } from '../types/spyReport';
import type { ResourceKey } from '../types/buildings';
import { summarizeEnemyIntel } from '../utils/enemyIntelSync';
import {
  getResourceStock,
  shipsNeededForLoot,
  totalUnsecuredResources,
  type UnsecuredResources,
} from '../utils/enemyUnsecuredResources';
import { RESOURCE_KEYS, RESOURCE_LABELS } from '../utils/resourceUtils';
import { ResourceIcon } from './shared/ResourceIcon';

const RESOURCE_GRID_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, max-content)',
  gap: '4px 16px',
  fontSize: '0.8rem',
};

function formatDate(ms?: number, fallback?: string) {
  if (fallback) return fallback;
  if (!ms) return '—';
  return new Date(ms).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAmount(value: number) {
  return value.toLocaleString('pt-BR');
}

function statusLabel(intel: EnemyCityIntel) {
  const summary = summarizeEnemyIntel(intel);
  if (summary.isComplete && summary.hasLoot) return 'Com saque';
  if (summary.isComplete) return 'Completo';
  if (summary.hasResources) return 'Faltam edifícios';
  if (summary.hasBuildings) return 'Faltam recursos';
  return 'Incompleto';
}

function ResourceAmountGrid({
  amounts,
  highlight = false,
  showZero = true,
}: {
  amounts: Partial<Record<ResourceKey, number>>;
  highlight?: boolean;
  showZero?: boolean;
}) {
  return (
    <div style={RESOURCE_GRID_STYLE}>
      {RESOURCE_KEYS.map((key) => {
        const value = amounts[key] || 0;
        if (!showZero && value <= 0) return null;

        return (
          <span
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              opacity: value > 0 ? 1 : 0.4,
              color: highlight && value > 0 ? '#8b0000' : undefined,
              fontWeight: highlight && value > 0 ? 'bold' : undefined,
            }}
          >
            <ResourceIcon src={RESOURCE_ICONS[key]} alt={RESOURCE_LABELS[key]} />
            {formatAmount(value)}
          </span>
        );
      })}
    </div>
  );
}

function ResourceStockCell({ resources }: { resources: SpyResources }) {
  return (
    <div>
      <ResourceAmountGrid amounts={getResourceStock(resources)} />
    </div>
  );
}

function UnsecuredCell({ unsecured, isComplete }: { unsecured: UnsecuredResources; isComplete: boolean }) {
  const hasLoot = RESOURCE_KEYS.some((key) => (unsecured[key] || 0) > 0);
  if (!isComplete) return <>—</>;
  if (!hasLoot) return <span style={{ color: 'var(--text-muted)' }}>Nenhum</span>;

  return <ResourceAmountGrid amounts={unsecured} highlight showZero={false} />;
}

export function EnemyCityIntelPanel() {
  const [entries, setEntries] = useState<EnemyCityIntel[]>([]);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('');

  const reload = useCallback(async () => {
    await purgeOwnCityIntel();
    setEntries(await listEnemyCityIntel());
  }, []);

  useEffect(() => {
    void (async () => {
      const reports = await loadSpyReports();
      if (reports.length > 0) {
        await rebuildEnemyIntelFromSpyReports(reports);
      }
      await reload();
    })();

    const onStorageChanged = (
      changes: Record<string, browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local') return;
      if (changes[ENEMY_CITY_INTEL_STORAGE_KEY]) void reload();
    };

    browser.storage.onChanged.addListener(onStorageChanged);
    return () => browser.storage.onChanged.removeListener(onStorageChanged);
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;

    return entries.filter((entry) =>
      [
        entry.cityName,
        entry.playerName,
        `${entry.islandX}:${entry.islandY}`,
        String(entry.cityId || ''),
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [entries, search]);

  const handleResync = async () => {
    setSyncing(true);
    setStatus('');
    try {
      const reports = await loadSpyReports();
      await rebuildEnemyIntelFromSpyReports(reports);
      await reload();
      setStatus(`Atualizado a partir de ${reports.length} relatórios.`);
    } catch {
      setStatus('Erro ao ressincronizar relatórios.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Intel de Cidades Inimigas</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Recursos e edifícios capturados por relatórios de espionagem ou ao visitar uma cidade
            inimiga com espião. Navios = total inseguro ÷ 500.
          </p>
        </div>
        <button
          onClick={() => void handleResync()}
          disabled={syncing}
          style={{
            backgroundColor: 'var(--bg-dark-wood)',
            color: '#fff',
            border: 'none',
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            cursor: syncing ? 'wait' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {syncing ? 'Sincronizando…' : 'Ressincronizar relatórios'}
        </button>
      </div>

      {status && <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>{status}</p>}

      <div style={{ marginBottom: '12px' }}>
        <input
          style={{
            width: '100%',
            maxWidth: '360px',
            padding: '8px 10px',
            border: '1px solid #d4c9b0',
            borderRadius: 'var(--radius)',
          }}
          placeholder="Buscar cidade, jogador ou coordenadas…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>
          Nenhuma cidade inimiga registrada ainda. Envie um relatório de recursos, visite a cidade com
          espião, ou use o botão acima para importar relatórios antigos.
        </p>
      ) : (
        <div className="table-responsive">
          <table className="ikariam-table">
            <thead>
              <tr>
                <th>Cidade</th>
                <th>Jogador</th>
                <th>Ilha</th>
                <th>Estoque</th>
                <th>Edifícios</th>
                <th>Seguro</th>
                <th>Inseguro</th>
                <th>Navios</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, index) => {
                const summary = summarizeEnemyIntel(entry);
                const warehouseLevels = (entry.buildings || [])
                  .filter((building) => building.isWarehouse || building.buildingId === 7)
                  .map((building) => building.level);
                const ships = shipsNeededForLoot(summary.unsecured);

                return (
                  <tr key={entry.key} className={index % 2 === 0 ? '' : 'row-zebra'}>
                    <td style={{ fontWeight: 'bold' }}>
                      {entry.cityName}
                      {entry.cityId ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ID {entry.cityId}
                        </div>
                      ) : null}
                    </td>
                    <td>{entry.playerName || '—'}</td>
                    <td>
                      [{entry.islandX}:{entry.islandY}]
                    </td>
                    <td>
                      {summary.hasResources && entry.resources ? (
                        <>
                          <ResourceStockCell resources={entry.resources} />
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {formatDate(entry.resourcesTimestamp, entry.resourcesDate)}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {summary.hasBuildings ? (
                        <>
                          <div>{warehouseLevels.length} armazém(ns): {warehouseLevels.join(', ')}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {formatDate(entry.buildingsTimestamp, entry.buildingsDate)}
                          </div>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{summary.safeCapacity != null ? formatAmount(summary.safeCapacity) : '—'}</td>
                    <td>
                      <UnsecuredCell unsecured={summary.unsecured} isComplete={summary.isComplete} />
                    </td>
                    <td style={{ fontWeight: ships > 0 ? 'bold' : 'normal', color: ships > 0 ? '#8b0000' : undefined }}>
                      {summary.isComplete && summary.hasLoot ? (
                        <span title={`Total inseguro: ${formatAmount(totalUnsecuredResources(summary.unsecured))} ÷ 500`}>
                          {ships}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>{statusLabel(entry)}</td>
                    <td>
                      <button
                        onClick={() => void deleteEnemyCityIntel(entry.key).then(reload)}
                        style={{
                          background: 'none',
                          border: '1px solid #c9a0a0',
                          color: '#990033',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius)',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
