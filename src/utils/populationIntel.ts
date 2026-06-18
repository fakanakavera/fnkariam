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
  wineServingBonus: number | null;
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
    wineServingBonus: details.wineServingBonus ?? null,
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

export type WineReductionAdvice = 'safe' | 'caution' | 'avoid' | 'unknown';

export function getWineReductionAdvice(details: CityDetails): {
  level: WineReductionAdvice;
  message: string;
} {
  const snapshot = getPopulationSnapshot(details);
  if (!snapshot) {
    return {
      level: 'unknown',
      message: 'Visite a Câmara Municipal para ver espaço e crescimento.',
    };
  }

  const { freeSpace, growthPerHour, hoursUntilFull, satisfaction, fillPercent } = snapshot;
  const wineSpending = details.wineSpendings || 0;

  if (!wineSpending) {
    return { level: 'safe', message: 'Taberna sem consumo de vinho.' };
  }

  if (growthPerHour == null) {
    return {
      level: 'unknown',
      message: `Espaço: ${freeSpace.toLocaleString('pt-BR')} vagas (${fillPercent.toFixed(0)}% cheia). Abra a Câmara Municipal para ver o crescimento.`,
    };
  }

  if (growthPerHour <= 0) {
    return {
      level: 'safe',
      message: 'Sem crescimento populacional — reduzir vinho não afeta novos cidadãos.',
    };
  }

  if (satisfaction != null && satisfaction <= 0) {
    return {
      level: 'avoid',
      message: 'Satisfação zerada — reduzir vinho pode causar revolta ou parar o crescimento.',
    };
  }

  if (fillPercent >= 98 && hoursUntilFull != null && hoursUntilFull < 48) {
    if (satisfaction != null && satisfaction <= 25) {
      return {
        level: 'caution',
        message: `Quase cheia (${freeSpace} vagas, cheia em ${formatHoursUntilFull(hoursUntilFull)}). Satisfação baixa (${satisfaction}) — reduzir vinho pode parar o crescimento.`,
      };
    }
    return {
      level: 'safe',
      message: `Quase cheia (${freeSpace} vagas). Pode reduzir vinho para desacelerar o crescimento (+${growthPerHour.toFixed(2)}/h).`,
    };
  }

  if (fillPercent >= 90) {
    return {
      level: 'caution',
      message: `${freeSpace} vagas restantes (+${growthPerHour.toFixed(2)}/h). Reduzir vinho desacelera, mas pode afetar produção se precisar de mais trabalhadores.`,
    };
  }

  if (satisfaction != null && satisfaction <= 30) {
    return {
      level: 'avoid',
      message: `Satisfação marginal (${satisfaction}). Crescimento +${growthPerHour.toFixed(2)}/h depende do vinho — evite reduzir agora.`,
    };
  }

  return {
    level: 'caution',
    message: `${freeSpace.toLocaleString('pt-BR')} vagas livres (+${growthPerHour.toFixed(2)}/h). Reduzir vinho é possível se não precisar de mais habitantes.`,
  };
}
