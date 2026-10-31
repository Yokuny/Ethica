import type { ApiMessageKey, CreatePericia, CsvImportColumn } from '@ethica/contracts';

export type { CsvImportColumn };

// Rascunho extraído do PDF (AD-114): só preenche o formulário, não grava nada.
export type PdfDraft = Partial<CreatePericia>;

export type PdfExtraction = {
  draft: PdfDraft;
  // Campos que o perito precisa preencher (não achados no texto).
  missing: (keyof CreatePericia)[];
  warnings: ApiMessageKey[];
  // Perícia já cadastrada com o mesmo número no tenant.
  existingId?: string;
};

export type CsvImportResult = {
  created: number;
  skipped: { line: number; numeroProcesso: string }[];
  rejected: { line: number; column?: CsvImportColumn; reason: ApiMessageKey }[];
};
