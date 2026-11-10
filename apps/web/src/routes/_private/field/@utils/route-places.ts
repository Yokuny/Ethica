import type { Point } from './itinerary.js';

// Kinds of place on the route (CDE-04) and their OpenStreetMap tags.
export const PLACE_KINDS = {
  restaurant: '["amenity"="restaurant"]',
  hotel: '["tourism"="hotel"]',
  guest_house: '["tourism"="guest_house"]',
  tire_shop: '["shop"="tyres"]',
  car_repair: '["shop"="car_repair"]',
} as const;
export type PlaceKind = keyof typeof PLACE_KINDS;

export type Place = { id: string; name: string; point: Point; address?: string };

const RADIUS_METERS = 2_000;
const SAMPLES = 20;

// Up to SAMPLES points spread along the route, so the query covers the whole way without one per vertex.
export const sampleRoute = (path: Point[]): Point[] => {
  if (path.length <= SAMPLES) return path;
  const step = (path.length - 1) / (SAMPLES - 1);
  return Array.from({ length: SAMPLES }, (_, index) => path[Math.round(index * step)] as Point);
};

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Public Overpass API (OpenStreetMap, no key, AD-213): places of the kind within RADIUS_METERS of the route.
export const findPlaces = async (kind: PlaceKind, path: Point[]): Promise<Place[]> => {
  const around = sampleRoute(path)
    .map((point) => `nwr${PLACE_KINDS[kind]}(around:${RADIUS_METERS},${point.lat},${point.lng});`)
    .join('');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: new URLSearchParams({ data: `[out:json][timeout:60];(${around});out center 60;` }),
  });
  if (!res.ok) throw new Error('overpass');
  const body = (await res.json()) as { elements?: OverpassElement[] };
  return (body.elements ?? []).flatMap((element) => {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const tags = element.tags ?? {};
    if (lat === undefined || lng === undefined || !tags.name) return [];
    const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ');
    return [
      { id: `${element.type}${element.id}`, name: tags.name, point: { lat, lng }, ...(address ? { address } : {}) },
    ];
  });
};
