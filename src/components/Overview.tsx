import { useState } from 'react';
import { RESOURCE_ICONS, TRADEGOOD_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';

function ResourceIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: '18px', height: '14px', verticalAlign: 'middle', marginRight: '4px' }}
    />
  );
}

function getCityStatus(lastUpdate: number | null) {
  const hint = '\nPara atualizar os dados dessa cidade visite-a no jogo e abra um conselheiro ou edifício.';
  if (!lastUpdate) return { emoji: '⛔', tooltip: `Cidade não atualizada nesta sessão.${hint}` };

  const elapsed = Date.now() - lastUpdate;
  const minutes = Math.floor(elapsed / 60000);
  if (elapsed > 4 * 60 * 60 * 1000) {
    return { emoji: '⚠️', tooltip: `Última atualização: ${(elapsed / 3600000).toFixed(1)}h atrás.${hint}` };
  }
  return { emoji: '✅', tooltip: `Última atualização: ${minutes}m atrás.${hint}` };
}

function getWineTimeLeft(stock: number, spending: number, production = 0) {
  const netConsumption = spending - production;
  if (netConsumption <= 0) return spending > 0 ? '∞' : null;
  const hours = stock / netConsumption;
  return hours <= 48 ? `${Math.floor(hours)}h restando` : `${Math.floor(hours / 24)}d restando`;
}

