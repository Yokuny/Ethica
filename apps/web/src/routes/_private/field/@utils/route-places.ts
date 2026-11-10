import type { Point } from './itinerary.js';

// Kinds of support on the route (CDE-04) and their OpenStreetMap tag.
export const PLACE_KINDS = {
  restaurant: ['amenity', 'restaurant'],
  hotel: ['tourism', 'hotel'],
  guest_house: ['tourism', 'guest_house'],
  tire_shop: ['shop', 'tyres'],
  car_repair: ['shop', 'car_repair'],
  fuel_station: ['amenity', 'fuel'],
} as const;
export type PlaceKind = keyof typeof PLACE_KINDS;
export const PLACE_KIND_LIST = Object.keys(PLACE_KINDS) as PlaceKind[];

// How far from the route, in km.
export const PLACE_RADII = [1, 2, 5] as const;

export type Place = { id: string; kind: PlaceKind; name: string; point: Point; address?: string };

const SAMPLES = 40;

// Up to SAMPLES points spread along the route, so the query covers the whole way without one per vertex.
export const sampleRoute = (path: Point[]): Point[] => {
  if (path.length <= SAMPLES) return path;
  const step = (path.length - 1) / (SAMPLES - 1);
  return Array.from({ length: SAMPLES }, (_, index) => path[Math.round(index * step)] as Point);
};

// Halfway point of the route and its end (the last stop), for the Google Maps search links.
export const routeMarks = (path: Point[]): { halfway?: Point; destination?: Point } => ({
  halfway: path[Math.floor(path.length / 2)],
  destination: path.at(-1),
});

export const googleMapsSearch = (term: string, point: Point): string =>
  `https://www.google.com/maps/search/${encodeURIComponent(term)}/@${point.lat},${point.lng},14z`;

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const kindOf = (tags: Record<string, string>, kinds: PlaceKind[]): PlaceKind | undefined =>
  kinds.find((kind) => tags[PLACE_KINDS[kind][0]] === PLACE_KINDS[kind][1]);

// Public Overpass API (OpenStreetMap, no key, AD-213) and a mirror for when it is busy or limiting.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

// One query along the route line per tag key (at most three), instead of one per point and kind (AD-214).
export const placesQuery = (kinds: PlaceKind[], radiusKm: number, path: Point[]): string => {
  const line = sampleRoute(path)
    .map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`)
    .join(',');
  const byKey = new Map<string, string[]>();
  for (const kind of kinds) {
    const [key, value] = PLACE_KINDS[kind];
    byKey.set(key, [...(byKey.get(key) ?? []), value]);
  }
  const clauses = [...byKey]
    .map(([key, values]) => `nwr["${key}"~"^(${values.join('|')})$"](around:${radiusKm * 1_000},${line});`)
    .join('');
  return `[out:json][timeout:60];(${clauses});out center 80;`;
};

const overpass = async (data: string): Promise<{ elements?: OverpassElement[] }> => {
  for (const url of OVERPASS) {
    // A busy server gives up after 45 s and the next one is tried.
    const res = await fetch(url, {
      method: 'POST',
      body: new URLSearchParams({ data }),
      signal: AbortSignal.timeout(45_000),
    }).catch(() => undefined);
    if (res?.ok) return res.json();
  }
  throw new Error('overpass');
};

// Places of the chosen kinds within `radiusKm` of the route.
export const findPlaces = async (kinds: PlaceKind[], radiusKm: number, path: Point[]): Promise<Place[]> => {
  const body = await overpass(placesQuery(kinds, radiusKm, path));
  return (body.elements ?? []).flatMap((element) => {
    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    const tags = element.tags ?? {};
    const kind = kindOf(tags, kinds);
    if (lat === undefined || lng === undefined || !tags.name || !kind) return [];
    const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:city']].filter(Boolean).join(', ');
    return [
      {
        id: `${element.type}${element.id}`,
        kind,
        name: tags.name,
        point: { lat, lng },
        ...(address ? { address } : {}),
      },
    ];
  });
};
