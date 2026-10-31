import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';

// Marcadores do cabeçalho e do rodapé dos documentos (AD-121), trocados na geração do PDF.
export const DOCUMENT_MARKERS = ['[LOGO]', '[NOME_PERITO]', '[PAGINA_ATUAL]', '[TOTAL_PAGINAS]'] as const;

// Logo já reduzido no navegador para PNG de até 600 px (AD-120).
export const TENANT_LOGO_MAX_BYTES = 512 * 1024;
export const TENANT_LOGO_MAX_SIDE = 600;
// Cota de arquivos do escritório no storage (AD-120).
export const TENANT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

// Perícia aberta sem movimentação há mais que isso está parada (AD-121).
export const PERICIA_PARADA_DIAS = 60;

export const updateOfficeSchema = z
  .object({
    cabecalho: z.string().trim().max(1000, 'cabeçalho muito longo'),
    rodape: z.string().trim().max(1000, 'rodapé muito longo'),
  })
  .strict();
export type UpdateOffice = z.infer<typeof updateOfficeSchema>;

// Relatório financeiro de um período (DOC-03): datas inclusivas.
export const financeiroReportQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .strict()
  .refine((value) => value.from <= value.to, { message: 'período inválido', path: ['to'] });
export type FinanceiroReportQuery = z.infer<typeof financeiroReportQuerySchema>;
