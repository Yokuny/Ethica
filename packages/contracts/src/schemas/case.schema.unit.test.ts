import { describe, expect, it } from 'vitest';
import { suggestNonPrescribedPeriod, validClient } from './case.schema.js';
import { documentSchema, normalizeOab, oabSchema } from './party.schema.js';

describe('sugerirPeriodoImprescrito (AD-115)', () => {
  it('início é o mais recente entre autuação − 5 anos e admissão; fim é a demissão', () => {
    expect(
      suggestNonPrescribedPeriod({
        docketingDate: '2026-03-10',
        hireDate: '2018-02-01',
        terminationDate: '2025-12-20',
      }),
    ).toEqual({ start: '2021-03-10', end: '2025-12-20' });
    expect(
      suggestNonPrescribedPeriod({
        docketingDate: '2026-03-10',
        hireDate: '2023-05-02',
        terminationDate: '2025-12-20',
      }),
    ).toEqual({ start: '2023-05-02', end: '2025-12-20' });
  });

  it('sem demissão vai até a autuação; sem autuação não sugere; 29/02 vira 28/02', () => {
    expect(suggestNonPrescribedPeriod({ docketingDate: '2024-02-29' })).toEqual({
      start: '2019-02-28',
      end: '2024-02-29',
    });
    expect(suggestNonPrescribedPeriod({ hireDate: '2020-01-01' })).toBeUndefined();
  });
});

describe('documento e OAB da parte', () => {
  it('normaliza a OAB em UF + número', () => {
    expect(normalizeOab('OAB/SP 123.456')).toBe('SP123456');
    expect(normalizeOab('123456/sp')).toBe('SP123456');
    expect(oabSchema.parse('')).toBeUndefined();
    expect(oabSchema.safeParse('123').success).toBe(false);
  });

  it('CPF/CNPJ só com dígitos; vazio vira ausente', () => {
    expect(documentSchema.parse('123.456.789-09')).toBe('12345678909');
    expect(documentSchema.parse('12.345.678/0001-95')).toBe('12345678000195');
    expect(documentSchema.parse('')).toBeUndefined();
    expect(documentSchema.safeParse('123').success).toBe(false);
  });
});

describe('contratante do serviço', () => {
  it('contratante: no máximo um e só na perícia de assistente técnico (AD-135)', () => {
    expect(validClient({ role: 'technical_assistant', parties: [{ client: true }, {}] })).toBe(true);
    expect(validClient({ role: 'court_expert', parties: [{ client: true }] })).toBe(false);
    expect(validClient({ role: 'technical_assistant', parties: [{ client: true }, { client: true }] })).toBe(false);
    expect(validClient({ role: 'court_expert', parties: [{}] })).toBe(true);
  });
});
