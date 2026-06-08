import type { City } from '../types/game';

function parseCoords(coords: string) {
  const match = coords.match(/\[(\d+):(\d+)\]/);
  return match ? { x: parseInt(match[1], 10), y: parseInt(match[2], 10) } : { x: 0, y: 0 };
}

export function cityDistance(a: City, b: City) {
  const from = parseCoords(a.coords);
  const to = parseCoords(b.coords);
  if (from.x === to.x && from.y === to.y) return 0;
  return Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
}