export function Overview() {
  const { account, cities } = useGame();
  const [timeframe, setTimeframe] = useState<'hour' | 'day' | 'week'>('hour');
  const multiplier = timeframe === 'day' ? 24 : timeframe === 'week' ? 168 : 1;
  const suffix = timeframe === 'hour' ? '/h' : timeframe === 'day' ? '/dia' : '/sem';

  const netGold = (account?.income || 0) + (account?.upkeep || 0) + (account?.scientistsUpkeep || 0);
  const woodProd = cities.reduce((sum, city) => sum + (city.details?.resourceProduction || 0), 0);
  const wineProd = cities.reduce((sum, city) => (city.tradegood === 1 ? sum + (city.details?.tradegoodProduction || 0) : sum), 0);
  const marbleProd = cities.reduce((sum, city) => (city.tradegood === 2 ? sum + (city.details?.tradegoodProduction || 0) : sum), 0);
  const crystalProd = cities.reduce((sum, city) => (city.tradegood === 3 ? sum + (city.details?.tradegoodProduction || 0) : sum), 0);
  const sulfurProd = cities.reduce((sum, city) => (city.tradegood === 4 ? sum + (city.details?.tradegoodProduction || 0) : sum), 0);

  const totalStock = {
    gold: account?.gold || 0,
    wood: cities.reduce((sum, city) => sum + (city.details?.currentResources[0] || 0), 0),
    wine: cities.reduce((sum, city) => sum + (city.details?.currentResources[1] || 0), 0),
    marble: cities.reduce((sum, city) => sum + (city.details?.currentResources[2] || 0), 0),
    crystal: cities.reduce((sum, city) => sum + (city.details?.currentResources[3] || 0), 0),
    sulfur: cities.reduce((sum, city) => sum + (city.details?.currentResources[4] || 0), 0),
  };

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Visão Geral</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Mapeamento geral dos recursos de suas cidades.
          </p>
        </div>
        <div className="timeframe-selector">
          {(['hour', 'day', 'week'] as const).map((value) => (
            <button
              key={value}
              onClick={() => setTimeframe(value)}
              className={`timeframe-btn ${timeframe === value ? 'active' : ''}`}
            >
              {value === 'hour' ? 'Hora' : value === 'day' ? 'Dia' : 'Semana'}
            </button>
          ))}
        </div>
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h3>Visão Geral dos Recursos</h3>
        </div>
        <div className="table-responsive">
          <table className="ikariam-table">
            <thead>
              <tr>
                <th />
                <th>Ouro</th>
                <th>
                  <ResourceIcon src={RESOURCE_ICONS.wood} alt="Madeira" /> Madeira
                </th>
                <th>
                  <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" /> Vinho
                </th>
                <th>
                  <ResourceIcon src={RESOURCE_ICONS.marble} alt="Mármore" /> Mármore
                </th>
                <th>
                  <ResourceIcon src={RESOURCE_ICONS.crystal} alt="Cristal" /> Cristal
                </th>
                <th>
                  <ResourceIcon src={RESOURCE_ICONS.sulfur} alt="Enxofre" /> Enxofre
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e0d6b3' }}>
                <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Produção {suffix}</td>
                <td style={{ fontWeight: 'bold', color: netGold >= 0 ? '#007700' : '#cc0000' }}>
                  {netGold >= 0 ? '+' : ''}
                  {(netGold * multiplier).toFixed(0)}
                </td>
                <td style={{ fontWeight: 'bold', color: '#593e1a' }}>+{woodProd * multiplier}</td>
                <td style={{ fontWeight: 'bold', color: '#990033' }}>+{wineProd * multiplier}</td>
                <td style={{ fontWeight: 'bold', color: '#737373' }}>+{marbleProd * multiplier}</td>
                <td style={{ fontWeight: 'bold', color: '#006699' }}>+{crystalProd * multiplier}</td>
                <td style={{ fontWeight: 'bold', color: '#cc9900' }}>+{sulfurProd * multiplier}</td>
              </tr>
              <tr className="row-zebra">
                <td style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>Estoque Acumulado</td>
                <td style={{ fontWeight: 'bold' }}>{totalStock.gold.toFixed(0)}</td>
                <td>{totalStock.wood}</td>
                <td>{totalStock.wine}</td>
                <td>{totalStock.marble}</td>
                <td>{totalStock.crystal}</td>
                <td>{totalStock.sulfur}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h3>Visão das Cidades</h3>
        </div>
        <div className="table-responsive">
          <table className="ikariam-table">
            <thead>
              <tr>
                <th>Cidade</th>
                <th>População</th>
                <th>Produção ({suffix})</th>
                <th>Estoque na Cidade</th>
                <th>Balanço de Vinho</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((city, index) => {
                const hasDetails = !!city.details;
                const status = getCityStatus(city.lastUpdate);
                const wineProduction = hasDetails && city.tradegood === 1 ? city.details!.tradegoodProduction : 0;
                const wineSpending = hasDetails ? city.details!.wineSpendings : 0;
                const wineBalance = wineProduction - wineSpending;
                const scaledWineBalance = wineBalance * multiplier;

                return (
                  <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                    <td style={{ fontWeight: 'bold', color: 'var(--bg-dark-wood)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span title={status.tooltip} style={{ cursor: 'help', fontSize: '0.95rem' }}>
                          {status.emoji}
                        </span>
                        <div>{city.name}</div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          fontWeight: 'normal',
                          marginLeft: '22px',
                          display: 'block',
                        }}
                      >
                        {city.coords}
                      </span>
                    </td>
                    <td>
                      {hasDetails ? (
                        <div>
                          <div>{Math.floor(city.details!.population)} hab.</div>
                          <div style={{ fontSize: '0.75rem', color: '#006600' }}>
                            {Math.floor(city.details!.citizens)} livres
                          </div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {hasDetails ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
                            <ResourceIcon src={RESOURCE_ICONS.wood} alt="Madeira" /> +
                            {city.details!.resourceProduction * multiplier}
                          </div>
                          {city.tradegood !== 0 && (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <ResourceIcon
                                src={TRADEGOOD_ICONS[city.tradegood] || RESOURCE_ICONS.luxury}
                                alt="Bem de Luxo"
                              />
                              +{city.details!.tradegoodProduction * multiplier}
                            </div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {hasDetails ? (
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, max-content)',
                            gap: '4px 16px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center' }}>
                            <ResourceIcon src={RESOURCE_ICONS.wood} alt="M" /> {city.details!.currentResources[0]}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', opacity: city.details!.currentResources[1] ? 1 : 0.4 }}>
                            <ResourceIcon src={RESOURCE_ICONS.wine} alt="V" /> {city.details!.currentResources[1]}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', opacity: city.details!.currentResources[2] ? 1 : 0.4 }}>
                            <ResourceIcon src={RESOURCE_ICONS.marble} alt="Ma" /> {city.details!.currentResources[2]}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', opacity: city.details!.currentResources[3] ? 1 : 0.4 }}>
                            <ResourceIcon src={RESOURCE_ICONS.crystal} alt="C" /> {city.details!.currentResources[3]}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', opacity: city.details!.currentResources[4] ? 1 : 0.4 }}>
                            <ResourceIcon src={RESOURCE_ICONS.sulfur} alt="E" /> {city.details!.currentResources[4]}
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {hasDetails ? (
                        <div>
                          <span
                            style={{
                              color: wineBalance < 0 ? '#cc0000' : wineBalance > 0 ? '#007700' : 'var(--text-dark)',
                              fontWeight: wineBalance !== 0 ? 'bold' : 'normal',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {(wineSpending > 0 || wineProduction > 0) && (
                              <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" />
                            )}
                            {wineBalance > 0
                              ? `+${scaledWineBalance}${suffix}`
                              : wineBalance < 0
                                ? `${scaledWineBalance}${suffix}`
                                : `0${suffix}`}
                          </span>
                          {(wineSpending > 0 || wineProduction > 0) && (
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                marginTop: '2px',
                                fontWeight: 500,
                              }}
                            >
                              {getWineTimeLeft(city.details!.currentResources[1], wineSpending, wineProduction) || '—'}
                            </div>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
