export type AlertType =
  | 'warehouse'
  | 'gold'
  | 'staleCities'
  | 'wine'
  | 'construction'
  | 'lowResource';

export interface QuietHoursSettings {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface AlertSettings {
  masterEnabled: boolean;
  warehouse: { enabled: boolean; thresholdPercent: number };
  gold: { enabled: boolean; minimum: number };
  staleCities: { enabled: boolean; hours: number };
  wine: { enabled: boolean; hoursRemaining: number };
  construction: { enabled: boolean };
  lowResource: { enabled: boolean };
  quietHours: QuietHoursSettings;
}

export const ALERT_SETTINGS_STORAGE_KEY = 'alertSettings';
export const ALERT_STATE_STORAGE_KEY = 'alertState';

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  masterEnabled: true,
  warehouse: { enabled: true, thresholdPercent: 100 },
  gold: { enabled: true, minimum: 0 },
  staleCities: { enabled: true, hours: 4 },
  wine: { enabled: true, hoursRemaining: 12 },
  construction: { enabled: true },
  lowResource: { enabled: false },
  quietHours: { enabled: false, startHour: 23, endHour: 7 },
};

export interface AlertState {
  lastFired: Record<string, number>;
}

export const DEFAULT_ALERT_STATE: AlertState = {
  lastFired: {},
};
