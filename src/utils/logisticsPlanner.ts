import type { ResourceKey } from '../types/buildings';
import type { City } from '../types/game';
import { cityDistance } from './cityDistance';
import { getResourceProduction, getResourceStock } from './resourceUtils';

export interface LogisticsRoute {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  boats: number;
}

interface Supplier {
  city: City;
  available: number;
}

interface Demander {
  city: City;
  current: number;
  safe: number;
  neededToSafe: number;
  finalAllocated: number;
}

export function calculateLogisticsRoutes(
  cities: City[],
  resource: ResourceKey,
  sourceIds: string[],
  destinationIds: string[],
  minTransport: number,
): LogisticsRoute[] {
  const suppliers: Supplier[] = [];
  const demanders: Demander[] = [];

  cities.forEach((city) => {
    if (!city.details) return;

    const current = getResourceStock(city, resource);
    const safe = city.details.safeResources || 0;
    const production = getResourceProduction(city, resource);

    if (sourceIds.includes(city.id)) {
      const reserve = resource === 'wine' ? (city.details.wineSpendings || 0) * 2 : 0;
      const available = current - safe - reserve;
      if (available > 0) suppliers.push({ city, available });
    }

    if (destinationIds.includes(city.id)) {
      demanders.push({
        city,
        current,
        safe,
        neededToSafe: Math.max(0, safe - current),
        finalAllocated: 0,
      });
    }
  });

  const totalAvailable = suppliers.reduce((sum, item) => sum + item.available, 0);
  const totalNeeded = demanders.reduce((sum, item) => sum + item.neededToSafe, 0);

  if (totalAvailable > 0 && demanders.length > 0) {
    if (totalAvailable <= totalNeeded) {
      const weights = demanders.map((item) => {
        if (resource === 'wine') return item.city.details?.wineSpendings || 1;
        return getResourceProduction(item.city, resource) || 1;
      });
      const totalWeight = weights.reduce((sum, value) => sum + value, 0);
      demanders.forEach((item, index) => {
        const share = weights[index] / totalWeight;
        item.finalAllocated = Math.min(item.neededToSafe, totalAvailable * share);
      });
    } else {
      demanders.forEach((item) => {
        item.finalAllocated = item.neededToSafe;
      });
      const surplus = totalAvailable - totalNeeded;
      const weights = demanders.map((item) => getResourceProduction(item.city, resource) || 1);
      const totalWeight = weights.reduce((sum, value) => sum + value, 0);
      demanders.forEach((item, index) => {
        const share = weights[index] / totalWeight;
        item.finalAllocated += surplus * share;
      });
    }
  }

  const result: LogisticsRoute[] = [];
  const supplierPool = suppliers.map((item) => ({ ...item }));
  const demanderPool = demanders.filter((item) => item.finalAllocated > 0).map((item) => ({ ...item }));

  supplierPool.forEach((supplier) => {
    demanderPool.sort((a, b) => cityDistance(supplier.city, a.city) - cityDistance(supplier.city, b.city));

    for (const demander of demanderPool) {
      if (supplier.available <= 0 || demander.finalAllocated <= 0) continue;

      let amount = Math.min(supplier.available, demander.finalAllocated);
      if (amount > 500) {
        const remainder = amount % 500;
        if (remainder > 0 && amount - remainder >= 500) amount -= remainder;
      }

      if (amount >= minTransport) {
        result.push({
          fromId: supplier.city.id,
          fromName: supplier.city.name,
          toId: demander.city.id,
          toName: demander.city.name,
          amount: Math.floor(amount),
          boats: Math.ceil(amount / 500),
        });
        supplier.available -= amount;
        demander.finalAllocated -= amount;
      }
    }
  });

  return result;
}
