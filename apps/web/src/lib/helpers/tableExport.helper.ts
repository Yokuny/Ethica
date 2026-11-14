import { formatDateTime } from './formatDate.helper.js';

// Download of a list (CSV, Excel or PDF) built in the browser from the rows of the screen or of every page of
// the current filters. Excel and PDF load their library only on the click.
export type TableExportFormat = 'csv' | 'xlsx' | 'pdf';

// One column of the file: the header and the cell as text (dates and amounts already formatted).
export type TableExportColumn<T> = { header: string; value: (row: T) => string | undefined };

const csvField = (value: string) => (/[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

// `;` and UTF-8 with BOM so Excel in pt-BR opens it with accents (AD-115).
export const csvLines = (lines: string[][]): string =>
  `﻿${lines.map((line) => line.map(csvField).join(';')).join('\r\n')}\r\n`;

export function downloadFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportTable<T>(
  format: TableExportFormat,
  title: string,
  columns: TableExportColumn<T>[],
  rows: T[],
) {
  const head = columns.map((column) => column.header);
  const body = rows.map((row) => columns.map((column) => column.value(row) ?? ''));
  const fileName = `${title}.${format}`;
  if (format === 'csv') {
    downloadFile(new Blob([csvLines([head, ...body])], { type: 'text/csv;charset=utf-8' }), fileName);
    return;
  }
  if (format === 'xlsx') {
    const { default: writeExcelFile } = await import('write-excel-file/browser');
    const header = head.map((value) => ({ value, fontWeight: 'bold' as const }));
    // Excel limits the sheet name to 31 characters.
    await writeExcelFile([header, ...body], { sheet: title.slice(0, 31), stickyRowsCount: 1 }).toFile(fileName);
    return;
  }
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(formatDateTime(new Date()), 40, 56);
  autoTable(doc, {
    head: [head],
    body,
    startY: 70,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [244, 244, 245], textColor: 20, fontStyle: 'bold' },
  });
  downloadFile(doc.output('blob'), fileName);
}
