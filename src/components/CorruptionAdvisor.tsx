import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import { formatWineTimeLeft } from '../utils/resourceUtils';
import { ResourceIcon } from './shared/ResourceIcon';

type RiskLevel = 'ok' | 'warning' | 'danger';

function getCorruptionRisk(stock: number, spending: number, population: number): RiskLevel {
  if (!spending || !population) return 'ok';
  const hours = stock / spending;
  if (hours < 6) return 'danger';
  if (hours < 12) return 'warning';
  return 'ok';
}

const RISK_LABELS: Record<RiskLevel, string> = {
  ok: 'OK',
  warning: 'Atenção',
  danger: 'Risco de corrupção',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  ok: '#007700',
  warning: '#b35c00',
  danger: '#cc0000',
};

export function CorruptionAdvisor() {
  const { cities } = useGame();

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Vinho e Corrupção</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Monitore o consumo de vinho da taberna e o risco de corrupção por cidade.
          </p>
        </div>
      </div>

      <div className="table-responsive">
        <table className="ikariam-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>População</th>
              <th>
                <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" />
                Estoque
              </th>
              <th>Consumo/h</th>
              <th>Tempo restante</th>
              <th>Risco</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city, index) => {
              if (!city.details) {
                return (
                  <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                    <td style={{ fontWeight: 'bold' }}>{city.name}</td>
                    <td colSpan={5} style={{ color: 'var(--text-muted)' }}>Visite a cidade para atualizar</td>
                  </tr>
                );
              }

              const stock = city.details.currentResources[1] || 0;
              const spending = city.details.wineSpendings || 0;
              const population = city.details.population || 0;
              const risk = getCorruptionRisk(stock, spending, population);
              const timeLeft = formatWineTimeLeft(stock, spending);

              return (
                <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                  <td style={{ fontWeight: 'bold' }}>{city.name}</td>
                  <td>{Math.floor(population)} hab.</td>
                  <td>{stock.toLocaleString('pt-BR')}</td>
                  <td style={{ color: spending > 0 ? '#cc0000' : 'inherit' }}>
                    {spending > 0 ? `-${spending}/h` : '0'}
                  </td>
                  <td style={{ fontWeight: 500 }}>{timeLeft || (spending ? '0h' : '—')}</td>
                  <td style={{ color: RISK_COLORS[risk], fontWeight: 'bold' }}>{RISK_LABELS[risk]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
