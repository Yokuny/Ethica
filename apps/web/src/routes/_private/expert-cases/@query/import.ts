import type { CreateCase, CsvImportColumn } from '@ethica/contracts';
import type { QueryClient, UseMutationOptions } from '@tanstack/react-query';
import { sendFile } from '@/lib/api/client.api.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseKeys } from '@/query/case.js';

// Espelham apps/api/src/modules/pericia/importacao.schema.ts. `warnings` e `reason` são
// chaves de mensagem da API (AD-113), traduzidas na tela.
export type PdfExtraction = {
  draft: Partial<CreateCase>;
  missing: (keyof CreateCase)[];
  warnings: string[];
  existingId?: string;
};

export type CsvImportResult = {
  created: number;
  skipped: { line: number; processNumber: string }[];
  rejected: { line: number; column?: CsvImportColumn; reason: string }[];
};

// PDF da ata/despacho → rascunho do cadastro (AD-114); nada é gravado.
export const importPdfMutation = (): UseMutationOptions<PdfExtraction, Error, File> => ({
  mutationFn: async (file) => {
    const res = await sendFile<PdfExtraction>('/expert-cases/import/pdf', file, 'application/pdf');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
});

// CSV → cria as perícias das linhas válidas e devolve o relatório por linha (AD-115).
export const importCsvMutation = (queryClient: QueryClient): UseMutationOptions<CsvImportResult, Error, File> => ({
  mutationFn: async (file) => {
    const res = await sendFile<CsvImportResult>('/expert-cases/import/csv', file, 'text/csv');
    if (!res.success || !res.data) throw new Error(res.message ?? t('action_error'));
    return res.data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: caseKeys.all });
    queryClient.invalidateQueries({ queryKey: ['list-stats', '/expert-cases/stats'] });
  },
});
