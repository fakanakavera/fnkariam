import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import type { CityDetails } from '../types/game';
import {
  formatHoursUntilFull,
  getPopulationSnapshot,
  getWineReductionAdvice,
  type WineReductionAdvice,
} from '../utils/populationIntel';
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

const ADVICE_COLORS: Record<WineReductionAdvice, string> = {
  safe: '#007700',
  caution: '#b35c00',
  avoid: '#cc0000',
  unknown: 'var(--text-muted)',
};

const ADVICE_LABELS: Record<WineReductionAdvice, string> = {
  safe: 'Pode reduzir',
  caution: 'Cuidado',
  avoid: 'Evitar reduzir',
  unknown: 'Dados incompletos',
};

function PopulationCell({ details }: { details: CityDetails }) {
  const snapshot = getPopulationSnapshot(details);
  if (!snapshot) {
    return (
      <div>
        <div>{Math.floor(details.population)} hab.</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Capacidade desconhecida</div>
      </div>
    );
  }

  const nearFull = snapshot.fillPercent >= 95;

  return (
    <div>
      <div style={{ fontWeight: 600 }}>
        {snapshot.population.toLocaleString('pt-BR')} / {snapshot.maxInhabitants.toLocaleString('pt-BR')}
      </div>
      <div style={{ fontSize: '0.75rem', color: nearFull ? '#cc0000' : '#006600' }}>
        {snapshot.freeSpace.toLocaleString('pt-BR')} vagas ({snapshot.fillPercent.toFixed(0)}%)
      </div>
    </div>
  );
}

function GrowthCell({ details }: { details: CityDetails }) {
  const snapshot = getPopulationSnapshot(details);
  if (!snapshot || snapshot.growthPerHour == null) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  const growth = snapshot.growthPerHour;
  const growthColor = growth > 0 ? '#007700' : growth < 0 ? '#cc0000' : 'inherit';

  return (
    <div>
      <div style={{ fontWeight: 600, color: growthColor }}>
        {growth > 0 ? '+' : ''}
        {growth.toFixed(2)}/h
      </div>
      {snapshot.hoursUntilFull != null && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Cheia em {formatHoursUntilFull(snapshot.hoursUntilFull)}
        </div>
      )}
    </div>
  );
}

function SatisfactionCell({ details }: { details: CityDetails }) {
  if (details.satisfaction == null) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  const satisfaction = details.satisfaction;
  const color = satisfaction <= 0 ? '#cc0000' : satisfaction <= 25 ? '#b35c00' : '#007700';

  return (
    <div>
      <div style={{ fontWeight: 600, color }}>{satisfaction}</div>
      {details.satisfactionLabel && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{details.satisfactionLabel}</div>
      )}
      {details.wineServingBonus != null && details.wineServingBonus > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#990033' }}>+{details.wineServingBonus} vinho</div>
      )}
    </div>
  );
}

export function CorruptionAdvisor() {
  const { cities } = useGame();

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Vinho e Corrupção</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Monitore o consumo de vinho da taberna, espaço populacional e crescimento para decidir se pode reduzir o
            serviço de vinho.
          </p>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#fdfaf0',
          border: '1px solid #e2d3b5',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}
      >
        Abra a <strong>Câmara Municipal</strong> de cada cidade no jogo para capturar capacidade, crescimento e
        satisfação. Sem isso, só população e consumo de vinho ficam visíveis.
      </div>

      <div className="table-responsive">
        <table className="ikariam-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Espaço CM</th>
              <th>Crescimento</th>
              <th>Satisfação</th>
              <th>
                <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" />
                Estoque
              </th>
              <th>Consumo/h</th>
              <th>Tempo restante</th>
              <th>Risco</th>
              <th>Reduzir vinho?</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((city, index) => {
              if (!city.details) {
                return (
                  <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                    <td style={{ fontWeight: 'bold' }}>{city.name}</td>
                    <td colSpan={8} style={{ color: 'var(--text-muted)' }}>
                      Visite a cidade para atualizar
                    </td>
                  </tr>
                );
              }

              const stock = city.details.currentResources[1] || 0;
              const spending = city.details.wineSpendings || 0;
              const population = city.details.population || 0;
              const risk = getCorruptionRisk(stock, spending, population);
              const timeLeft = formatWineTimeLeft(stock, spending);
              const advice = getWineReductionAdvice(city.details);

              return (
                <tr key={city.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                  <td style={{ fontWeight: 'bold' }}>{city.name}</td>
                  <td>
                    <PopulationCell details={city.details} />
                  </td>
                  <td>
                    <GrowthCell details={city.details} />
                  </td>
                  <td>
                    <SatisfactionCell details={city.details} />
                  </td>
                  <td>{stock.toLocaleString('pt-BR')}</td>
                  <td style={{ color: spending > 0 ? '#cc0000' : 'inherit' }}>
                    {spending > 0 ? `-${spending}/h` : '0'}
                  </td>
                  <td style={{ fontWeight: 500 }}>{timeLeft || (spending ? '0h' : '—')}</td>
                  <td style={{ color: RISK_COLORS[risk], fontWeight: 'bold' }}>{RISK_LABELS[risk]}</td>
                  <td>
                    <div style={{ color: ADVICE_COLORS[advice.level], fontWeight: 'bold', marginBottom: '4px' }}>
                      {ADVICE_LABELS[advice.level]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '220px' }}>
                      {advice.message}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
