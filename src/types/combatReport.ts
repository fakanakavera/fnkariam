export interface CombatLoot {
  gold: number;
  wood: number;
  wine: number;
  marble: number;
  crystal: number;
  sulfur: number;
}

export interface CombatUnitResult {
  name: string;
  count: number;
  losses: number;
}

export interface CombatRound {
  roundLabel: string;
  attackerUnits: CombatUnitResult[];
  defenderUnits: CombatUnitResult[];
}

export interface CombatReport {
  id: string;
  title: string;
  date: string;
  attacker: string;
  defender: string;
  winner: string;
  loser: string;
  loot: CombatLoot;
  rounds: CombatRound[];
  notes: string[];
  capturedAt: number;
}

export const COMBAT_REPORTS_STORAGE_KEY = 'combatReports';
