import { CSV_IMPORT_COLUMNS, CSV_IMPORT_EXAMPLE } from '@ethica/contracts';
import { describe, expect, it } from 'vitest';
import { csvTemplate } from './csvTemplate.helper.js';

describe('csvTemplate (IMP-02.1)', () => {
  it('começa com BOM, traz todas as colunas aceitas e uma linha de exemplo separada por ";"', () => {
    const template = csvTemplate(CSV_IMPORT_COLUMNS, CSV_IMPORT_EXAMPLE);
    expect(template.startsWith('﻿')).toBe(true);
    const [header, example, end] = template.slice(1).split('\r\n');
    expect(header?.split(';')).toEqual([...CSV_IMPORT_COLUMNS]);
    expect(example?.split(';')).toHaveLength(CSV_IMPORT_COLUMNS.length);
    expect(example).toContain('0001234-56.2026.5.02.0001');
    expect(end).toBe('');
  });
});
