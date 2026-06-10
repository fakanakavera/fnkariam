import type { ResourceKey } from '../types/buildings';
import type { City } from '../types/game';
import { cityDistance } from './cityDistance';
import { getSupplierAvailable, getResourceStock } from './resourceUtils';

export type CalculationMode = 'equalize' | 'fillSafe';

export interface LogisticsRoute {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  boats: number;
}

const CARGO_SIZE = 500;

interface Supplier {
  city: City;
  available: number;
}

interface Demander {
  city: City;
  current: number;
  safe: number;
  spending: number;
  finalAllocated: number;
}

function computeEqualizeAllocations(demanders: Demander[], totalAvailable: number) {
  const active = demanders.filter((item) => item.spending > 0);
  if (active.length === 0 || totalAvailable <= 0) return;

  const computeNeed = (targetHours: number) =>
    active.reduce((sum, item) => sum + Math.max(0, item.spending * targetHours - item.current), 0);

  let low = 0;
  let high = 1;
  while (computeNeed(high) < totalAvailable) {
    high *= 2;
  }

  for (let step = 0; step < 64; step += 1) {
    const mid = (low + high) / 2;
    if (computeNeed(mid) < totalAvailable) low = mid;
    else high = mid;
  }

  active.forEach((item) => {
    item.finalAllocated = Math.max(0, item.spending * low - item.current);
  });
}

function computeFillSafeAllocations(demanders: Demander[], totalAvailable: number) {
  if (totalAvailable <= 0 || demanders.length === 0) return;

  demanders.forEach((item) => {
    item.finalAllocated = 0;
  });

  let remaining = totalAvailable;

  const belowSafe = demanders
    .filter((item) => item.current < item.safe)
    .sort((a, b) => b.safe - b.current - (a.safe - a.current));

  for (const item of belowSafe) {
    if (remaining <= 0) break;
    const need = item.safe - item.current;
    const allocation = Math.min(need, remaining);
    item.finalAllocated = allocation;
    remaining -= allocation;
  }

  if (remaining <= 0) return;

  const aboveSafe = demanders.filter((item) => item.current > item.safe);
  const surplusTarget =
    aboveSafe.length > 0
      ? aboveSafe.reduce((best, item) => (item.current - item.safe > best.current - best.safe ? item : best))
      : demanders.reduce((best, item) => (item.current > best.current ? item : best));

  surplusTarget.finalAllocated += remaining;
}

export function calculateLogisticsRoutes(
  cities: City[],
  resource: ResourceKey,
  sourceIds: string[],
  destinationIds: string[],
  minTransport: number,
  calculationMode: CalculationMode,
): LogisticsRoute[] {
  const suppliers: Supplier[] = [];
  const demanders: Demander[] = [];

  cities.forEach((city) => {
    if (!city.details) return;

    const current = getResourceStock(city, resource);
    const safe = city.details.safeResources || 0;
    const spending = resource === 'wine' ? city.details.wineSpendings || 0 : 0;

    if (sourceIds.includes(city.id)) {
      const available = getSupplierAvailable(city, resource);
      if (available > 0) suppliers.push({ city, available });
    }

    if (destinationIds.includes(city.id)) {
      demanders.push({
        city,
        current,
        safe,
        spending,
        finalAllocated: 0,
      });
    }
  });

  const totalAvailable = suppliers.reduce((sum, item) => sum + item.available, 0);

  if (totalAvailable > 0 && demanders.length > 0) {
    if (calculationMode === 'equalize') {
      if (resource === 'wine') {
        computeEqualizeAllocations(demanders, totalAvailable);
      } else {
        computeFillSafeAllocations(demanders, totalAvailable);
      }
    } else {
      computeFillSafeAllocations(demanders, totalAvailable);
    }
  }

  const result: LogisticsRoute[] = [];
  const supplierPool = suppliers.map((item) => ({ ...item }));
  const demanderPool = demanders.filter((item) => item.finalAllocated > 0).map((item) => ({ ...item }));

  supplierPool.forEach((supplier) => {
    demanderPool.sort((a, b) => cityDistance(supplier.city, a.city) - cityDistance(supplier.city, b.city));

    for (const demander of demanderPool) {
      if (supplier.available <= 0 || demander.finalAllocated <= 0) continue;

      let amount = Math.floor(Math.min(supplier.available, demander.finalAllocated));

      if (amount >= minTransport) {
        result.push({
          fromId: supplier.city.id,
          fromName: supplier.city.name,
          toId: demander.city.id,
          toName: demander.city.name,
          amount: amount,
          boats: Math.ceil(amount / CARGO_SIZE),
        });
        supplier.available -= amount;
        demander.finalAllocated -= amount;
      }
    }
  });

  return result;
}
