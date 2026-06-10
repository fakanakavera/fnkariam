import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import type { ResourceKey } from '../types/buildings';
import type { City } from '../types/game';
import {
  RESOURCE_INDEX,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  getResourceNetProduction,
  getWarehouseRisk,
  hoursUntilWarehouseUnsafe,
  type WarehouseRisk,
} from '../utils/resourceUtils';
import { ResourceIcon } from './shared/ResourceIcon';

const RISK_COLORS: Record<WarehouseRisk, string> = {
  safe: '#007700',
  warning: '#b35c00',
  danger: '#cc0000',
};

function getRiskHint(city: City, resource: ResourceKey, stock: number, safe: number, risk: WarehouseRisk) {
  if (risk === 'danger') {
    return `+${(stock - safe).toLocaleString('pt-BR')} acima do seguro`;
  }
  if (risk === 'warning') {
    const hourly = getResourceNetProduction(city, resource);
    const hours = hoursUntilWarehouseUnsafe(stock, safe, hourly);
    if (hours != null && hours <= 12) {
      return `~${Math.ceil(hours)}h até ficar inseguro`;
    }
  }
  return null;
}

export function WarehouseSafety() {
  const { cities } = useGame();

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Segurança do Armazém</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Vermelho: acima do seguro hoje. Laranja: ficará inseguro nas próximas 12h com a produção atual.
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
                    const hourlyProduction = getResourceNetProduction(city, resource);
                    const risk = getWarehouseRisk(stock, safe, hourlyProduction);
                    const hint = getRiskHint(city, resource, stock, safe, risk);

                    return (
                      <td
                        key={resource}
                        style={{ color: RISK_COLORS[risk], fontWeight: risk !== 'safe' ? 'bold' : 'normal' }}
                      >
                        {stock.toLocaleString('pt-BR')}
                        {hint && <div style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>{hint}</div>}
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
