import { describe, expect, it } from 'vitest';
import { googleMapsSearch, placesQuery, routeMarks, sampleRoute } from './route-places.js';

describe('lugares no trajeto (CDE-04)', () => {
  it('amostra a rota em até 40 pontos, do começo ao fim', () => {
    const path = Array.from({ length: 101 }, (_, index) => ({ lat: index, lng: 0 }));
    const sample = sampleRoute(path);
    expect(sample).toHaveLength(40);
    expect(sample[0]).toEqual({ lat: 0, lng: 0 });
    expect(sample.at(-1)).toEqual({ lat: 100, lng: 0 });
    expect(sampleRoute(path.slice(0, 5))).toHaveLength(5);
  });

  it('meio do caminho e destino para a busca no Google Maps', () => {
    const path = [
      { lat: 0, lng: 0 },
      { lat: 1, lng: 1 },
      { lat: 2, lng: 2 },
    ];
    expect(routeMarks(path)).toEqual({ halfway: { lat: 1, lng: 1 }, destination: { lat: 2, lng: 2 } });
    expect(googleMapsSearch('Posto de combustível', { lat: -23.5, lng: -46.6 })).toBe(
      'https://www.google.com/maps/search/Posto%20de%20combust%C3%ADvel/@-23.5,-46.6,14z',
    );
  });

  it('uma busca ao longo da linha da rota por chave, com os tipos juntos', () => {
    const query = placesQuery(['restaurant', 'fuel_station', 'hotel'], 2, [
      { lat: -23.5, lng: -46.6 },
      { lat: -23.4, lng: -46.5 },
    ]);
    expect(query).toBe(
      '[out:json][timeout:60];(nwr["amenity"~"^(restaurant|fuel)$"](around:2000,-23.50000,-46.60000,-23.40000,-46.50000);' +
        'nwr["tourism"~"^(hotel)$"](around:2000,-23.50000,-46.60000,-23.40000,-46.50000););out center 80;',
    );
  });
});
