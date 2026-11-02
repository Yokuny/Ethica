// Downloadable spreadsheet template (IMP-02.1, VAR-02): header + a sample row, `;` and UTF-8 with BOM so
// Excel in pt-BR opens it with accents (AD-115).
const field = (value: string) => (/[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

export const csvTemplate = <C extends string>(columns: readonly C[], example: Record<C, string>): string =>
  `﻿${[columns.join(';'), columns.map((c) => field(example[c])).join(';')].join('\r\n')}\r\n`;

export function downloadCsvTemplate<C extends string>(
  columns: readonly C[],
  example: Record<C, string>,
  fileName: string,
) {
  const url = URL.createObjectURL(new Blob([csvTemplate(columns, example)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
