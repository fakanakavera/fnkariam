import { useMemo } from 'react';
import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { useGame } from '../context/GameContext';
import type { ResourceKey } from '../types/buildings';
import type { City } from '../types/game';
import {
  buildUpgradePlan,
  formatDuration,
  formatHours,
  formatResourcePerMin,
  type UpgradeCost,
  type UpgradeOption,
} from '../utils/upgradePlanner';

const RESOURCE_LABELS: Record<ResourceKey, string> = {
  wood: 'Madeira',
  wine: 'Vinho',
  marble: 'Mármore',
  crystal: 'Cristal',
  sulfur: 'Enxofre',
};

function ResourceIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: '18px', height: '14px', verticalAlign: 'middle', marginRight: '4px' }}
    />
  );
}

function getCityStatus(city: City) {
  const hint = '\nPara atualizar os dados dessa cidade, visite-a no jogo e abra um conselheiro ou edifício.';
  if (!city.lastUpdate) {
    return { emoji: '⛔', label: 'Não visitada', tooltip: `Cidade não atualizada nesta sessão.${hint}` };
  }

  const elapsed = Date.now() - city.lastUpdate;
  const minutes = Math.floor(elapsed / 60000);
  if (elapsed > 4 * 60 * 60 * 1000) {
    return {
      emoji: '⚠️',
      label: 'Desatualizada',
      tooltip: `Última atualização: ${(elapsed / 3600000).toFixed(1)}h atrás.${hint}`,
    };
  }
  return { emoji: '✅', label: 'Atualizada', tooltip: `Última atualização: ${minutes}m atrás.${hint}` };
}

function CostDisplay({ cost }: { cost: UpgradeCost }) {
  const entries = (Object.keys(RESOURCE_LABELS) as ResourceKey[]).filter((key) => (cost[key] || 0) > 0);
  if (entries.length === 0) return <>—</>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
      {entries.map((key) => (
        <span key={key} style={{ display: 'flex', alignItems: 'center' }}>
          <ResourceIcon src={RESOURCE_ICONS[key]} alt={RESOURCE_LABELS[key]} />
          {(cost[key] || 0).toLocaleString('de-DE')}
        </span>
      ))}
    </div>
  );
}

function RecommendationCard({ option }: { option: UpgradeOption }) {
  return (
    <div className="planner-rec-card">
      <div className="planner-rec-title">{option.cityName}</div>
      <div className="planner-rec-meta">{option.buildingName}</div>
      <div className="planner-rec-level">
        Nv. {option.currentLevel} → {option.nextLevel}
      </div>
      <div className="planner-rec-stats">
        <span>{formatDuration(option.timeSec)}</span>
        <span>{formatResourcePerMin(option.resourcePerMin)}</span>
      </div>
      {!option.affordable && (
        <span className="planner-badge planner-badge-wait" style={{ marginBottom: '6px', display: 'inline-block' }}>
          Faltam recursos
        </span>
      )}
      <CostDisplay cost={option.cost} />
    </div>
  );
}

function MissingResourcesDisplay({ missing }: { missing: Partial<Record<ResourceKey, number>> }) {
  const entries = (Object.keys(RESOURCE_LABELS) as ResourceKey[]).filter((key) => (missing[key] || 0) > 0);
  if (entries.length === 0) return null;

  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px', fontWeight: 'normal', fontSize: '0.75rem' }}>
      {entries.map((key) => (
        <span key={key} style={{ display: 'flex', alignItems: 'center' }}>
          <ResourceIcon src={RESOURCE_ICONS[key]} alt={RESOURCE_LABELS[key]} />
          -{(missing[key] || 0).toLocaleString('de-DE')}
        </span>
      ))}
    </span>
  );
}

