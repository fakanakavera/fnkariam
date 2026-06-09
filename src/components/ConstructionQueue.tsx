import { useEffect, useState } from 'react';
import { loadConstructionQueue } from '../storage/constructionStorage';
import { CONSTRUCTION_ALERT_MINUTES, CONSTRUCTION_QUEUE_STORAGE_KEY, CONSTRUCTION_QUEUE_UPDATED_MESSAGE, type StoredConstructionQueue } from '../types/construction';
import { formatDurationMs } from '../utils/resourceUtils';

export function ConstructionQueue() {
  const [queue, setQueue] = useState<StoredConstructionQueue>({ items: [], lastUpdated: 0 });
  const [, setTick] = useState(0);

  useEffect(() => {
    void loadConstructionQueue().then(setQueue);

    const onMessage = (message: { type?: string; payload?: StoredConstructionQueue }) => {
      if (message.type === CONSTRUCTION_QUEUE_UPDATED_MESSAGE && message.payload) {
        setQueue(message.payload);
      }
    };

    const onStorageChanged = (
      changes: Record<string, browser.storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== 'local' || !changes[CONSTRUCTION_QUEUE_STORAGE_KEY]?.newValue) return;
      setQueue(changes[CONSTRUCTION_QUEUE_STORAGE_KEY].newValue as StoredConstructionQueue);
    };

    browser.runtime.onMessage.addListener(onMessage);
    browser.storage.onChanged.addListener(onStorageChanged);

    const interval = window.setInterval(() => setTick((t) => t + 1), 30000);

    return () => {
      browser.runtime.onMessage.removeListener(onMessage);
      browser.storage.onChanged.removeListener(onStorageChanged);
      window.clearInterval(interval);
    };
  }, []);

  const now = Date.now();
  const active = queue.items.filter((item) => item.finishTime > now);
  const sorted = [...active].sort((a, b) => a.finishTime - b.finishTime);

  return (
    <div className="overview-container">
      <div className="overview-header">
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Fila de Construção</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Edifícios em construção no império. Alerta automático {CONSTRUCTION_ALERT_MINUTES} minutos antes do término.
          </p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            backgroundColor: '#fafafa',
            borderRadius: 'var(--radius)',
            border: '1px solid #e8e1cf',
          }}
        >
          Nenhuma construção ativa detectada. Visite cidades no jogo para capturar a fila.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="ikariam-table">
            <thead>
              <tr>
                <th>Cidade</th>
                <th>Edifício</th>
                <th>Nível</th>
                <th>Termina em</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, index) => {
                const remaining = item.finishTime - now;
                const alertIn = remaining - CONSTRUCTION_ALERT_MINUTES * 60 * 1000;
                return (
                  <tr key={item.id} className={index % 2 === 0 ? '' : 'row-zebra'}>
                    <td style={{ fontWeight: 'bold' }}>{item.cityName}</td>
                    <td>{item.buildingName}</td>
                    <td>
                      {item.currentLevel} → {item.targetLevel}
                    </td>
                    <td style={{ fontWeight: 'bold', color: remaining < 300000 ? '#cc0000' : 'inherit' }}>
                      {formatDurationMs(remaining)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {alertIn <= 0 ? 'Em breve' : `em ${formatDurationMs(alertIn)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
