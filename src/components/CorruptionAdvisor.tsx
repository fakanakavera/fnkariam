import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import type { CityDetails } from '../types/game';
import {
  formatHoursUntilFull,
  getPopulationSnapshot,
  getWineTavernAdvice,
  hasTownHallIntel,
  type WineTavernAction,
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

const ACTION_COLORS: Record<WineTavernAction, string> = {
  reduce: '#b35c00',
  increase: '#006699',
  maintain: '#007700',
  unknown: 'var(--text-muted)',
};

const ACTION_LABELS: Record<WineTavernAction, string> = {
  reduce: 'Reduzir vinho',
  increase: 'Aumentar vinho',
  maintain: 'Manter',
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
  if (!hasTownHallIntel(details) || snapshot?.growthPerHour == null) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  const growth = snapshot.growthPerHour;
  const growthColor = growth > 0 ? '#007700' : growth < 0 ? '#cc0000' : '#b35c00';

  return (
    <div>
      <div style={{ fontWeight: 600, color: growthColor }}>
        {growth > 0 ? '+' : ''}
        {growth.toFixed(2)}/h
      </div>
      {growth <= 0 && (
        <div style={{ fontSize: '0.75rem', color: '#b35c00' }}>Sem crescimento</div>
      )}
      {snapshot.hoursUntilFull != null && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Cheia em {formatHoursUntilFull(snapshot.hoursUntilFull)}
        </div>
      )}
    </div>
  );
}

function TavernCell({ details }: { details: CityDetails }) {
  const snapshot = getPopulationSnapshot(details);
  const spending = details.wineSpendings || 0;
  const level = details.tavernLevel;
  const hasBonuses = details.wineTavernBonus != null || details.wineServingBonus != null;

  if (!level && !spending && !hasBonuses) {
    return <span style={{ color: 'var(--text-muted)' }}>Sem taberna</span>;
  }

  return (
    <div>
      {level ? (
        <div style={{ fontWeight: 600 }}>
          Taberna nv. {level}
          {details.wineTavernBonus != null && details.wineTavernBonus > 0 && (
            <span style={{ color: '#990033' }}> +{details.wineTavernBonus}</span>
          )}
        </div>
      ) : (
        <div style={{ fontWeight: 600 }}>Taberna</div>
      )}
      {details.wineServingBonus != null && details.wineServingBonus > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#990033' }}>
          Serviço: +{details.wineServingBonus} satisfação
        </div>
      )}
      {!hasBonuses && hasTownHallIntel(details) && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem bônus de vinho</div>
      )}
      {!hasBonuses && !hasTownHallIntel(details) && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Abra a CM para bônus</div>
      )}
      {spending > 0 && (
        <div style={{ fontSize: '0.75rem', color: '#cc0000' }}>-{spending}/h vinho</div>
      )}
      {snapshot && spending > 0 && snapshot.growthPerHour != null && snapshot.growthPerHour <= 0 && (
        <div style={{ fontSize: '0.75rem', color: '#b35c00', fontWeight: 600 }}>Vinho sem crescimento</div>
      )}
    </div>
  );
}

function SatisfactionCell({ details }: { details: CityDetails }) {
  if (!hasTownHallIntel(details) || details.satisfaction == null) {
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
    </div>
  );
}

export function CorruptionAdvisor() {
  const { cities } = useGame();

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Vinho e Taberna</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Dados da Câmara Municipal: bônus da taberna, serviço de vinho, espaço e crescimento — para saber se
            aumenta ou reduz o vinho.
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
        Abra a <strong>Câmara Municipal</strong> de cada cidade. Na secção <strong>Satisfação → Vinho</strong> o jogo
        mostra o bônus do nível da taberna e do serviço de vinho — esses valores são capturados automaticamente.
      </div>

      <div className="table-responsive">
        <table className="ikariam-table">
          <thead>
            <tr>
              <th>Cidade</th>
              <th>Espaço CM</th>
              <th>Crescimento</th>
              <th>Taberna</th>
              <th>Satisfação</th>
              <th>
                <ResourceIcon src={RESOURCE_ICONS.wine} alt="Vinho" />
                Estoque
              </th>
              <th>Tempo restante</th>
              <th>Risco</th>
              <th>Ajuste de vinho</th>
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
              const advice = getWineTavernAdvice(city.details);

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
                    <TavernCell details={city.details} />
                  </td>
                  <td>
                    <SatisfactionCell details={city.details} />
                  </td>
                  <td>{stock.toLocaleString('pt-BR')}</td>
                  <td style={{ fontWeight: 500 }}>{timeLeft || (spending ? '0h' : '—')}</td>
                  <td style={{ color: RISK_COLORS[risk], fontWeight: 'bold' }}>{RISK_LABELS[risk]}</td>
                  <td>
                    <div style={{ color: ACTION_COLORS[advice.action], fontWeight: 'bold', marginBottom: '4px' }}>
                      {ACTION_LABELS[advice.action]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '260px' }}>
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
