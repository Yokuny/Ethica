import { describe, expect, it } from 'vitest';
import { splitCents, travelCost } from './travel-cost.js';

describe('custo de deslocamento (CDE-02, CDE-03)', () => {
  it('combustível pela média do veículo mais pedágios, e custo por km', () => {
    expect(travelCost({ km: 120, kmPerLiter: 12, fuelPriceCents: 599, tollsCents: 2_500 })).toEqual({
      liters: 10,
      fuelCents: 5_990,
      totalCents: 8_490,
      perKmCents: 71,
    });
    expect(travelCost({ km: 0, kmPerLiter: 0, fuelPriceCents: 599, tollsCents: 0 }).totalCents).toBe(0);
  });

  it('divide em partes iguais e o centavo que sobra fica na primeira', () => {
    expect(splitCents(1_000, 3)).toEqual([334, 333, 333]);
    expect(splitCents(1_000, 1)).toEqual([1_000]);
    expect(splitCents(1_000, 0)).toEqual([]);
  });
});
