import { CSV_IMPORT_COLUMNS } from '@ethica/contracts';
import { describe, expect, it } from 'vitest';
import { csvTemplate } from './csv-template.js';

describe('csvTemplate (IMP-02.1)', () => {
  it('começa com BOM, traz todas as colunas aceitas e uma linha de exemplo separada por ";"', () => {
    const template = csvTemplate();
    expect(template.startsWith('﻿')).toBe(true);
    const [header, exemplo, fim] = template.slice(1).split('\r\n');
    expect(header?.split(';')).toEqual([...CSV_IMPORT_COLUMNS]);
    expect(exemplo?.split(';')).toHaveLength(CSV_IMPORT_COLUMNS.length);
    expect(exemplo).toContain('0001234-56.2026.5.02.0001');
    expect(fim).toBe('');
  });
});
