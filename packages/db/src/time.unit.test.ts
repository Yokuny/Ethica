import { describe, expect, it } from 'vitest';
import { dateInDisplayTz, timeInDisplayTz, wallClockToUtc } from './time.js';

describe('wallClockToUtc (offset resolvido por Intl, nunca cravado)', () => {
  it('converte 2026-09-15 21:00 (America/Sao_Paulo, default) virando o dia em UTC', () => {
    expect(wallClockToUtc('2026-09-15', '21:00').toISOString()).toBe('2026-09-16T00:00:00.000Z');
  });

  it('timeInDisplayTz/dateInDisplayTz do instante resultante voltam à hora de parede', () => {
    const instant = wallClockToUtc('2026-09-15', '21:00');
    expect(timeInDisplayTz(instant)).toBe('21:00');
    expect(dateInDisplayTz(instant)).toBe('2026-09-15');
  });

  it('não crava -03:00: um fuso explícito (Manaus, UTC-4) resolve seu próprio offset', () => {
    expect(wallClockToUtc('2026-09-15', '08:00', 'America/Manaus').toISOString()).toBe('2026-09-15T12:00:00.000Z');
  });
});
