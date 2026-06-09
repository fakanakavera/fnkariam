import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import { RESOURCE_INDEX, RESOURCE_KEYS, RESOURCE_LABELS } from '../utils/resourceUtils';
import { ResourceIcon } from './shared/ResourceIcon';

type RiskLevel = 'safe' | 'warning' | 'danger';

function getRisk(stock: number, safe: number): RiskLevel {
  if (stock > safe) return 'danger';
  if (stock >= safe * 0.9) return 'warning';
  return 'safe';
}

const RISK_COLORS: Record<RiskLevel, string> = {
  safe: '#007700',
  warning: '#b35c00',
  danger: '#cc0000',
};

export function WarehouseSafety() {
  const { cities } = useGame();

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Segurança do Armazém</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Recursos acima do limite seguro podem ser saqueados. Visite cada cidade para dados atualizados.
          </p>
        </div>
      </div>

      <div className="table-responsive">
        <table className="ikariam-table">
          <thead>
            <tr>
              <th>Cidade</th>
              {RESOURCE_KEYS.map((resource) => (
                <th key={resource}>
                  <ResourceIcon src={RESOURCE_ICONS[resource]} alt={RESOURCE_LABELS[resource]} />
                  {RESOURCE_LABELS[resource]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cities.map((city, index) => {
              const safe = city.details?.safeResources || 0;
              return (
                <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                  <td style={{ fontWeight: 'bold' }}>
                    {city.name}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                      Seguro: {safe > 0 ? safe.toLocaleString('pt-BR') : '—'}
                    </div>
                  </td>
                  {RESOURCE_KEYS.map((resource) => {
                    if (!city.details || safe <= 0) {
                      return <td key={resource}>—</td>;
                    }
                    const stock = city.details.currentResources[RESOURCE_INDEX[resource]] || 0;
                    const risk = getRisk(stock, safe);
                    return (
                      <td key={resource} style={{ color: RISK_COLORS[risk], fontWeight: risk !== 'safe' ? 'bold' : 'normal' }}>
                        {stock.toLocaleString('pt-BR')}
                        {risk === 'danger' && <div style={{ fontSize: '0.7rem' }}>+{(stock - safe).toLocaleString('pt-BR')}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
