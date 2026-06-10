import { Fragment, useMemo, useState } from 'react';
import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import type { ResourceKey } from '../types/buildings';
import { calculateLogisticsRoutes, type CalculationMode } from '../utils/logisticsPlanner';
import {
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  cityProducesResource,
  formatWineTimeLeft,
  getResourceProduction,
  getResourceStock,
  getResourceSurplus,
  getSupplierAvailable,
} from '../utils/resourceUtils';
import { ResourceIcon } from './shared/ResourceIcon';

function modeButtonStyle(active: boolean) {
  return {
    backgroundColor: active ? 'var(--bg-dark-wood)' : '#fff',
    color: active ? '#fff' : 'var(--bg-dark-wood)',
    border: '1px solid var(--bg-dark-wood)',
    padding: '8px 14px',
    borderRadius: 'var(--radius)',
    fontWeight: 'bold' as const,
    cursor: 'pointer' as const,
    fontSize: '0.85rem',
  };
}

export function Logistics() {
  const { cities } = useGame();
  const [resource, setResource] = useState<ResourceKey>('wine');
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('equalize');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [destinationIds, setDestinationIds] = useState<string[]>([]);
  const [minTransport, setMinTransport] = useState(500);
  const [routes, setRoutes] = useState<ReturnType<typeof calculateLogisticsRoutes> | null>(null);
  const [showRoutes, setShowRoutes] = useState(false);

  const staleInfo = useMemo(() => {
    const now = Date.now();
    const missing: string[] = [];
    const stale: string[] = [];
    cities.forEach((city) => {
      if (!city.details) missing.push(city.name);
      else if (!city.lastUpdate || now - city.lastUpdate > 3600000) stale.push(city.name);
    });
    return { missing, stale };
  }, [cities]);

  const groupedRoutes = useMemo(() => {
    if (!routes) return [];
    const groups: Record<string, typeof routes> = {};
    routes.forEach((route) => {
      if (!groups[route.fromName]) groups[route.fromName] = [];
      groups[route.fromName].push(route);
    });
    return Object.entries(groups);
  }, [routes]);

  const toggleSource = (cityId: string) => {
    setSourceIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev.filter((id) => id !== cityId), cityId],
    );
    setDestinationIds((prev) => prev.filter((id) => id !== cityId));
  };

  const toggleDestination = (cityId: string) => {
    setDestinationIds((prev) =>
      prev.includes(cityId) ? prev.filter((id) => id !== cityId) : [...prev, cityId],
    );
  };

  const calculateRoutes = () => {
    if (sourceIds.length === 0) {
      alert('Selecione pelo menos uma cidade de origem.');
      return;
    }
    if (destinationIds.length === 0) {
      alert('Selecione pelo menos uma cidade de destino.');
      return;
    }
    setRoutes(
      calculateLogisticsRoutes(cities, resource, sourceIds, destinationIds, minTransport, calculationMode),
    );
    setShowRoutes(true);
  };

  return (
    <div className="overview-container">
      <div
        className="overview-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Logística</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Planejamento de rotas de recursos entre cidades (inclui vinho, madeira e bens de luxo).
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
          <select
            value={resource}
            onChange={(e) => {
              const next = e.target.value as ResourceKey;
              setResource(next);
              if (next !== 'wine') setCalculationMode('fillSafe');
              setSourceIds([]);
              setDestinationIds([]);
              setShowRoutes(false);
            }}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius)', fontWeight: 'bold' }}
          >
            {RESOURCE_KEYS.map((key) => (
              <option key={key} value={key}>
                {RESOURCE_LABELS[key]}
              </option>
            ))}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Modo de cálculo</span>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setCalculationMode('equalize')}
                style={modeButtonStyle(calculationMode === 'equalize')}
                disabled={resource !== 'wine'}
                title={resource !== 'wine' ? 'Disponível apenas para vinho' : undefined}
              >
                Equalizar tempo restante
              </button>
              <button
                type="button"
                onClick={() => setCalculationMode('fillSafe')}
                style={modeButtonStyle(calculationMode === 'fillSafe')}
              >
                Completar reserva segura
              </button>
            </div>
          </div>
        </div>
      </div>

      {(staleInfo.missing.length > 0 || staleInfo.stale.length > 0) && (
        <div
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            fontSize: '0.9rem',
          }}
        >
          <strong>Dados desatualizados!</strong>{' '}
          {staleInfo.missing.length > 0 && `Nunca visitadas: ${staleInfo.missing.join(', ')}. `}
          {staleInfo.stale.length > 0 && `Antigas (>1h): ${staleInfo.stale.join(', ')}.`}
        </div>
      )}

      <div className="table-responsive">
        <table className="ikariam-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Estoque</th>
              {resource === 'wine' && <th>Tempo Restante</th>}
              <th>Seguro</th>
              <th>Produção/h</th>
              <th>Excedente</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city, index) => {
              if (!city.details) return null;
              const stock = getResourceStock(city, resource);
              const safe = city.details.safeResources || 0;
              const production = getResourceProduction(city, resource);
              const surplus = getResourceSurplus(city, resource);
              const isProducer = cityProducesResource(city, resource);

              return (
                <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                  <td style={{ fontWeight: 'bold' }}>
                    {city.name}{' '}
                    {isProducer && <ResourceIcon src={RESOURCE_ICONS[resource]} alt={RESOURCE_LABELS[resource]} />}
                  </td>
                  <td>{stock.toLocaleString('pt-BR')}</td>
                  {resource === 'wine' && (
                    <td>{formatWineTimeLeft(stock, city.details.wineSpendings || 0) || '∞'}</td>
                  )}
                  <td>{safe.toLocaleString('pt-BR')}</td>
                  <td style={{ color: production > 0 ? '#007700' : 'inherit' }}>+{production}</td>
                  <td style={{ fontWeight: 600, color: surplus > 0 ? '#007700' : '#cc0000' }}>
                    {surplus > 0 ? `+${Math.floor(surplus)}` : surplus}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section
        className="dashboard-section"
        style={{ backgroundColor: '#fdfaf0', padding: '20px', border: '1px solid #e2d3b5' }}
      >
        <h3 style={{ fontSize: '1.1rem', marginBottom: '14px' }}>Configurar Rotas</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid #e8e1cf' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Origem (excedente)</h4>
            {cities.map((city) => {
              if (!city.details) return null;
              const available = getSupplierAvailable(city, resource);
              return (
                <div key={city.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                  <input
                    type="checkbox"
                    checked={sourceIds.includes(city.id)}
                    onChange={() => toggleSource(city.id)}
                    style={{ marginRight: '8px' }}
                  />
                  <label style={{ fontSize: '0.9rem' }}>
                    {city.name}
                    {available > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        (+{Math.floor(available).toLocaleString('pt-BR')})
                      </span>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
          <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid #e8e1cf' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '10px' }}>Destino</h4>
            {cities.map((city) => {
              if (!city.details) return null;
              const isSource = sourceIds.includes(city.id);
              return (
                <div
                  key={city.id}
                  style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', opacity: isSource ? 0.4 : 1 }}
                >
                  <input
                    type="checkbox"
                    disabled={isSource}
                    checked={destinationIds.includes(city.id)}
                    onChange={() => toggleDestination(city.id)}
                    style={{ marginRight: '8px' }}
                  />
                  <label style={{ fontSize: '0.9rem' }}>{city.name}</label>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Mínimo por transporte:</label>
          <input
            type="number"
            value={minTransport}
            onChange={(e) => setMinTransport(Math.max(0, parseInt(e.target.value, 10) || 0))}
            style={{ width: '100px', padding: '6px' }}
          />
        </div>

        <button
          onClick={calculateRoutes}
          style={{
            backgroundColor: 'var(--bg-dark-wood)',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 'var(--radius)',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Calcular Rotas
        </button>
      </section>

      {showRoutes && (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>Rotas Recomendadas — {RESOURCE_LABELS[resource]}</h3>
          </div>
          {groupedRoutes.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma rota atende aos critérios.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ikariam-table">
                <thead>
                  <tr>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Quantidade</th>
                    <th>Barcos</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRoutes.map(([fromName, group]) => (
                    <Fragment key={fromName}>
                      {group.map((route, index) => (
                        <tr key={`${route.fromId}-${route.toId}`}>
                          {index === 0 ? (
                            <td rowSpan={group.length} style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>
                              {fromName}
                            </td>
                          ) : null}
                          <td>{route.toName}</td>
                          <td style={{ fontWeight: 'bold' }}>{route.amount.toLocaleString('pt-BR')}</td>
                          <td>{route.boats}</td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
