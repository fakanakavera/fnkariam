import { useState } from 'react';
import { WarehouseSafety } from './WarehouseSafety';
import { GoldForecast } from './GoldForecast';
import { CorruptionAdvisor } from './CorruptionAdvisor';

type EconomySection = 'warehouse' | 'gold' | 'corruption';

export function Economy() {
  const [section, setSection] = useState<EconomySection>('warehouse');

  const btnStyle = (active: boolean) => ({
    padding: '8px 16px',
    backgroundColor: active ? 'var(--bg-dark-wood)' : 'transparent',
    color: active ? '#fff' : 'var(--text-dark)',
    border: '1px solid var(--bg-dark-wood)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer' as const,
    fontWeight: 'bold' as const,
    fontSize: '0.9rem',
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button onClick={() => setSection('warehouse')} style={btnStyle(section === 'warehouse')}>
          Armazém
        </button>
        <button onClick={() => setSection('gold')} style={btnStyle(section === 'gold')}>
          Ouro
        </button>
        <button onClick={() => setSection('corruption')} style={btnStyle(section === 'corruption')}>
          Vinho
        </button>
      </div>
      {section === 'warehouse' && <WarehouseSafety />}
      {section === 'gold' && <GoldForecast />}
      {section === 'corruption' && <CorruptionAdvisor />}
    </div>
  );
}
