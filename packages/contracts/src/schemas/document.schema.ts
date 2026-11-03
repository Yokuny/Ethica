import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { REPORT_FONTS } from './report.schema.js';

// Document header and footer markers (AD-121), replaced when the PDF is generated.
export const DOCUMENT_MARKERS = ['[LOGO]', '[NOME_PERITO]', '[PAGINA_ATUAL]', '[TOTAL_PAGINAS]'] as const;

// Logo already shrunk in the browser to a PNG of up to 600 px (AD-120).
export const TENANT_LOGO_MAX_BYTES = 512 * 1024;
export const TENANT_LOGO_MAX_SIDE = 600;
// Office file quota in storage (AD-120).
export const TENANT_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

// An open case without movement for longer than this is stalled (AD-121).
export const STALLED_CASE_DAYS = 60;

// Font, size (pt) and alignment of the header or the footer, in PDF and Word (AD-172).
export const TEXT_ALIGNMENTS = ['left', 'center', 'right'] as const;
export const documentTextStyleSchema = z
  .object({
    font: z.enum(REPORT_FONTS),
    fontSize: z.number().min(6).max(16),
    align: z.enum(TEXT_ALIGNMENTS),
  })
  .strict();
export type DocumentTextStyle = z.infer<typeof documentTextStyleSchema>;
export const DOCUMENT_TEXT_STYLE_DEFAULT: DocumentTextStyle = { font: 'arial', fontSize: 8.5, align: 'center' };

export const updateOfficeSchema = z
  .object({
    header: z.string().trim().max(1000, 'cabeçalho muito longo'),
    footer: z.string().trim().max(1000, 'rodapé muito longo'),
    headerStyle: documentTextStyleSchema,
    footerStyle: documentTextStyleSchema,
  })
  .strict();
export type UpdateOffice = z.infer<typeof updateOfficeSchema>;

// Service order sequence of the office (NLA-01): `pattern` with markers, `last` the last number already
// used (0 when the sequence starts now). With `[ANO]` in the pattern the number goes back to 1 in January;
// without it the number never restarts, so it does not repeat (AD-172).
export const SERVICE_ORDER_MARKERS = ['[SIGLA]', '[ANO]', '[NUMERO]'] as const;
export const SERVICE_ORDER_PATTERN_DEFAULT = '[SIGLA]-[ANO]-[NUMERO]';
export const serviceOrderSettingsSchema = z
  .object({
    pattern: z
      .string()
      .trim()
      .max(40, 'padrão muito longo')
      .refine((value) => value.includes('[NUMERO]'), 'o padrão precisa do [NUMERO]'),
    prefix: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9]{0,10}$/, 'sigla inválida'),
    digits: z.number().int().min(1).max(6),
    year: z.number().int().min(2000).max(2100),
    last: z.number().int().min(0).max(999_999),
  })
  .strict()
  .refine((value) => value.prefix || !value.pattern.includes('[SIGLA]'), {
    message: 'sigla é obrigatória',
    path: ['prefix'],
  });
export type ServiceOrderSettings = z.infer<typeof serviceOrderSettingsSchema>;

export const formatServiceOrder = ({ pattern, prefix, digits, year, last }: ServiceOrderSettings): string =>
  pattern
    .replaceAll('[SIGLA]', prefix)
    .replaceAll('[ANO]', String(year))
    .replaceAll('[NUMERO]', String(last).padStart(digits, '0'));

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
