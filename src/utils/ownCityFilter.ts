import { loadGameState } from './gameStorage';

export async function getOwnCityIdSet(): Promise<Set<number>> {
  const state = await loadGameState();
  const ids = new Set<number>();

  for (const city of state.cities) {
    const id = parseInt(city.id, 10);
    if (!Number.isNaN(id)) ids.add(id);
  }

  return ids;
}

export function isOwnCityId(cityId: number | undefined, ownIds: Set<number>): boolean {
  return cityId != null && !Number.isNaN(cityId) && ownIds.has(cityId);
}

/** Read own-city IDs from the in-game city dropdown when available. */
export function getOwnCityIdsFromPage(): Set<number> {
  const ids = new Set<number>();

  document
    .querySelectorAll('#dropDown_js_citySelectContainer li.ownCity[selectvalue], .dropdownContainer.city_select li.ownCity[selectvalue]')
    .forEach((element) => {
      const id = parseInt(element.getAttribute('selectvalue') || '', 10);
      if (!Number.isNaN(id)) ids.add(id);
    });

  return ids;
}

export async function resolveOwnCityIdSet(): Promise<Set<number>> {
  const fromPage = getOwnCityIdsFromPage();
  if (fromPage.size > 0) return fromPage;
  return getOwnCityIdSet();
}
