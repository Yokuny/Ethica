// Day itinerary (AD-131): pure functions, no map or network.
export type Point = { lat: number; lng: number };

const RADIUS_EARTH_KM = 6371;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

// Straight-line distance (Haversine), in km.
export const distanceKm = (a: Point, b: Point): number => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIUS_EARTH_KM * Math.asin(Math.sqrt(h));
};

// Nearest neighbor from the origin; whoever has no coordinate goes to the end, in the given order.
export const sortByProximity = <T extends { coordinates?: Point }>(origin: Point, items: T[]): T[] => {
  const remaining = items.filter((item) => item.coordinates);
  const order: T[] = [];
  let current = origin;
  while (remaining.length) {
    let best = 0;
    remaining.forEach((item, index) => {
      if (distanceKm(current, item.coordinates as Point) < distanceKm(current, remaining[best]?.coordinates as Point)) {
        best = index;
      }
    });
    const [next] = remaining.splice(best, 1);
    if (!next) break;
    order.push(next);
    current = next.coordinates as Point;
  }
  return [...order, ...items.filter((item) => !item.coordinates)];
};

// A stop scheduled before the previous one in the route order: time conflict.
export const conflictingStops = (starts: string[]): Set<number> =>
  new Set(starts.flatMap((start, index) => (index > 0 && start < (starts[index - 1] as string) ? [index] : [])));
