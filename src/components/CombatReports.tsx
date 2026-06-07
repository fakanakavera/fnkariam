import { useEffect, useState } from 'react';
import type { CombatReport } from '../types/combatReport';

function formatLootValue(value: number) {
  return value.toLocaleString('pt-BR');
}

function LootCard({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <div className="loot-item">
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
      <div>{formatLootValue(value)}</div>
    </div>
  );
}

export function CombatReports() {
  const [reports, setReports] = useState<CombatReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const loadReports = async () => {
      const result = await browser.storage.local.get('combatReports');
      const stored = (result.combatReports as CombatReport[] | undefined) || [];
      setReports(stored);
      if (stored.length > 0) setSelectedId(stored[0].id);
    };

    void loadReports();

    const onMessage = (message: { type?: string; payload?: CombatReport }) => {
      if (message.type !== 'COMBAT_REPORT' || !message.payload) return;
      setReports((prev) => {
        const withoutDuplicate = prev.filter((item) => item.id !== message.payload!.id);
        return [message.payload!, ...withoutDuplicate];
      });
      setSelectedId(message.payload.id);
    };

    browser.runtime.onMessage.addListener(onMessage);
    return () => browser.runtime.onMessage.removeListener(onMessage);
  }, []);

  const selected = reports.find((report) => report.id === selectedId) || null;

  const clearReports = async () => {
    await browser.storage.local.set({ combatReports: [] });
    setReports([]);
    setSelectedId(null);
  };

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Relatórios de Combate</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Abra um relatório no conselheiro militar do jogo para capturá-lo aqui automaticamente.
          </p>
        </div>
        {reports.length > 0 && (
          <button
            onClick={() => void clearReports()}
            style={{
              backgroundColor: '#990033',
              color: '#fff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 'var(--radius)',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Limpar histórico
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Nenhum relatório capturado ainda.</p>
          <p>
            No Ikariam, vá em <strong>Militar → Relatórios de combate</strong> e abra um relatório.
            Ele aparecerá aqui em tempo real.
          </p>
        </div>
      ) : (
        <div className="combat-layout">
          <div className="combat-list">
            {reports.map((report) => (
              <button
                key={report.id}
                className={`combat-list-item ${selectedId === report.id ? 'active' : ''}`}
                onClick={() => setSelectedId(report.id)}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{report.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{report.date}</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{report.winner}</div>
              </button>
            ))}
          </div>

          {selected && (
            <div className="combat-detail">
              <h3 style={{ marginBottom: '6px' }}>{selected.title}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{selected.date}</p>

              <div className="combat-meta">
                <div className="combat-meta-card">
                  <label>Atacante</label>
                  <div style={{ color: '#007700', fontWeight: 'bold' }}>{selected.attacker}</div>
                </div>
                <div className="combat-meta-card">
                  <label>Defensor</label>
                  <div style={{ color: '#990033', fontWeight: 'bold' }}>{selected.defender}</div>
                </div>
                <div className="combat-meta-card">
                  <label>Vencedor</label>
                  <div style={{ fontWeight: 'bold' }}>{selected.winner}</div>
                </div>
                <div className="combat-meta-card">
                  <label>Perdedor</label>
                  <div>{selected.loser}</div>
                </div>
              </div>

              {(selected.loot.gold > 0 ||
                selected.loot.wood > 0 ||
                selected.loot.wine > 0 ||
                selected.loot.marble > 0 ||
                selected.loot.crystal > 0 ||
                selected.loot.sulfur > 0) && (
                <section className="dashboard-section" style={{ marginBottom: '20px' }}>
                  <div className="dashboard-section-header">
                    <h3>Recursos Pilhados</h3>
                  </div>
                  <div style={{ padding: '16px' }}>
                    <div className="loot-grid">
                      <LootCard label="Ouro" value={selected.loot.gold} />
                      <LootCard label="Madeira" value={selected.loot.wood} />
                      <LootCard label="Vinho" value={selected.loot.wine} />
                      <LootCard label="Mármore" value={selected.loot.marble} />
                      <LootCard label="Cristal" value={selected.loot.crystal} />
                      <LootCard label="Enxofre" value={selected.loot.sulfur} />
                    </div>
                  </div>
                </section>
              )}

              {selected.rounds.map((round, index) => (
                <section key={`${selected.id}-round-${index}`} className="dashboard-section" style={{ marginBottom: '16px' }}>
                  <div className="dashboard-section-header">
                    <h3>{round.roundLabel}</h3>
                  </div>
                  <div className="table-responsive">
                    <table className="ikariam-table">
                      <thead>
                        <tr>
                          <th>Lado</th>
                          <th>Unidade</th>
                          <th>Quantidade</th>
                          <th>Perdas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {round.attackerUnits.map((unit, unitIndex) => (
                          <tr key={`a-${unitIndex}`}>
                            <td style={{ color: '#007700', fontWeight: 'bold' }}>Atacante</td>
                            <td>{unit.name}</td>
                            <td>{unit.count}</td>
                            <td>{unit.losses > 0 ? `-${unit.losses}` : '0'}</td>
                          </tr>
                        ))}
                        {round.defenderUnits.map((unit, unitIndex) => (
                          <tr key={`d-${unitIndex}`} className="row-zebra">
                            <td style={{ color: '#990033', fontWeight: 'bold' }}>Defensor</td>
                            <td>{unit.name}</td>
                            <td>{unit.count}</td>
                            <td>{unit.losses > 0 ? `-${unit.losses}` : '0'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ))}

              {selected.notes.length > 0 && (
                <section className="dashboard-section">
                  <div className="dashboard-section-header">
                    <h3>Observações</h3>
                  </div>
                  <div style={{ padding: '16px' }}>
                    {selected.notes.map((note, index) => (
                      <p key={index} style={{ marginBottom: '8px' }}>
                        {note}
                      </p>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
