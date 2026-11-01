import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';

// Document header and footer markers (AD-121), replaced when the PDF is generated.
export const DOCUMENT_MARKERS = ['[LOGO]', '[NOME_PERITO]', '[PAGINA_ATUAL]', '[TOTAL_PAGINAS]'] as const;

// Logo already shrunk in the browser to a PNG of up to 600 px (AD-120).
export const TENANT_LOGO_MAX_BYTES = 512 * 1024;
export const TENANT_LOGO_MAX_SIDE = 600;
// Office file quota in storage (AD-120).
export const TENANT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

// An open case without movement for longer than this is stalled (AD-121).
export const STALLED_CASE_DAYS = 60;

export const updateOfficeSchema = z
  .object({
    header: z.string().trim().max(1000, 'cabeçalho muito longo'),
    footer: z.string().trim().max(1000, 'rodapé muito longo'),
  })
  .strict();
export type UpdateOffice = z.infer<typeof updateOfficeSchema>;

// Finance report for a period (DOC-03): inclusive dates.
export const financeReportQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .strict()
  .refine((value) => value.from <= value.to, { message: 'período inválido', path: ['to'] });
export type FinanceReportQuery = z.infer<typeof financeReportQuerySchema>;

// Schedule notice to the parties by e-mail (AD-131): markers replaced when sending.
export const SCHEDULE_NOTICE_MARKERS = [
  '[TIPO_EVENTO]',
  '[DATA]',
  '[HORA]',
  '[ENDERECO]',
  '[NUMERO_PROCESSO]',
  '[NOME_PERITO]',
  '[VARA]',
  '[COMARCA]',
] as const;

export const updateScheduleNoticeSchema = z
  .object({
    subject: z.string().trim().min(1, 'assunto é obrigatório').max(200, 'assunto muito longo'),
    body: z.string().trim().min(1, 'texto é obrigatório').max(4000, 'texto muito longo'),
  })
  .strict();
export type UpdateScheduleNotice = z.infer<typeof updateScheduleNoticeSchema>;
