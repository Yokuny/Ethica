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
    const itens = [{ id: 'campinas', coordinates: CAMPINAS }, { id: 'sem' }, { id: 'paulista', coordinates: PAULISTA }];
    expect(sortByProximity(SE, itens).map((item) => item.id)).toEqual(['paulista', 'campinas', 'sem']);
  });

  it('aponta a parada marcada antes da anterior', () => {
    expect([...conflictingStops(['2026-11-10T12:00:00Z', '2026-11-10T09:00:00Z', '2026-11-10T15:00:00Z'])]).toEqual([
      1,
    ]);
  });
});
