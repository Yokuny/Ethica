import type { CreateCase, CsvImportField } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { sendFile } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseKeys } from '@/query/case.js';

// Mirror apps/api/src/modules/case/import.schema.ts. `warnings` and `reason` are
// API message keys (AD-113), translated on screen.
export type PdfExtraction = {
  draft: Partial<CreateCase>;
  missing: (keyof CreateCase)[];
  warnings: string[];
  existingId?: string;
};

export type CsvImportResult = {
  created: number;
  skipped: { line: number; processNumber: string }[];
  // `column` is the spreadsheet header.
  rejected: { line: number; column?: string; reason: string }[];
};

// Spreadsheet column with the suggested field (RSV-04); not `certain` shows with "!".
export type CsvColumn = { header: string; sample?: string; field: CsvImportField; certain: boolean };

// Minutes/order PDF → registration draft (AD-114); nothing is saved.
export const importPdfMutation = (): UseMutationOptions<PdfExtraction, Error, File> => ({
  mutationFn: async (file) => {
    const res = await sendFile<PdfExtraction>('/expert-cases/import/pdf', file, 'application/pdf');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
});

// Any spreadsheet (RSV-04): the columns with the suggested field, nothing is saved.
export const csvColumnsMutation = (): UseMutationOptions<CsvColumn[], Error, Blob> => ({
  mutationFn: async (file) => {
    const res = await sendFile<CsvColumn[]>('/expert-cases/import/csv/columns', file, 'text/csv');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
});

// CSV + the field of each column → creates the cases of the valid rows and returns the per-row report (AD-115).
export const importCsvMutation = (
  queryClient: QueryClient,
): UseMutationOptions<CsvImportResult, Error, { file: Blob; fields: CsvImportField[] }> => ({
  mutationFn: async ({ file, fields }) => {
    const res = await sendFile<CsvImportResult>(
      `/expert-cases/import/csv?${new URLSearchParams({ fields: fields.join(',') })}`,
      file,
      'text/csv',
    );
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: caseKeys.all });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
  },
});
