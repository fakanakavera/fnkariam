import type { CityDetails } from '../types/game';

export interface PopulationSnapshot {
  population: number;
  maxInhabitants: number;
  freeSpace: number;
  fillPercent: number;
  growthPerHour: number | null;
  hoursUntilFull: number | null;
  satisfaction: number | null;
  satisfactionLabel: string | null;
  wineTavernBonus: number | null;
  wineServingBonus: number | null;
  tavernLevel: number | null;
  wineSpending: number;
}

export type WineTavernAction = 'reduce' | 'increase' | 'maintain' | 'unknown';

export interface WineTavernAdvice {
  action: WineTavernAction;
  message: string;
}

export function hasTownHallIntel(details: CityDetails): boolean {
  return details.maxInhabitants != null && details.populationGrowth != null && details.satisfaction != null;
}

export function getPopulationSnapshot(details: CityDetails): PopulationSnapshot | null {
  if (!details.maxInhabitants) return null;

  const population = Math.floor(details.population);
  const maxInhabitants = details.maxInhabitants;
  const freeSpace = Math.max(0, maxInhabitants - population);
  const fillPercent = maxInhabitants > 0 ? (population / maxInhabitants) * 100 : 0;
  const growthPerHour = details.populationGrowth ?? null;

  let hoursUntilFull: number | null = null;
  if (growthPerHour != null && growthPerHour > 0 && freeSpace > 0) {
    hoursUntilFull = freeSpace / growthPerHour;
  }

  return {
    population,
    maxInhabitants,
    freeSpace,
    fillPercent,
    growthPerHour,
    hoursUntilFull,
    satisfaction: details.satisfaction ?? null,
    satisfactionLabel: details.satisfactionLabel ?? null,
    wineTavernBonus: details.wineTavernBonus ?? null,
    wineServingBonus: details.wineServingBonus ?? null,
    tavernLevel: details.tavernLevel ?? null,
    wineSpending: details.wineSpendings || 0,
  };
}

export function formatHoursUntilFull(hours: number | null): string {
  if (hours == null) return '—';
  if (hours <= 0) return 'Cheia';
  if (hours < 24) return `~${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  return remainingHours > 0 ? `~${days}d ${remainingHours}h` : `~${days}d`;
}

function formatWineBonus(tavernBonus: number | null, servingBonus: number | null): string {
  const parts: string[] = [];
  if (tavernBonus != null && tavernBonus > 0) parts.push(`+${tavernBonus} taberna`);
  if (servingBonus != null && servingBonus > 0) parts.push(`+${servingBonus} serviço`);
  return parts.length > 0 ? parts.join(' · ') : 'sem bônus';
}

export function getWineTavernAdvice(details: CityDetails): WineTavernAdvice {
  if (!hasTownHallIntel(details)) {
    return {
      action: 'unknown',
      message: 'Abra a Câmara Municipal para ver bônus da taberna, crescimento e satisfação.',
    };
  }

  const snapshot = getPopulationSnapshot(details);
  if (!snapshot) {
    return { action: 'unknown', message: 'Capacidade da cidade desconhecida.' };
  }

  const {
    freeSpace,
    fillPercent,
    growthPerHour,
    hoursUntilFull,
    satisfaction,
    wineSpending,
    wineServingBonus,
    wineTavernBonus,
    tavernLevel,
  } = snapshot;

  const growth = growthPerHour ?? 0;
  const isFull = fillPercent >= 95 || freeSpace <= 10;
  const hasSpace = freeSpace >= 30 && fillPercent < 92;
  const stalled = growth <= 0;
  const lowSatisfaction = satisfaction != null && satisfaction <= 30;
  const slowGrowth = growth > 0 && growth < 0.5;
  const hasTavern = (tavernLevel ?? 0) > 0 || wineSpending > 0;
  const bonusSummary = formatWineBonus(wineTavernBonus, wineServingBonus);

  if (!hasTavern) {
    if (hasSpace && stalled) {
      return {
        action: 'increase',
        message: `${freeSpace.toLocaleString('pt-BR')} vagas livres sem crescimento. Construa ou use taberna com vinho para crescer.`,
      };
    }
    return { action: 'maintain', message: 'Sem taberna ativa nesta cidade.' };
  }

  if (!wineSpending) {
    if (hasSpace && stalled) {
      return {
        action: 'increase',
        message: `${freeSpace.toLocaleString('pt-BR')} vagas livres e sem crescimento. Ative vinho na taberna para subir a satisfação.`,
      };
    }
    return { action: 'maintain', message: 'Taberna sem consumo de vinho.' };
  }

  if (isFull && stalled) {
    return {
      action: 'reduce',
      message: `Cidade cheia (${freeSpace} vagas) sem crescimento. Vinho (${bonusSummary}) não traz novos cidadãos — reduza o serviço.`,
    };
  }

  if (isFull && growth > 0) {
    return {
      action: 'reduce',
      message: `Quase cheia (${freeSpace} vagas, +${growth.toFixed(2)}/h). Vinho (${bonusSummary}) ainda impulsiona crescimento — reduza se não precisa de mais habitantes.`,
    };
  }

  if (hasSpace && stalled && lowSatisfaction) {
    return {
      action: 'increase',
      message: `${freeSpace.toLocaleString('pt-BR')} vagas livres, sem crescimento e satisfação baixa (${satisfaction}). Aumente o vinho na taberna (${bonusSummary} hoje).`,
    };
  }

  if (hasSpace && (stalled || slowGrowth) && lowSatisfaction) {
    return {
      action: 'increase',
      message: `Há espaço (${freeSpace.toLocaleString('pt-BR')} vagas) mas crescimento fraco (+${growth.toFixed(2)}/h). Mais vinho pode acelerar (${bonusSummary}).`,
    };
  }

  if (hasSpace && stalled && (wineServingBonus ?? 0) === 0) {
    return {
      action: 'increase',
      message: `${freeSpace.toLocaleString('pt-BR')} vagas livres sem crescimento. Serviço de vinho sem bônus de satisfação — aumente na taberna.`,
    };
  }

  if (stalled && !hasSpace) {
    return {
      action: 'reduce',
      message: `Sem crescimento e pouco espaço (${freeSpace} vagas). Vinho (${bonusSummary}) só mantém satisfação — considere reduzir.`,
    };
  }

  if (growth > 0 && hasSpace) {
    const fullIn = hoursUntilFull != null ? formatHoursUntilFull(hoursUntilFull) : null;
    return {
      action: 'maintain',
      message: `Crescimento saudável (+${growth.toFixed(2)}/h${fullIn ? `, cheia em ${fullIn}` : ''}). Vinho (${bonusSummary}) está adequado.`,
    };
  }

  return {
    action: 'maintain',
    message: `Vinho (${bonusSummary}, -${wineSpending}/h) equilibrado com o crescimento atual.`,
  };
}

/** @deprecated Use getWineTavernAdvice */
export type WineReductionAdvice = WineTavernAction;

/** @deprecated Use getWineTavernAdvice */
export function getWineReductionAdvice(details: CityDetails): { level: WineTavernAction; message: string } {
  const advice = getWineTavernAdvice(details);
  return { level: advice.action, message: advice.message };
}
