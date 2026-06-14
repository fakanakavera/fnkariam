import type { CombatLoot, CombatReport } from '../types/combatReport';
import type { SpyResources } from '../types/spyReport';
import type { ResourceKey } from '../types/buildings';
import { RESOURCE_KEYS } from './resourceUtils';

export interface CombatCityTarget {
  cityName: string;
  playerName?: string;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function parseIkariamDateTimestamp(dateText: string): number {
  const match = dateText.trim().match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
  if (!match) return 0;

  const [, day, month, year, hour, minute, second] = match;
  return new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    parseInt(hour, 10),
    parseInt(minute, 10),
    parseInt(second, 10),
  ).getTime();
}

export function parsePlayerAndCityFromLabel(label: string): CombatCityTarget | null {
  const trimmed = label.trim();
  if (!trimmed) return null;

  const separatorIndex = trimmed.lastIndexOf(' de ');
  if (separatorIndex === -1) return null;

  const playerPart = trimmed.slice(0, separatorIndex).trim();
  const cityName = trimmed.slice(separatorIndex + 4).trim();
  if (!cityName) return null;

  const playerName = playerPart.replace(/\[[^\]]+\]/g, '').trim();
  return {
    cityName,
    playerName: playerName || undefined,
  };
}

export function parseCityNameFromCombatTitle(title: string): string | null {
  const match = title.match(/#\s*(.+?)\s*$/);
  return match?.[1]?.trim() || null;
}

export function parseCombatCityTarget(report: CombatReport): CombatCityTarget | null {
  const fromDefender = parsePlayerAndCityFromLabel(report.defender);
  const fromTitle = parseCityNameFromCombatTitle(report.title);

  if (fromDefender) {
    return {
      cityName: fromDefender.cityName,
      playerName: fromDefender.playerName,
    };
  }

  if (fromTitle) {
    return { cityName: fromTitle };
  }

  return null;
}

export function hasCombatLoot(loot: CombatLoot): boolean {
  return (
    loot.gold > 0 ||
    loot.wood > 0 ||
    loot.wine > 0 ||
    loot.marble > 0 ||
    loot.crystal > 0 ||
    loot.sulfur > 0
  );
}

export function subtractLootFromResources(resources: SpyResources, loot: CombatLoot): SpyResources {
  const stockByResource: Record<ResourceKey, number> = {
    wood: resources.wood,
    wine: resources.wine,
    marble: resources.marble,
    crystal: resources.crystal,
    sulfur: resources.sulfur,
  };

  const lootByResource: Record<ResourceKey, number> = {
    wood: loot.wood,
    wine: loot.wine,
    marble: loot.marble,
    crystal: loot.crystal,
    sulfur: loot.sulfur,
  };

  const next: SpyResources = {
    ...resources,
    gold: Math.max(0, resources.gold - loot.gold),
  };

  for (const key of RESOURCE_KEYS) {
    next[key] = Math.max(0, stockByResource[key] - lootByResource[key]);
  }

  return next;
}

export function isAttackerVictory(report: CombatReport): boolean {
  if (!report.winner || !report.attacker) return false;

  const winnerBase = report.winner.replace(/\[[^\]]+\]/g, '').trim();
  const attackerBase = report.attacker.replace(/\[[^\]]+\]/g, '').trim().split(' de ')[0]?.trim();

  if (!winnerBase) return false;
  if (report.attacker.includes(report.winner)) return true;
  if (attackerBase && winnerBase.includes(attackerBase)) return true;
  if (attackerBase && attackerBase.includes(winnerBase)) return true;

  return normalizeName(report.attacker).includes(normalizeName(winnerBase));
}

export function matchesCombatCityTarget(
  entryCityName: string,
  entryPlayerName: string | undefined,
  target: CombatCityTarget,
): boolean {
  if (normalizeName(entryCityName) !== normalizeName(target.cityName)) return false;
  if (!target.playerName || !entryPlayerName) return true;
  return normalizeName(entryPlayerName) === normalizeName(target.playerName);
}
