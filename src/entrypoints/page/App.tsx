import { useState, type CSSProperties } from 'react';
import { AlertsSettings } from '../../components/AlertsSettings';
import { BarbarianVillage } from '../../components/BarbarianVillage';
import { BuildingPlanner } from '../../components/BuildingPlanner';
import { CombatReports } from '../../components/CombatReports';
import { ConstructionQueue } from '../../components/ConstructionQueue';
import { Economy } from '../../components/Economy';
import { Logistics } from '../../components/Logistics';
import { Overview } from '../../components/Overview';
import { VisitChecklist } from '../../components/VisitChecklist';
import { GameProvider } from '../../context/GameContext';
import '../../assets/page.css';

type Tab =
  | 'overview'
  | 'economy'
  | 'logistics'
  | 'cities'
  | 'construction'
  | 'alerts'
  | 'barbarianVillage'
  | 'combatReports'
  | 'buildingPlanner';

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Visão Geral',
  economy: 'Economia',
  logistics: 'Logística',
  cities: 'Cidades',
  construction: 'Construção',
  alerts: 'Alertas',
  barbarianVillage: 'Bárbaros',
  combatReports: 'Combate',
  buildingPlanner: 'Edifícios',
};

function navButtonStyle(active: boolean): CSSProperties {
  return {
    padding: '8px 14px',
    backgroundColor: active ? 'var(--bg-main)' : 'transparent',
    color: active ? 'var(--text-dark)' : 'var(--text-light)',
    border: active ? 'var(--border-wood)' : 'none',
    borderRadius: active ? 'var(--radius) var(--radius) 0 0' : 'var(--radius)',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
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
          padding: '0 24px',
          minHeight: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-md)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '1.8rem' }}>🏛️</span>
          <h1 style={{ color: 'var(--color-gold)', margin: 0, fontSize: '1.5rem' }}>Ikariam Hub</h1>
        </div>
        <nav style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', padding: '8px 0' }}>
          {(Object.keys(TAB_LABELS) as Tab[]).map((key) => (
            <button key={key} onClick={() => setTab(key)} style={navButtonStyle(tab === key)}>
              {TAB_LABELS[key]}
            </button>
          ))}
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
          {tab === 'economy' && <Economy />}
          {tab === 'logistics' && <Logistics />}
          {tab === 'cities' && <VisitChecklist />}
          {tab === 'construction' && <ConstructionQueue />}
          {tab === 'alerts' && <AlertsSettings />}
          {tab === 'barbarianVillage' && <BarbarianVillage />}
          {tab === 'combatReports' && <CombatReports />}
          {tab === 'buildingPlanner' && <BuildingPlanner />}
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
