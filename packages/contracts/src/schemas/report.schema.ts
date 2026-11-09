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
// Order of the reports listing by column click (AD-192); the default is the last change first.
export const REPORT_LIST_SORTS = ['templateName', 'status', 'updatedAt'] as const;
export type ReportListSort = (typeof REPORT_LIST_SORTS)[number];

// "Yes" text (present/positive) or "no" text (absent/negative) of each section.
export const REPORT_VARIANTS = ['yes', 'no'] as const;
export type ReportVariant = (typeof REPORT_VARIANTS)[number];

// Default templates live in the API code and apply to every tenant (AD-126); the id is fixed. The first
// of each type is the one "Novo laudo" suggests (NLA-04).
export const REPORT_DEFAULT_TEMPLATES = {
  'standard-labor-report': 'report',
  'standard-report': 'report',
  'standard-technical_opinion': 'technical_opinion',
  'standard-technical-objection': 'technical_opinion',
} as const satisfies Record<string, ReportType>;
export type DefaultTemplateId = keyof typeof REPORT_DEFAULT_TEMPLATES;
const DEFAULT_TEMPLATE_IDS = Object.keys(REPORT_DEFAULT_TEMPLATES) as [DefaultTemplateId, ...DefaultTemplateId[]];
export const isDefaultTemplate = (id: string): id is DefaultTemplateId => id in REPORT_DEFAULT_TEMPLATES;
export const defaultTemplateOf = (type: ReportType): DefaultTemplateId =>
  DEFAULT_TEMPLATE_IDS.find((id) => REPORT_DEFAULT_TEMPLATES[id] === type) as DefaultTemplateId;

