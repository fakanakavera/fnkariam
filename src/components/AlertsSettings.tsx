import { useEffect, useState } from 'react';
import { loadAlertSettings, saveAlertSettings } from '../storage/alertSettingsStorage';
import { DEFAULT_ALERT_SETTINGS, type AlertSettings } from '../types/alerts';

function ToggleRow({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid #e8e1cf',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {label}
      </label>
      {checked && children}
    </div>
  );
}

export function AlertsSettings() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_ALERT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadAlertSettings().then(setSettings);
  }, []);

  const update = async (next: AlertSettings) => {
    setSettings(next);
    await saveAlertSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Alertas</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Notificações passivas do navegador — nenhuma ação automática no jogo.
          </p>
        </div>
        {saved && <span style={{ color: '#007700', fontWeight: 'bold' }}>Salvo</span>}
      </div>

      <section className="dashboard-section">
        <ToggleRow
          label="Ativar alertas"
          checked={settings.masterEnabled}
          onChange={(value) => update({ ...settings, masterEnabled: value })}
        />

        <ToggleRow
          label="Armazém acima do seguro"
          checked={settings.warehouse.enabled}
          onChange={(value) => update({ ...settings, warehouse: { ...settings.warehouse, enabled: value } })}
        >
          <label style={{ fontSize: '0.9rem' }}>
            Limite (% do seguro):{' '}
            <input
              type="number"
              min={50}
              max={150}
              value={settings.warehouse.thresholdPercent}
              onChange={(e) =>
                update({
                  ...settings,
                  warehouse: { ...settings.warehouse, thresholdPercent: parseInt(e.target.value, 10) || 100 },
                })
              }
              style={{ width: '80px', marginLeft: '8px' }}
            />
          </label>
        </ToggleRow>

        <ToggleRow
          label="Ouro baixo"
          checked={settings.gold.enabled}
          onChange={(value) => update({ ...settings, gold: { ...settings.gold, enabled: value } })}
        >
          <label style={{ fontSize: '0.9rem' }}>
            Mínimo de ouro:{' '}
            <input
              type="number"
              value={settings.gold.minimum}
              onChange={(e) =>
                update({
                  ...settings,
                  gold: { ...settings.gold, minimum: parseInt(e.target.value, 10) || 0 },
                })
              }
              style={{ width: '120px', marginLeft: '8px' }}
            />
          </label>
        </ToggleRow>

        <ToggleRow
          label="Cidades desatualizadas"
          checked={settings.staleCities.enabled}
          onChange={(value) => update({ ...settings, staleCities: { ...settings.staleCities, enabled: value } })}
        >
          <label style={{ fontSize: '0.9rem' }}>
            Após (horas):{' '}
            <input
              type="number"
              min={1}
              value={settings.staleCities.hours}
              onChange={(e) =>
                update({
                  ...settings,
                  staleCities: { ...settings.staleCities, hours: parseInt(e.target.value, 10) || 4 },
                })
              }
              style={{ width: '80px', marginLeft: '8px' }}
            />
          </label>
        </ToggleRow>

        <ToggleRow
          label="Risco de corrupção (vinho)"
          checked={settings.wine.enabled}
          onChange={(value) => update({ ...settings, wine: { ...settings.wine, enabled: value } })}
        >
          <label style={{ fontSize: '0.9rem' }}>
            Alertar quando restam menos de (horas):{' '}
            <input
              type="number"
              min={1}
              value={settings.wine.hoursRemaining}
              onChange={(e) =>
                update({
                  ...settings,
                  wine: { ...settings.wine, hoursRemaining: parseInt(e.target.value, 10) || 12 },
                })
              }
              style={{ width: '80px', marginLeft: '8px' }}
            />
          </label>
        </ToggleRow>

        <ToggleRow
          label="Construção terminando (5 min antes)"
          checked={settings.construction.enabled}
          onChange={(value) => update({ ...settings, construction: { enabled: value } })}
        />

        <ToggleRow
          label="Horário silencioso"
          checked={settings.quietHours.enabled}
          onChange={(value) => update({ ...settings, quietHours: { ...settings.quietHours, enabled: value } })}
        >
          <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem' }}>
            <label>
              De:{' '}
              <input
                type="number"
                min={0}
                max={23}
                value={settings.quietHours.startHour}
                onChange={(e) =>
                  update({
                    ...settings,
                    quietHours: { ...settings.quietHours, startHour: parseInt(e.target.value, 10) || 0 },
                  })
                }
                style={{ width: '60px' }}
              />
              h
            </label>
            <label>
              Até:{' '}
              <input
                type="number"
                min={0}
                max={23}
                value={settings.quietHours.endHour}
                onChange={(e) =>
                  update({
                    ...settings,
                    quietHours: { ...settings.quietHours, endHour: parseInt(e.target.value, 10) || 0 },
                  })
                }
                style={{ width: '60px' }}
              />
              h
            </label>
          </div>
        </ToggleRow>
      </section>
    </div>
  );
}
