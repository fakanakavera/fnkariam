import { useState, type CSSProperties } from 'react';
import { BarbarianVillage } from '../../components/BarbarianVillage';
import { CombatReports } from '../../components/CombatReports';
import { Overview } from '../../components/Overview';
import { Logistics } from '../../components/Logistics';
import { GameProvider } from '../../context/GameContext';
import '../../assets/page.css';

type Tab = 'overview' | 'logistics' | 'barbarianVillage' | 'combatReports';

function navButtonStyle(active: boolean): CSSProperties {
  return {
    padding: '10px 20px',
    backgroundColor: active ? 'var(--bg-main)' : 'transparent',
    color: active ? 'var(--text-dark)' : 'var(--text-light)',
    border: active ? 'var(--border-wood)' : 'none',
    borderRadius: active ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.95rem',
  };
}

function HubLayout() {
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header
        style={{
          backgroundColor: 'var(--bg-dark-wood)',
          color: 'var(--text-light)',
          padding: '0 32px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-md)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>🏛️</span>
          <h1 style={{ color: 'var(--color-gold)', margin: 0, fontSize: '1.5rem' }}>Ikariam Hub</h1>
        </div>
        <nav style={{ display: 'flex', gap: '8px', height: '100%', alignItems: 'center' }}>
          <button onClick={() => setTab('overview')} style={navButtonStyle(tab === 'overview')}>
            Visão Geral
          </button>
          <button onClick={() => setTab('logistics')} style={navButtonStyle(tab === 'logistics')}>
            Logística
          </button>
          <button onClick={() => setTab('barbarianVillage')} style={navButtonStyle(tab === 'barbarianVillage')}>
            Vila dos Bárbaros
          </button>
          <button onClick={() => setTab('combatReports')} style={navButtonStyle(tab === 'combatReports')}>
            Relatórios de Combate
          </button>
        </nav>
      </header>

      <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', width: '100%', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: 'var(--border-wood)',
            borderRadius: 'var(--radius)',
            padding: '32px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {tab === 'overview' && <Overview />}
          {tab === 'logistics' && <Logistics />}
          {tab === 'barbarianVillage' && <BarbarianVillage />}
          {tab === 'combatReports' && <CombatReports />}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <HubLayout />
    </GameProvider>
  );
}