// Markers replaced by the case, expert and office data (AD-126).
export const REPORT_VARIABLES = [
  '[NUMERO_PROCESSO]',
  '[NUMERO_OS]',
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

// The only images accepted in the report (AD-129): an inspection photo or a photo sent in the report
// itself (LMO-05), of the same tenant, served by the API.
export const REPORT_IMG_SRC = /^\/(inspections|expert-reports)\/[0-9a-f]{24}\/media\/[0-9a-f-]{36}$/i;

// Photo sent in the report (LMO-05): JPEG shrunk in the browser, like the inspection one.
export const REPORT_MEDIA_LIMIT = { maxBytes: 2 * 1024 * 1024, maxByReport: 60, mimes: ['image/jpeg'] };

export const REPORT_LEVEL_MAX = 3;

// Number of each section ("1", "1.1", "2") by position and level; never stored (AD-126).
// A level that skips (1 → 3) counts as the one after the previous. A section without number or out of
// the report (NLA-04, NLA-05) gets `''` and does not count.
export const numberSections = (
  sections: ReadonlyArray<{ level: number; unnumbered?: boolean; included?: boolean }>,
): string[] => {
  const counters: number[] = [];
  return sections.map(({ level, unnumbered, included }) => {
    if (unnumbered || included === false) return '';
    const target = Math.min(Math.max(level, 1), counters.length + 1);
    counters.length = target;
    counters[target - 1] = (counters[target - 1] ?? 0) + 1;
    return counters.join('.');
  });
};

// Title as the report shows it, on screen, PDF and Word (AD-174): an item all in capitals, a subitem with the
// first letter in capital and the rest as typed (so acronyms such as NR-15 and PPP stay).
export const sectionTitle = (title: string, level: number): string =>
  level <= 1 ? title.toLocaleUpperCase('pt-BR') : `${title.charAt(0).toLocaleUpperCase('pt-BR')}${title.slice(1)}`;

// Sections tied to the one at `index`: the subsections right below it and the sections above it. Unchecking a
// section takes its subsections along; checking it brings them back and also checks the ones above, so it is
// never numbered under the wrong one.
export const sectionFamily = (
  sections: ReadonlyArray<{ id: string; level: number }>,
  index: number,
): { parents: string[]; children: string[] } => {
  const level = sections[index]?.level ?? 1;
  const children: string[] = [];
  for (let i = index + 1; i < sections.length && (sections[i]?.level ?? 1) > level; i++) {
    children.push((sections[i] as { id: string }).id);
  }
  const parents: string[] = [];
  let current = level;
  for (let i = index - 1; i >= 0 && current > 1; i--) {
    const section = sections[i] as { id: string; level: number };
    if (section.level < current) {
      parents.push(section.id);
      current = section.level;
    }
  }
  return { parents, children };
};

const REPORT_HTML_MAX = 200_000;
export const REPORT_SECTIONS_MAX = 200;

const titleSchema = z.string().trim().min(1, 'título é obrigatório').max(200, 'título muito longo');
const htmlSchema = z.string().max(REPORT_HTML_MAX, 'texto muito longo');
export const templateIdSchema = z.union([idSchema, z.enum(DEFAULT_TEMPLATE_IDS)]);

// Report layout (NLA-06): kept in the template and copied into the report, which can change its own.
export const REPORT_FONTS = ['times', 'arial', 'calibri', 'cambria', 'source_sans'] as const;
export type ReportFont = (typeof REPORT_FONTS)[number];
export const REPORT_LINE_HEIGHTS = [1, 1.15, 1.5, 2] as const;

export const reportLayoutSchema = z
  .object({
    font: z.enum(REPORT_FONTS),
    fontSize: z.number().int().min(10).max(14),
    lineHeight: z
      .number()
      .refine((value) => REPORT_LINE_HEIGHTS.some((height) => height === value), 'entrelinha inválida'),
    // Space after each paragraph, in points.
    paragraphSpacing: z.number().int().min(0).max(24),
    // Page margins in centimeters.
    marginTop: z.number().min(1).max(5),
    marginBottom: z.number().min(1).max(5),
    marginLeft: z.number().min(1).max(5),
    marginRight: z.number().min(1).max(5),
    titleColor: z.string().regex(/^#[0-9a-f]{6}$/i, 'cor inválida'),
    cover: z.boolean(),
    summary: z.boolean(),
    // Page to the judge at the start and "É o laudo." with the signature at the end.
    opening: z.boolean(),
  })
  .strict();
export type ReportLayout = z.infer<typeof reportLayoutSchema>;

export const REPORT_LAYOUT_DEFAULT: ReportLayout = {
  font: 'times',
  fontSize: 12,
  lineHeight: 1.5,
  paragraphSpacing: 8,
  marginTop: 3.4,
  marginBottom: 2.2,
  marginLeft: 3,
  marginRight: 2,
  titleColor: '#111111',
  cover: true,
  summary: true,
  opening: false,
};

export const createTemplateSchema = z
  .object({
    name: z.string().trim().min(1, 'nome é obrigatório').max(120, 'nome muito longo'),
    // What sets the template apart from others of the same NR annex ("limpeza de banheiros", AD-181).
    details: z.string().trim().max(300, 'detalhes muito longos').optional(),
    type: z.enum(REPORT_TYPES),
    // Without a base, the template starts blank; with a base, it clones the sections (default or office).
    baseId: templateIdSchema.optional(),
  })
  .strict();
export type CreateTemplate = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.pick({ name: true, details: true }).strict();
export type UpdateTemplate = z.infer<typeof updateTemplateSchema>;

export const templateSectionSchema = z
  .object({
    title: titleSchema,
    level: z.number().int().min(1).max(REPORT_LEVEL_MAX),
    titleOnly: z.boolean(),
    pageBreak: z.boolean(),
    // Heading without a number ("Objeto da perícia", NLA-04).
    unnumbered: z.boolean(),
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
    // Technical responsible registered by the office (NLA-02); missing = whoever creates the report.
    signatoryId: idSchema.optional(),
    templateId: templateIdSchema,
    sections: z
      .array(z.object({ id: z.string().min(1).max(40), variant: z.enum(REPORT_VARIANTS) }).strict())
      .min(1, 'escolha ao menos uma seção')
      .max(REPORT_SECTIONS_MAX),
  })
  .strict();
export type CreateReport = z.infer<typeof createReportSchema>;

// Sections of the template in the draft (LMO-01): the same choice as creating; another `templateId` changes the template.
export const chooseReportSectionsSchema = createReportSchema.omit({ caseId: true, signatoryId: true }).strict();
export type ChooseReportSections = z.infer<typeof chooseReportSectionsSchema>;

// `included: false` keeps the item and its text in the draft, out of the PDF and Word (NLA-05).
export const updateReportSectionSchema = z
  .object({ title: titleSchema.optional(), html: htmlSchema.optional(), included: z.boolean().optional() })
  .strict();
export type UpdateReportSection = z.infer<typeof updateReportSectionSchema>;

// New item of the report itself (NLA-05): right after `afterId`, or at the start without it.
export const addReportSectionSchema = z
  .object({
    title: titleSchema,
    level: z.number().int().min(1).max(REPORT_LEVEL_MAX),
    afterId: idSchema.optional(),
  })
  .strict();
export type AddReportSection = z.infer<typeof addReportSectionSchema>;

// Technical responsible who signs the report (NLA-02): a registry without access to Ethica. `''` clears.
export const signatorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'nome deve ter entre 3 e 80 caracteres')
      .max(80, 'nome deve ter entre 3 e 80 caracteres'),
    cpf: z
      .string()
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value === '' || /^\d{11}$/.test(value), 'CPF inválido'),
    professionalRegistration: z.string().trim().max(120, 'registro inválido'),
    education: z.string().trim().max(120, 'formação inválida'),
    phone: z.string().trim().max(30, 'telefone inválido'),
    header: z.string().trim().max(1000, 'cabeçalho muito longo'),
    footer: z.string().trim().max(1000, 'rodapé muito longo'),
  })
  .strict();
export type SignatoryInput = z.infer<typeof signatorySchema>;

// Record the delivery: files the "Entrega do laudo" deadline, posts the `report_filed` movement
// and advances the status to `report_delivered` (AD-126).
export const completeReportSchema = z.object({ recordDelivery: z.boolean() }).strict();
export type CompleteReport = z.infer<typeof completeReportSchema>;
