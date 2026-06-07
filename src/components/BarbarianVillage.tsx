import { useMemo, useState } from 'react';
import { RESOURCE_ICONS } from '../assets/resourceIcons';
import { BARBARIAN_REWARDS } from '../data/barbarianRewards';

function ResourceIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      style={{ width: '18px', height: '14px', verticalAlign: 'middle', marginRight: '4px' }}
    />
  );
}

export function BarbarianVillage() {
  const [targetLevel, setTargetLevel] = useState(10);

  const totals = useMemo(
    () =>
      BARBARIAN_REWARDS.filter((item) => item.level <= targetLevel).reduce(
        (acc, item) => ({
          gold: acc.gold + item.gold,
          wood: acc.wood + item.wood,
          wine: acc.wine + item.wine,
          marble: acc.marble + item.marble,
          crystal: acc.crystal + item.crystal,
          sulfur: acc.sulfur + item.sulfur,
          totalResources: acc.totalResources + item.totalResources,
        }),
        { gold: 0, wood: 0, wine: 0, marble: 0, crystal: 0, sulfur: 0, totalResources: 0 },
      ),
    [targetLevel],
  );

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Aldeia dos Bárbaros</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Projeção de saques acumulados e consulta de recompensas.
          </p>
        </div>
      </div>

      <section className="dashboard-section" style={{ backgroundColor: '#fdfaf0', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <label htmlFor="target-level-select" style={{ fontWeight: 'bold', color: 'var(--bg-dark-wood)' }}>
            Simular pilhagem acumulada do Nível 1 até o:
          </label>
          <select
            id="target-level-select"
            value={targetLevel}
            onChange={(event) => setTargetLevel(Number(event.target.value))}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius)',
              border: 'var(--border-wood)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-dark)',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {BARBARIAN_REWARDS.map((item) => (
              <option key={item.level} value={item.level}>
                Nível {item.level}
              </option>
            ))}
          </select>
        </div>

        <div className="table-responsive" style={{ border: '1px dashed var(--color-gold)', borderRadius: 'var(--radius)' }}>
          <table className="ikariam-table">
            <thead>
              <tr>
                <th style={{ backgroundColor: '#f4ecd2' }}>Ouro Total</th>
                <th style={{ backgroundColor: '#f4ecd2' }}>
                  <ResourceIcon src={RESOURCE_ICONS.wood} alt="M" /> Madeira
                </th>
                <th style={{ backgroundColor: '#f4ecd2' }}>
                  <ResourceIcon src={RESOURCE_ICONS.wine} alt="V" /> Vinho
                </th>
                <th style={{ backgroundColor: '#f4ecd2' }}>
                  <ResourceIcon src={RESOURCE_ICONS.marble} alt="Ma" /> Mármore
                </th>
                <th style={{ backgroundColor: '#f4ecd2' }}>
                  <ResourceIcon src={RESOURCE_ICONS.crystal} alt="C" /> Cristal
                </th>
                <th style={{ backgroundColor: '#f4ecd2' }}>
                  <ResourceIcon src={RESOURCE_ICONS.sulfur} alt="E" /> Enxofre
                </th>
                <th style={{ backgroundColor: '#f4ecd2' }}>Total Recursos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', padding: '12px 8px' }}>{totals.gold.toLocaleString('pt-BR')}</td>
                <td>{totals.wood.toLocaleString('pt-BR')}</td>
                <td>{totals.wine.toLocaleString('pt-BR')}</td>
                <td>{totals.marble.toLocaleString('pt-BR')}</td>
                <td>{totals.crystal.toLocaleString('pt-BR')}</td>
                <td>{totals.sulfur.toLocaleString('pt-BR')}</td>
                <td style={{ fontWeight: 'bold' }}>{totals.totalResources.toLocaleString('pt-BR')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-section-header">
          <h3>Tabela de Recompensas por Nível</h3>
        </div>
        <div className="table-responsive">
          <table className="ikariam-table">
            <thead>
              <tr>
                <th>Nível</th>
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
                <th>Total Recursos</th>
                <th>Barcos</th>
              </tr>
            </thead>
            <tbody>
              {BARBARIAN_REWARDS.map((item, index) => (
                <tr
                  key={item.level}
                  className={index % 2 === 0 ? '' : 'row-zebra'}
                  style={
                    item.level === targetLevel
                      ? { backgroundColor: '#fff3cd', borderLeft: '3px solid var(--color-gold)' }
                      : undefined
                  }
                >
                  <td style={{ fontWeight: 'bold', color: 'var(--bg-dark-wood)' }}>{item.level}</td>
                  <td>{item.gold.toLocaleString('pt-BR')}</td>
                  <td>{item.wood.toLocaleString('pt-BR')}</td>
                  <td>{item.wine.toLocaleString('pt-BR')}</td>
                  <td>{item.marble.toLocaleString('pt-BR')}</td>
                  <td>{item.crystal.toLocaleString('pt-BR')}</td>
                  <td>{item.sulfur.toLocaleString('pt-BR')}</td>
                  <td style={{ fontWeight: 600 }}>{item.totalResources.toLocaleString('pt-BR')}</td>
                  <td>{item.boats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
