import { describe, expect, it } from 'vitest';
import { documentoSchema, normalizarOab, oabSchema } from './parte.schema.js';
import { sugerirPeriodoImprescrito } from './pericia.schema.js';

describe('sugerirPeriodoImprescrito (AD-115)', () => {
  it('início é o mais recente entre autuação − 5 anos e admissão; fim é a demissão', () => {
    expect(
      sugerirPeriodoImprescrito({ dataAutuacao: '2026-03-10', dataAdmissao: '2018-02-01', dataDemissao: '2025-12-20' }),
    ).toEqual({ inicio: '2021-03-10', fim: '2025-12-20' });
    expect(
      sugerirPeriodoImprescrito({ dataAutuacao: '2026-03-10', dataAdmissao: '2023-05-02', dataDemissao: '2025-12-20' }),
    ).toEqual({ inicio: '2023-05-02', fim: '2025-12-20' });
  });

  it('sem demissão vai até a autuação; sem autuação não sugere; 29/02 vira 28/02', () => {
    expect(sugerirPeriodoImprescrito({ dataAutuacao: '2024-02-29' })).toEqual({
      inicio: '2019-02-28',
      fim: '2024-02-29',
    });
    expect(sugerirPeriodoImprescrito({ dataAdmissao: '2020-01-01' })).toBeUndefined();
  });
});

describe('documento e OAB da parte', () => {
  it('normaliza a OAB em UF + número', () => {
    expect(normalizarOab('OAB/SP 123.456')).toBe('SP123456');
    expect(normalizarOab('123456/sp')).toBe('SP123456');
    expect(oabSchema.parse('')).toBeUndefined();
    expect(oabSchema.safeParse('123').success).toBe(false);
  });

  it('CPF/CNPJ só com dígitos; vazio vira ausente', () => {
    expect(documentoSchema.parse('123.456.789-09')).toBe('12345678909');
    expect(documentoSchema.parse('12.345.678/0001-95')).toBe('12345678000195');
    expect(documentoSchema.parse('')).toBeUndefined();
    expect(documentoSchema.safeParse('123').success).toBe(false);
  });
});
