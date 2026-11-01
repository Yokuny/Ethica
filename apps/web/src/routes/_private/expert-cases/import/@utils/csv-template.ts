import { CSV_IMPORT_COLUMNS, CSV_IMPORT_EXAMPLE } from '@ethica/contracts';

// Modelo baixável (IMP-02.1): cabeçalho + uma linha de exemplo, `;` e UTF-8 com BOM para o
// Excel em pt-BR abrir com acentos (AD-115).
const field = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export const csvTemplate = (): string =>
  `﻿${[CSV_IMPORT_COLUMNS.join(';'), CSV_IMPORT_COLUMNS.map((c) => field(CSV_IMPORT_EXAMPLE[c])).join(';')].join('\r\n')}\r\n`;

export function downloadCsvTemplate() {
  const url = URL.createObjectURL(new Blob([csvTemplate()], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo-importacao-pericias.csv';
  link.click();
  URL.revokeObjectURL(url);
}
