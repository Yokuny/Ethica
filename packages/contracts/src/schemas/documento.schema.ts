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
export const STALLED_CASE_DAYS = 60;

export const updateOfficeSchema = z
  .object({
    cabecalho: z.string().trim().max(1000, 'cabeçalho muito longo'),
    rodape: z.string().trim().max(1000, 'rodapé muito longo'),
  })
  .strict();
export type UpdateOffice = z.infer<typeof updateOfficeSchema>;

// Relatório financeiro de um período (DOC-03): datas inclusivas.
export const financeReportQuerySchema = z
  .object({ from: calendarDateSchema, to: calendarDateSchema })
  .strict()
  .refine((value) => value.from <= value.to, { message: 'período inválido', path: ['to'] });
export type FinanceReportQuery = z.infer<typeof financeReportQuerySchema>;

// Aviso de agendamento às partes por e-mail (AD-131): marcadores trocados no envio.
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
    assunto: z.string().trim().min(1, 'assunto é obrigatório').max(200, 'assunto muito longo'),
    corpo: z.string().trim().min(1, 'texto é obrigatório').max(4000, 'texto muito longo'),
  })
  .strict();
export type UpdateScheduleNotice = z.infer<typeof updateScheduleNoticeSchema>;
