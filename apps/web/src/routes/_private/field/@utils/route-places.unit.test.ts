import { describe, expect, it } from 'vitest';
import { sampleRoute } from './route-places.js';

describe('lugares no trajeto (CDE-04)', () => {
  it('amostra a rota em até 20 pontos, do começo ao fim', () => {
    const path = Array.from({ length: 101 }, (_, index) => ({ lat: index, lng: 0 }));
    const sample = sampleRoute(path);
    expect(sample).toHaveLength(20);
    expect(sample[0]).toEqual({ lat: 0, lng: 0 });
    expect(sample.at(-1)).toEqual({ lat: 100, lng: 0 });
    expect(sampleRoute(path.slice(0, 5))).toHaveLength(5);
  });
});
