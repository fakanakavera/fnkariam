import { useGame } from '../context/GameContext';
import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { ResourceIcon } from './shared/ResourceIcon';

export function GoldForecast() {
  const { account, cities } = useGame();

  const income = account?.income || 0;
  const upkeep = account?.upkeep || 0;
  const scientists = account?.scientistsUpkeep || 0;
  const netGold = income + upkeep + scientists;
  const gold = account?.gold || 0;

  const goldIn24h = gold + netGold * 24;
  const hoursUntilBroke = netGold < 0 && gold > 0 ? gold / Math.abs(netGold) : null;
  const daysUntilBroke = hoursUntilBroke ? hoursUntilBroke / 24 : null;

  const wineCities = cities
    .filter((c) => c.details && (c.details.wineSpendings || 0) > 0)
    .map((c) => ({
      name: c.name,
      spending: c.details!.wineSpendings,
    }));

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Previsão de Ouro</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Fluxo de ouro do império com projeções baseadas nos dados capturados.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="dashboard-section" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ouro atual</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{gold.toFixed(0)}</div>
        </div>
        <div className="dashboard-section" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Balanço / hora</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: netGold >= 0 ? '#007700' : '#cc0000' }}>
            {netGold >= 0 ? '+' : ''}
            {netGold.toFixed(0)}
          </div>
        </div>
        <div className="dashboard-section" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ouro em 24h</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: goldIn24h >= 0 ? 'inherit' : '#cc0000' }}>
            {goldIn24h.toFixed(0)}
          </div>
        </div>
        {daysUntilBroke != null && (
          <div className="dashboard-section" style={{ padding: '16px', borderColor: '#cc0000' }}>
            <div style={{ fontSize: '0.85rem', color: '#cc0000' }}>Falência estimada</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#cc0000' }}>
              {daysUntilBroke >= 1 ? `${daysUntilBroke.toFixed(1)}d` : `${hoursUntilBroke!.toFixed(0)}h`}
            </div>
          </div>
        )}
      </div>

      <section className="dashboard-section" style={{ marginTop: '8px' }}>
        <div className="dashboard-section-header">
          <h3>Composição do balanço</h3>
        </div>
        <div className="table-responsive">
          <table className="ikariam-table">
            <tbody>
              <tr>
                <td>Renda</td>
                <td style={{ color: '#007700', fontWeight: 'bold' }}>+{income.toFixed(0)}/h</td>
              </tr>
              <tr className="row-zebra">
                <td>Manutenção</td>
                <td style={{ color: upkeep < 0 ? '#cc0000' : 'inherit', fontWeight: 'bold' }}>{upkeep.toFixed(0)}/h</td>
              </tr>
              <tr>
                <td>Cientistas</td>
                <td style={{ color: '#cc0000', fontWeight: 'bold' }}>{scientists.toFixed(0)}/h</td>
              </tr>
              <tr className="row-zebra">
                <td style={{ fontWeight: 'bold' }}>Total</td>
                <td style={{ color: netGold >= 0 ? '#007700' : '#cc0000', fontWeight: 'bold' }}>
                  {netGold >= 0 ? '+' : ''}
                  {netGold.toFixed(0)}/h
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {wineCities.length > 0 && (
        <section className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>
              <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" />
              Gasto de vinho por cidade
            </h3>
          </div>
          <div className="table-responsive">
            <table className="ikariam-table">
              <thead>
                <tr>
                  <th>Cidade</th>
                  <th>Consumo /h</th>
                </tr>
              </thead>
              <tbody>
                {wineCities.map((city, index) => (
                  <tr key={city.name} className={index % 2 === 0 ? '' : 'row-zebra'}>
                    <td>{city.name}</td>
                    <td style={{ color: '#cc0000', fontWeight: 'bold' }}>-{city.spending}/h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
