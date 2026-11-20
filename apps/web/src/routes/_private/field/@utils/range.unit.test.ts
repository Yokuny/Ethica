import { describe, expect, it } from 'vitest';
import { rangeLabel, rangeOf } from './range.js';

describe('field range', () => {
  it('orders the two days and cuts at 366 days', () => {
    expect(rangeOf('2026-12-04', '2026-11-28')).toEqual({ from: '2026-11-28', to: '2026-12-04' });
    expect(rangeOf('2026-01-01', '2028-01-01')).toEqual({ from: '2026-01-01', to: '2027-01-01' });
  });

  it('writes one day or both ends', () => {
    expect(rangeLabel('2026-11-20', '2026-11-20')).toBe('20 nov 2026');
    expect(rangeLabel('2026-11-20', '2026-11-26')).toBe('20 nov 2026 – 26 nov 2026');
  });
});
