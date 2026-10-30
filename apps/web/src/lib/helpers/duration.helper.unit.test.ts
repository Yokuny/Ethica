import { describe, expect, it } from 'vitest';
import { formatDuration } from './duration.helper.js';

describe('formatDuration', () => {
  it('escolhe minutos, horas e dias nas bordas sem confundir ausência com zero', () => {
    expect(formatDuration(0)).toBe('0 minutos');
    expect(formatDuration(30_000)).toBe('0,5 minutos');
    expect(formatDuration(59 * 60_000)).toBe('59 minutos');
    expect(formatDuration(60 * 60_000)).toBe('1 hora');
    expect(formatDuration(23 * 3600_000)).toBe('23 horas');
    expect(formatDuration(24 * 3600_000)).toBe('1 dia');
    expect(formatDuration(3 * 86400000)).toBe('3 dias');
    expect(formatDuration(1.5 * 86400000)).toBe('1,5 dias');
    expect(formatDuration(86_400_016.5)).toBe('1 dia');
  });
  it('não transforma duração inválida em zero', () => {
    expect(formatDuration(-1)).toBe('Indisponível');
    expect(formatDuration(Number.NaN)).toBe('Indisponível');
  });
});