function UpgradeRow({ option }: { option: UpgradeOption }) {
  return (
    <tr>
      <td>
        <strong>{option.buildingName}</strong>
        {option.position > 0 && (
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '6px' }}>
            #{option.position}
          </span>
        )}
      </td>
      <td>
        {option.currentLevel} → {option.nextLevel}
      </td>
      <td>
        <CostDisplay cost={option.cost} />
      </td>
      <td>{formatDuration(option.timeSec)}</td>
      <td>{formatResourcePerMin(option.resourcePerMin)}</td>
      <td>
        {option.affordable ? (
          <span className="planner-badge planner-badge-ready">Pronto</span>
        ) : (
          <span className="planner-badge planner-badge-wait">
            Faltam recursos
            <MissingResourcesDisplay missing={option.missingResources} />
            {option.hoursToAfford !== null && (
              <span style={{ display: 'block', fontWeight: 'normal', fontSize: '0.75rem', marginTop: '2px' }}>
                ~{formatHours(option.hoursToAfford)} de produção
              </span>
            )}
          </span>
        )}
      </td>
    </tr>
  );
}

export function BuildingPlanner() {
  const { cities } = useGame();

  const plan = useMemo(() => buildUpgradePlan(cities), [cities]);

  if (cities.length === 0) {
    return (
      <div className="empty-state">
        <p>Nenhuma cidade encontrada.</p>
        <p style={{ marginTop: '8px', fontSize: '0.9rem' }}>
          Jogue Ikariam e abra o Hub para carregar os dados do seu império.
        </p>
      </div>
    );
  }

  return (
    <div className="planner-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Planejador de Edifícios</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Recomendações baseadas nos recursos e tempo de construção de cada upgrade.
          </p>
        </div>
      </div>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h3>Recomendações</h3>
        </div>
        <div className="planner-rec-grid">
          <div>
            <h4 className="planner-rec-heading">Sessão curta</h4>
            <p className="planner-rec-desc">Mais recursos por minuto — ideal quando você pode entrar várias vezes.</p>
            {plan.shortSession.length > 0 ? (
              <div className="planner-rec-cards">
                {plan.shortSession.map((option) => (
                  <RecommendationCard
                    key={`short-${option.cityId}-${option.buildingId}-${option.position}`}
                    option={option}
                  />
                ))}
              </div>
            ) : (
              <p className="planner-empty-rec">Nenhum upgrade disponível agora.</p>
            )}
          </div>
          <div>
            <h4 className="planner-rec-heading">Sessão longa</h4>
            <p className="planner-rec-desc">Menos recursos por minuto — ideal antes de dormir.</p>
            {plan.longSession.length > 0 ? (
              <div className="planner-rec-cards">
                {plan.longSession.map((option) => (
                  <RecommendationCard
                    key={`long-${option.cityId}-${option.buildingId}-${option.position}`}
                    option={option}
                  />
                ))}
              </div>
            ) : (
              <p className="planner-empty-rec">Nenhum upgrade disponível agora.</p>
            )}
          </div>
        </div>
      </section>

      {cities.map((city) => {
        const status = getCityStatus(city);
        const options = plan.byCity[city.id] || [];
        const hasBuildings = (city.details?.buildings?.length || 0) > 0;

        return (
          <section key={city.id} className="dashboard-section" style={{ marginTop: '24px' }}>
            <div className="dashboard-section-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3>
                {city.name}{' '}
                <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {city.coords}
                </span>
              </h3>
              <span title={status.tooltip} style={{ fontSize: '0.85rem', cursor: 'help' }}>
                {status.emoji} {status.label}
              </span>
            </div>

            {!city.details ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                Visite esta cidade no jogo para ver os edifícios disponíveis.
              </div>
            ) : !hasBuildings ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                Abra a visão da cidade no jogo para carregar os edifícios.
              </div>
            ) : options.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px' }}>
                Nenhum upgrade disponível para os edifícios conhecidos nesta cidade.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="overview-table">
                  <thead>
                    <tr>
                      <th>Edifício</th>
                      <th>Nível</th>
                      <th>Custo</th>
                      <th>Tempo</th>
                      <th>Eficiência</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((option) => (
                      <UpgradeRow
                        key={`${option.cityId}-${option.buildingId}-${option.position}`}
                        option={option}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
