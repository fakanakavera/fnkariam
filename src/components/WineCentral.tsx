import { Fragment, useMemo, useState } from 'react';
import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import type { City } from '../types/game';
import { cityDistance } from '../utils/cityDistance';

type CalculationMode = 'equalize' | 'fillSafe';

interface WineRoute {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  boats: number;
}

interface Demander {
  city: City;
  currentWine: number;
  safe: number;
  spending: number;
  finalAllocated: number;
}

function computeEqualizeAllocations(demanders: Demander[], totalAvailable: number) {
  const active = demanders.filter((item) => item.spending > 0);
  if (active.length === 0 || totalAvailable <= 0) return;

  const computeNeed = (targetHours: number) =>
    active.reduce((sum, item) => sum + Math.max(0, item.spending * targetHours - item.currentWine), 0);

  let low = 0;
  let high = 1;
  while (computeNeed(high) < totalAvailable) {
    high *= 2;
  }

  for (let step = 0; step < 64; step += 1) {
    const mid = (low + high) / 2;
    if (computeNeed(mid) < totalAvailable) low = mid;
    else high = mid;
  }

  active.forEach((item) => {
    item.finalAllocated = Math.max(0, item.spending * low - item.currentWine);
  });
}

function computeFillSafeAllocations(demanders: Demander[], totalAvailable: number) {
  const needed = demanders.map((item) => Math.max(0, item.safe - item.currentWine));
  const totalNeeded = needed.reduce((sum, value) => sum + value, 0);
  if (totalNeeded <= 0 || totalAvailable <= 0) return;

  demanders.forEach((item, index) => {
    if (totalAvailable >= totalNeeded) {
      item.finalAllocated = needed[index];
    } else {
      item.finalAllocated = (needed[index] / totalNeeded) * totalAvailable;
    }
  });
}

function ResourceIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: '18px', height: '14px', verticalAlign: 'middle', marginRight: '4px' }}
    />
  );
}

function formatTimeLeft(stock: number, spending: number, production = 0) {
  const netConsumption = spending - production;
  if (netConsumption <= 0) return '∞';
  const hours = stock / netConsumption;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  return days > 0 ? `${days}d ${remainingHours}h` : `${remainingHours}h`;
}

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

