import { describe, expect, it } from 'vitest';
import { conflictingStops, distanceKm, sortByProximity } from './itinerary.js';

const SE = { lat: -23.5503, lng: -46.6339 };
const PAULISTA = { lat: -23.5614, lng: -46.6559 };
const CAMPINAS = { lat: -22.9056, lng: -47.0608 };

describe('rota do dia (AD-131)', () => {
  it('mede a distância em linha reta', () => {
    expect(distanceKm(SE, CAMPINAS)).toBeGreaterThan(80);
    expect(distanceKm(SE, CAMPINAS)).toBeLessThan(90);
  });

  it('ordena pelo vizinho mais próximo e deixa sem coordenada no fim', () => {
    const day = '2026-12-16';
    const items = [
      { id: 'campinas', day, coordinates: CAMPINAS },
      { id: 'sem', day },
      { id: 'paulista', day, coordinates: PAULISTA },
    ];
    expect(sortByProximity(SE, items).map((item) => item.id)).toEqual(['paulista', 'campinas', 'sem']);
  });

  it('segue os dias em ordem e só ordena por proximidade dentro de cada dia', () => {
    const items = [
      { id: 'campinas-17', day: '2026-12-17', coordinates: CAMPINAS },
      { id: 'sem-16', day: '2026-12-16' },
      { id: 'paulista-16', day: '2026-12-16', coordinates: PAULISTA },
      { id: 'se-22', day: '2026-12-22', coordinates: SE },
    ];
    expect(sortByProximity(CAMPINAS, items).map((item) => item.id)).toEqual([
      'paulista-16',
      'sem-16',
      'campinas-17',
      'se-22',
    ]);
  });

  it('aponta a parada marcada antes da anterior', () => {
    expect([...conflictingStops(['2026-11-10T12:00:00Z', '2026-11-10T09:00:00Z', '2026-11-10T15:00:00Z'])]).toEqual([
      1,
    ]);
  });
});
