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

// Day by day, the earliest day first; inside each day, the nearest neighbor from where the day before ended (the
// origin on the first one). Whoever has no coordinate closes its own day, in the given order.
export const sortByProximity = <T extends { coordinates?: Point; day: string }>(origin: Point, items: T[]): T[] => {
  const order: T[] = [];
  let current = origin;
  for (const day of [...new Set(items.map((item) => item.day))].sort()) {
    const ofDay = items.filter((item) => item.day === day);
    const remaining = ofDay.filter((item) => item.coordinates);
    while (remaining.length) {
      let best = 0;
      remaining.forEach((item, index) => {
        if (
          distanceKm(current, item.coordinates as Point) < distanceKm(current, remaining[best]?.coordinates as Point)
        ) {
          best = index;
        }
      });
      const [next] = remaining.splice(best, 1);
      if (!next) break;
      order.push(next);
      current = next.coordinates as Point;
    }
    order.push(...ofDay.filter((item) => !item.coordinates));
  }
  return order;
};

// A stop scheduled before the previous one in the route order: time conflict.
export const conflictingStops = (starts: string[]): Set<number> =>
  new Set(starts.flatMap((start, index) => (index > 0 && start < (starts[index - 1] as string) ? [index] : [])));
