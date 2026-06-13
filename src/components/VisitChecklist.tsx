import { useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { cityDistance } from '../utils/cityDistance';
import type { City } from '../types/game';

function getStalenessMs(city: City) {
  if (!city.lastUpdate) return Infinity;
  return Date.now() - city.lastUpdate;
}

function formatStaleness(city: City) {
  if (!city.lastUpdate) return 'Nunca visitada';
  const hours = Math.floor((Date.now() - city.lastUpdate) / 3600000);
  if (hours < 1) return `${Math.floor((Date.now() - city.lastUpdate) / 60000)}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return `${Math.floor(hours / 24)}d atrás`;
}

function suggestVisitOrder(cities: City[]) {
  const stale = [...cities].sort((a, b) => getStalenessMs(b) - getStalenessMs(a));
  if (stale.length <= 1) return stale;

  const ordered: City[] = [];
  const remaining = [...stale];
  let current = remaining.shift()!;
  ordered.push(current);

  while (remaining.length > 0) {
    remaining.sort((a, b) => cityDistance(current, a) - cityDistance(current, b));
    current = remaining.shift()!;
    ordered.push(current);
  }

  return ordered;
}

export function VisitChecklist() {
  const { cities } = useGame();

  const sorted = useMemo(
    () => [...cities].sort((a, b) => getStalenessMs(b) - getStalenessMs(a)),
    [cities],
  );

  const suggested = useMemo(() => suggestVisitOrder(cities.filter((c) => !c.lastUpdate || getStalenessMs(c) > 3600000)), [cities]);

  const copyNames = (list: City[]) => {
    void navigator.clipboard.writeText(list.map((c) => c.name).join(', '));
  };

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Checklist de Visitas</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Dados são atualizados ao visitar cada cidade no jogo. Use esta lista para saber o que visitar.
          </p>
        </div>
        <button
          onClick={() => copyNames(sorted)}
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
          Copiar nomes
        </button>
      </div>

      {suggested.length > 0 && (
        <section
          className="dashboard-section"
          style={{ padding: '16px', marginBottom: '20px', backgroundColor: '#fdfaf0' }}
        >
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Ordem sugerida de visita</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
            Minimiza saltos entre ilhas (cidades com dados antigos ou ausentes).
          </p>
          <ol style={{ paddingLeft: '20px', fontSize: '0.9rem' }}>
            {suggested.map((city) => (
              <li key={city.id} style={{ marginBottom: '4px' }}>
                <strong>{city.name}</strong> — {formatStaleness(city)} ({city.coords})
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="table-responsive">
        <table className="ikariam-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Cidade</th>
              <th>Coordenadas</th>
              <th>Última atualização</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((city, index) => {
              const staleMs = getStalenessMs(city);
              const status =
                !city.lastUpdate ? '⛔' : staleMs > 4 * 3600000 ? '⚠️' : '✅';
              return (
                <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                  <td>{index + 1}</td>
                  <td style={{ fontWeight: 'bold' }}>{city.name}</td>
                  <td>{city.coords}</td>
                  <td>{formatStaleness(city)}</td>
                  <td style={{ fontSize: '1.1rem' }}>{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