export function WineCentral() {
  const { cities } = useGame();
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('equalize');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [destinationIds, setDestinationIds] = useState<string[]>([]);
  const [minTransport, setMinTransport] = useState(500);
  const [routes, setRoutes] = useState<WineRoute[] | null>(null);
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
    const groups: Record<string, WineRoute[]> = {};
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

    const suppliers: Array<{ city: (typeof cities)[number]; available: number }> = [];
    const demanders: Demander[] = [];

    cities.forEach((city) => {
      if (!city.details) return;

      const currentWine = city.details.currentResources[1] || 0;
      const spending = city.details.wineSpendings || 0;
      const safe = city.details.safeResources || 0;

      if (sourceIds.includes(city.id) && city.tradegood === 1) {
        const available = currentWine - spending * 2;
        if (available > 0) suppliers.push({ city, available });
      }

      if (destinationIds.includes(city.id)) {
        demanders.push({
          city,
          currentWine,
          safe,
          spending,
          finalAllocated: 0,
        });
      }
    });

    const totalAvailable = suppliers.reduce((sum, item) => sum + item.available, 0);

    if (totalAvailable > 0 && demanders.length > 0) {
      if (calculationMode === 'equalize') {
        computeEqualizeAllocations(demanders, totalAvailable);
      } else {
        computeFillSafeAllocations(demanders, totalAvailable);
      }
    }

    const result: WineRoute[] = [];
    const supplierPool = suppliers.map((item) => ({ ...item }));
    const demanderPool = demanders.filter((item) => item.finalAllocated > 0).map((item) => ({ ...item }));

    supplierPool.forEach((supplier) => {
      demanderPool.sort((a, b) => cityDistance(supplier.city, a.city) - cityDistance(supplier.city, b.city));

      for (const demander of demanderPool) {
        if (supplier.available <= 0 || demander.finalAllocated <= 0) continue;

        let amount = Math.min(supplier.available, demander.finalAllocated);
        if (amount > 500) {
          const remainder = amount % 500;
          if (remainder > 0 && amount - remainder >= 500) amount -= remainder;
        }

        if (amount >= minTransport) {
          result.push({
            fromId: supplier.city.id,
            fromName: supplier.city.name,
            toId: demander.city.id,
            toName: demander.city.name,
            amount: Math.floor(amount),
            boats: Math.ceil(amount / 500),
          });
          supplier.available -= amount;
          demander.finalAllocated -= amount;
        }
      }
    });

    setRoutes(result);
    setShowRoutes(true);
  };

  return (
    <div className="overview-container">
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Central do Vinho</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Gerenciamento logístico e distribuição inteligente de tabernas.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>Modo de cálculo</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setCalculationMode('equalize')}
              style={modeButtonStyle(calculationMode === 'equalize')}
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

      {(staleInfo.missing.length > 0 || staleInfo.stale.length > 0) && (
        <div
          style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeeba',
            color: '#856404',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            marginBottom: '20px',
            fontSize: '0.9rem',
          }}
        >
          <strong style={{ display: 'block', marginBottom: '4px' }}>Dados desatualizados detectados!</strong>
          {staleInfo.missing.length > 0 && (
            <div>
              Cidades nunca visitadas nesta sessão: <strong>{staleInfo.missing.join(', ')}</strong>.
            </div>
          )}
          {staleInfo.stale.length > 0 && (
            <div>
              Cidades sem atualização há mais de 1 hora: <strong>{staleInfo.stale.join(', ')}</strong>.
            </div>
          )}
        </div>
      )}

      <div className="table-responsive" style={{ marginBottom: '24px' }}>
        <table className="ikariam-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Estoque</th>
              <th>Tempo Restante</th>
              <th>Seguro</th>
              <th>Balanço de Vinho</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city, index) => {
              if (!city.details) return null;

              const stock = city.details.currentResources[1] || 0;
              const safe = city.details.safeResources || 0;
              const spending = city.details.wineSpendings || 0;
              const isProducer = city.tradegood === 1;
              const production = isProducer ? city.details.tradegoodProduction || 0 : 0;
              const balance = production - spending;
              const netConsumption = spending - production;

              return (
                <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                  <td style={{ fontWeight: 'bold' }}>
                    {city.name}{' '}
                    {isProducer && <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" />}
                  </td>
                  <td>{stock.toLocaleString('pt-BR')}</td>
                  <td
                    style={{
                      fontWeight: 500,
                      color: netConsumption > 0 && stock / netConsumption < 12 ? '#cc0000' : 'inherit',
                    }}
                  >
                    {formatTimeLeft(stock, spending, production)}
                  </td>
                  <td>{safe.toLocaleString('pt-BR')}</td>
                  <td style={{ fontWeight: 600, color: balance < 0 ? '#cc0000' : balance > 0 ? '#007700' : 'inherit' }}>
                    {balance > 0 ? `+${balance}/h` : balance < 0 ? `${balance}/h` : '0/h'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section
        className="dashboard-section"
        style={{
          backgroundColor: '#fdfaf0',
          padding: '20px',
          borderRadius: 'var(--radius)',
          border: '1px solid #e2d3b5',
        }}
      >
        <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', color: 'var(--bg-dark-wood)' }}>
          Configurar Rotas de Abastecimento
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '20px',
          }}
        >
          <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid #e8e1cf' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
              Cidades de Origem (Enviar Excedente)
            </h4>
            {cities.map((city) => {
              const isProducer = city.tradegood === 1;
              if (!city.details) return null;
              return (
                <div key={city.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', opacity: isProducer ? 1 : 0.5 }}>
                  <input
                    type="checkbox"
                    id={`sup-${city.id}`}
                    disabled={!isProducer}
                    checked={sourceIds.includes(city.id)}
                    onChange={() => toggleSource(city.id)}
                    style={{ marginRight: '8px', cursor: isProducer ? 'pointer' : 'not-allowed' }}
                  />
                  <label htmlFor={`sup-${city.id}`} style={{ cursor: isProducer ? 'pointer' : 'not-allowed', fontSize: '0.9rem' }}>
                    {city.name}
                  </label>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#fff', padding: '12px', borderRadius: 'var(--radius)', border: '1px solid #e8e1cf' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
              Cidades de Destino (Receber Vinho)
            </h4>
            {cities.map((city) => {
              if (!city.details) return null;
              const isSource = sourceIds.includes(city.id);
              return (
                <div key={city.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '6px', opacity: isSource ? 0.4 : 1 }}>
                  <input
                    type="checkbox"
                    id={`dem-${city.id}`}
                    disabled={isSource}
                    checked={destinationIds.includes(city.id)}
                    onChange={() => toggleDestination(city.id)}
                    style={{ marginRight: '8px', cursor: isSource ? 'not-allowed' : 'pointer' }}
                  />
                  <label htmlFor={`dem-${city.id}`} style={{ cursor: isSource ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}>
                    {city.name}{' '}
                    {isSource && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        (Origem selecionada)
                      </span>
                    )}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <label htmlFor="min-transport" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--bg-dark-wood)' }}>
            Ignorar transportes inferiores a:
          </label>
          <input
            type="number"
            id="min-transport"
            value={minTransport}
            onChange={(event) => setMinTransport(Math.max(0, parseInt(event.target.value, 10) || 0))}
            style={{
              width: '100px',
              padding: '6px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid #ccc',
              fontWeight: 'bold',
            }}
          />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>unidades de vinho.</span>
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
            fontSize: '0.95rem',
          }}
        >
          Calcular Rotas de Distribuição
        </button>
      </section>

      {showRoutes && (
        <section className="dashboard-section" style={{ marginTop: '24px' }}>
          <div className="dashboard-section-header">
            <h3>Rotas de Distribuição Recomendadas</h3>
          </div>
          {groupedRoutes.length === 0 ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                backgroundColor: '#fafafa',
                borderRadius: 'var(--radius)',
              }}
            >
              Nenhuma rota atende aos critérios ou filtros de envio mínimo estipulados.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="ikariam-table" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Origem (Produtora)</th>
                    <th>Destino (Demandante)</th>
                    <th>
                      Quantidade de <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" /> Vinho
                    </th>
                    <th>Barcos Cheios Necessários</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedRoutes.map(([fromName, group]) => (
                    <Fragment key={fromName}>
                      {group.map((route, index) => (
                        <tr
                          key={`${route.fromId}-${route.toId}`}
                          style={{
                            borderBottom: index === group.length - 1 ? '2px solid #d2c4a9' : '1px solid #eee',
                          }}
                        >
                          {index === 0 ? (
                            <td
                              rowSpan={group.length}
                              style={{
                                fontWeight: 'bold',
                                color: '#b35c00',
                                verticalAlign: 'middle',
                                backgroundColor: '#fffcf5',
                                borderRight: '1px solid #e8e1cf',
                              }}
                            >
                              {fromName}
                            </td>
                          ) : null}
                          <td style={{ fontWeight: 500 }}>{route.toName}</td>
                          <td style={{ fontWeight: 'bold', color: '#990033' }}>
                            {route.amount.toLocaleString('pt-BR')}
                          </td>
                          <td style={{ fontWeight: 'bold' }}>
                            {route.boats} {route.boats === 1 ? 'barco' : 'barcos'}
                          </td>
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
