import { type ApiMessageKey, type CreateCase, CSV_IMPORT_FIELDS, type CsvImportField } from '@ethica/contracts';
import { z } from 'zod';

// Field of each spreadsheet column, in order, as checked by the expert (RSV-04): `?fields=a,b,c`.
export const csvImportQuerySchema = z
  .object({
    fields: z
      .string()
      .max(2000)
      .transform((value) => value.split(','))
      .pipe(z.array(z.enum(CSV_IMPORT_FIELDS)))
      .optional(),
  })
  .strict();
export type CsvImportQuery = z.infer<typeof csvImportQuerySchema>;

// Column of the spreadsheet with the suggested field; not `certain` is shown with "!".
export type CsvColumn = { header: string; sample?: string; field: CsvImportField; certain: boolean };

// Draft extracted from the PDF (AD-114): only fills the form, saves nothing.
export type PdfDraft = Partial<CreateCase>;

export type PdfExtraction = {
  draft: PdfDraft;
  // Fields the expert has to fill in (not found in the text).
  missing: (keyof CreateCase)[];
  warnings: ApiMessageKey[];
  // Case already registered with the same number in the tenant.
  existingId?: string;
};

export type CsvImportResult = {
  created: number;
  skipped: { line: number; processNumber: string }[];
  // `column` is the spreadsheet header.
  rejected: { line: number; column?: string; reason: ApiMessageKey }[];
};
