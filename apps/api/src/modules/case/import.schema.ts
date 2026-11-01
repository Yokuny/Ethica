import type { ApiMessageKey, CreateCase, CsvImportColumn } from '@ethica/contracts';

export type { CsvImportColumn };

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
  rejected: { line: number; column?: CsvImportColumn; reason: ApiMessageKey }[];
};
