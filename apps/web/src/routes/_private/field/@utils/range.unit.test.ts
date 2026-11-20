import { describe, expect, it } from 'vitest';
import { rangeDays, rangeLabel } from './range.js';

describe('field range', () => {
  it('counts both ends', () => {
    expect(rangeDays('2026-11-20', '2026-11-20')).toBe(1);
    expect(rangeDays('2026-11-28', '2026-12-04')).toBe(7);
  });

  it('writes one day or both ends', () => {
    expect(rangeLabel('2026-11-20', '2026-11-20')).toBe('20 nov 2026');
    expect(rangeLabel('2026-11-20', '2026-11-26')).toBe('20 nov 2026 – 26 nov 2026');
  });
});
