import { csvLines, downloadFile } from './tableExport.helper.js';

// Downloadable spreadsheet template (IMP-02.1, VAR-02): header + a sample row, `;` and UTF-8 with BOM so
// Excel in pt-BR opens it with accents (AD-115).
export const csvTemplate = <C extends string>(columns: readonly C[], example: Record<C, string>): string =>
  csvLines([[...columns], columns.map((column) => example[column])]);

export function downloadCsvTemplate<C extends string>(
  columns: readonly C[],
  example: Record<C, string>,
  fileName: string,
) {
  downloadFile(new Blob([csvTemplate(columns, example)], { type: 'text/csv;charset=utf-8' }), fileName);
}
