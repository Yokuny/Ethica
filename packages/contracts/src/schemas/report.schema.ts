import { z } from 'zod';
import type { CaseRole } from './case.schema.js';
import { idSchema } from './id.schema.js';

// Expert report (court expert) or technical opinion (technical assistant, LAU-06).
export const REPORT_TYPES = ['report', 'technical_opinion'] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const reportRoleType = (role: CaseRole): ReportType =>
  role === 'technical_assistant' ? 'technical_opinion' : 'report';

// Editable draft → completed, read-only on the server (AD-126).
export const REPORT_STATUS = ['draft', 'completed'] as const;
export type ReportStatus = (typeof REPORT_STATUS)[number];

// "Yes" text (present/positive) or "no" text (absent/negative) of each section.
export const REPORT_VARIANTS = ['yes', 'no'] as const;
export type ReportVariant = (typeof REPORT_VARIANTS)[number];

// Default templates live in the API code and apply to every tenant (AD-126); the id is fixed.
export const REPORT_DEFAULT_TEMPLATES = {
  report: 'standard-report',
  technical_opinion: 'standard-technical_opinion',
} as const satisfies Record<ReportType, string>;
export const isDefaultTemplate = (id: string): boolean => Object.values<string>(REPORT_DEFAULT_TEMPLATES).includes(id);

// Markers replaced by the case, expert and office data (AD-126).
export const REPORT_VARIABLES = [
  '[NUMERO_PROCESSO]',
  '[TRIBUNAL]',
  '[VARA]',
  '[COMARCA]',
  '[JUSTICA]',
  '[OBJETO]',
  '[NOME_AUTOR]',
  '[NOME_REU]',
  '[DENOMINACAO_AUTOR]',
  '[DENOMINACAO_REU]',
  '[ADVOGADOS_AUTOR]',
  '[ADVOGADOS_REU]',
  '[DATA_NOMEACAO]',
  '[DATA_VISTORIA]',
  '[LOCAL_PERICIA]',
  '[FUNCAO_RECLAMANTE]',
  '[DATA_ADMISSAO]',
  '[DATA_DEMISSAO]',
  '[PERIODO_IMPRESCRITO]',
  '[DATA_EXTENSO]',
  '[PERITO_NOME]',
  '[PERITO_REGISTRO]',
  '[PERITO_FORMACAO]',
  '[ESCRITORIO_NOME]',
  // From the case's last done inspection (AD-130).
  '[HORA_VISTORIA]',
  '[PRESENTES_VISTORIA]',
  '[PARADIGMAS_AUTOR]',
  '[PARADIGMAS_REU]',
  '[FUNCOES_AUTOR]',
  '[FUNCOES_REU]',
  '[AGENTES_PRESENTES]',
  '[AGENTES_AUSENTES]',
  '[DOCUMENTOS_SOLICITADOS]',
] as const;
export type ReportVariable = (typeof REPORT_VARIABLES)[number];

// List markers still present in the text (without a value at resolution).
export const pendingVariables = (html: string): ReportVariable[] =>
  REPORT_VARIABLES.filter((variable) => html.includes(variable));

// Single report HTML allowlist (AD-123): the editor only produces this, the API sanitizes to this
// and PDF and Word know how to draw each of these tags.
export const REPORT_HTML_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
] as const;

// The only image accepted in the report (AD-129): an inspection photo of the same tenant, served by the API.
export const REPORT_IMG_SRC = /^\/inspections\/[0-9a-f]{24}\/media\/[0-9a-f-]{36}$/i;

export const REPORT_LEVEL_MAX = 3;

// Number of each section ("1", "1.1", "2") by position and level; never stored (AD-126).
// A level that skips (1 → 3) counts as the one after the previous.
export const numberSections = (sections: ReadonlyArray<{ level: number }>): string[] => {
  const counters: number[] = [];
  return sections.map(({ level }) => {
    const target = Math.min(Math.max(level, 1), counters.length + 1);
    counters.length = target;
    counters[target - 1] = (counters[target - 1] ?? 0) + 1;
    return counters.join('.');
  });
};

const REPORT_HTML_MAX = 200_000;
export const REPORT_SECTIONS_MAX = 200;

const titleSchema = z.string().trim().min(1, 'título é obrigatório').max(200, 'título muito longo');
const htmlSchema = z.string().max(REPORT_HTML_MAX, 'texto muito longo');
const templateIdSchema = z.union([
  idSchema,
  z.enum([REPORT_DEFAULT_TEMPLATES.report, REPORT_DEFAULT_TEMPLATES.technical_opinion]),
]);

export const createTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'nome é obrigatório').max(120, 'nome muito longo'),
    type: z.enum(REPORT_TYPES),
    // Without a base, the template starts blank; with a base, it clones the sections (default or office).
    baseId: templateIdSchema.optional(),
  })
  .strict();
export type CreateTemplate = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.pick({ name: true }).strict();
export type UpdateTemplate = z.infer<typeof updateTemplateSchema>;

export const templateSectionSchema = z
  .object({
    title: titleSchema,
    level: z.number().int().min(1).max(REPORT_LEVEL_MAX),
    titleOnly: z.boolean(),
    pageBreak: z.boolean(),
    yesText: htmlSchema,
    noText: htmlSchema,
  })
  .strict();
export type TemplateSection = z.infer<typeof templateSectionSchema>;

export const moveSectionSchema = z.object({ direction: z.enum(['up', 'down']) }).strict();
export type MoveSection = z.infer<typeof moveSectionSchema>;

export const createReportSchema = z
  .object({
    caseId: idSchema,
    templateId: templateIdSchema,
    sections: z
      .array(z.object({ id: z.string().min(1).max(40), variant: z.enum(REPORT_VARIANTS) }).strict())
      .min(1, 'escolha ao menos uma seção')
      .max(REPORT_SECTIONS_MAX),
  })
  .strict();
export type CreateReport = z.infer<typeof createReportSchema>;

// Sections of the template in the draft (LMO-01): the same choice as creating; another `templateId` changes the template.
export const chooseReportSectionsSchema = createReportSchema.omit({ caseId: true }).strict();
export type ChooseReportSections = z.infer<typeof chooseReportSectionsSchema>;

export const updateReportSectionSchema = z
  .object({ title: titleSchema.optional(), html: htmlSchema.optional() })
  .strict();
export type UpdateReportSection = z.infer<typeof updateReportSectionSchema>;

// Record the delivery: files the "Entrega do laudo" deadline, posts the `report_filed` movement
// and advances the status to `report_delivered` (AD-126).
export const completeReportSchema = z.object({ recordDelivery: z.boolean() }).strict();
export type CompleteReport = z.infer<typeof completeReportSchema>;
