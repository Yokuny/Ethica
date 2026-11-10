import { describe, expect, it } from 'vitest';
import { periodRange, shiftPeriod } from './period.js';

describe('período do Campo (CPE-01)', () => {
  it('dia, semana de segunda a domingo, mês inteiro e ano inteiro', () => {
    expect(periodRange('day', '2026-11-12')).toEqual({ from: '2026-11-12', to: '2026-11-12' });
    expect(periodRange('week', '2026-11-12')).toEqual({ from: '2026-11-09', to: '2026-11-15' });
    expect(periodRange('month', '2026-02-12')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(periodRange('year', '2026-11-12')).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });

  it('anda um período para trás ou para frente', () => {
    expect(shiftPeriod('day', '2026-11-12', 1)).toBe('2026-11-13');
    expect(shiftPeriod('week', '2026-11-12', -1)).toBe('2026-11-05');
    expect(shiftPeriod('month', '2026-01-31', 1)).toBe('2026-02-28');
    expect(shiftPeriod('year', '2026-11-12', -1)).toBe('2025-11-12');
  });
});
