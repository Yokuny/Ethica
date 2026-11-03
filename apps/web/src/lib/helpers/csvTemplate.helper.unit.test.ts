import { CSV_IMPORT_EXAMPLE, suggestCsvField } from '@ethica/contracts';
import { describe, expect, it } from 'vitest';
import { csvTemplate } from './csvTemplate.helper.js';

describe('csvTemplate (IMP-02.1)', () => {
  it('começa com BOM, traz colunas todas reconhecidas e uma linha de exemplo separada por ";"', () => {
    const columns = Object.keys(CSV_IMPORT_EXAMPLE);
    const template = csvTemplate(columns, CSV_IMPORT_EXAMPLE);
    expect(template.startsWith('﻿')).toBe(true);
    const [header, example, end] = template.slice(1).split('\r\n');
    expect(header?.split(';')).toEqual(columns);
    expect(columns.every((column) => suggestCsvField(column).certain)).toBe(true);
    expect(example?.split(';')).toHaveLength(columns.length);
    expect(example).toContain('0001234-56.2026.5.02.0001');
    expect(end).toBe('');
  });
});
