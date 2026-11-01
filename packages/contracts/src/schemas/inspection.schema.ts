import { z } from 'zod';
import { SIDES } from './party.schema.js';

// Registro da vistoria (AD-130): um só tipo para o formulário de campo e para as variáveis do
// laudo, para que o que é gravado seja exatamente o que o laudo lê.

// Agentes do mapeamento de campo, os mesmos do checklist em PDF (DOC-02).
export const INSPECTION_AGENTS = [
  'noise',
  'heat',
  'cold',
  'humidity',
  'chemicals',
  'biological_agents',
  'hazardous',
] as const;
export type InspectionAgent = (typeof INSPECTION_AGENTS)[number];

// Documentos pedidos às partes; além destes, o perito escreve o que precisar.
export const INSPECTION_DOCUMENTS = [
  'risk_program',
  'ltcat',
  'pcmso',
  'ppe_records',
  'ppp',
  'job_description',
] as const;

export const INSPECTION_CAPACITIES = [
  'plaintiff',
  'defendant',
  'plaintiff_lawyer',
  'defendant_lawyer',
  'technical_assistant',
  'witness',
  'other',
] as const;
export type InspectionCapacity = (typeof INSPECTION_CAPACITIES)[number];

export const MEDIA_TYPES = ['photo', 'audio', 'signature'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

// Limites por tipo de mídia (AD-129); tudo conta na cota do escritório (AD-120).
export const INSPECTION_MEDIA_LIMITS: Record<
  MediaType,
  { maxBytes: number; maxByInspection: number; mimes: string[] }
> = {
  photo: { maxBytes: 2 * 1024 * 1024, maxByInspection: 30, mimes: ['image/jpeg'] },
  audio: { maxBytes: 20 * 1024 * 1024, maxByInspection: 10, mimes: ['audio/webm', 'audio/mp4'] },
  signature: { maxBytes: 200 * 1024, maxByInspection: 30, mimes: ['image/png'] },
};

// Mídia tem id gerado no aparelho (AD-128): reenviar a mesma não duplica.
export const mediaIdSchema = z.uuid('id de mídia inválido');

const short = z.string().trim().max(200, 'texto muito longo');
const long = z.string().trim().max(2000, 'texto muito longo');
const itemId = z.string().min(1).max(40);
const year = z.number().int().min(1900).max(2100);
const list = <T extends z.ZodType>(item: T) => z.array(item).max(30, 'itens demais');

const versionJobSchema = z
  .object({ activities: long.optional(), frequency: short.optional(), timeExposure: short.optional() })
  .strict();

export const inspectionDataSchema = z
  .object({
    attendees: list(
      z
        .object({
          id: itemId,
          name: short.min(1, 'nome é obrigatório'),
          capacity: z.enum(INSPECTION_CAPACITIES),
          email: z.email('e-mail inválido').optional(),
          signatureId: mediaIdSchema.optional(),
        })
        .strict(),
    ),
    comparators: list(
      z
        .object({
          id: itemId,
          side: z.enum(SIDES),
          name: short.min(1, 'nome é obrigatório'),
          job: short.optional(),
          period: short.optional(),
          workedTogether: z.boolean().optional(),
        })
        .strict(),
    ),
    jobs: list(
      z
        .object({
          id: itemId,
          title: short.min(1, 'função é obrigatória'),
          yearStart: year.optional(),
          yearEnd: year.optional(),
          location: short.optional(),
          plaintiff: versionJobSchema,
          defendant: versionJobSchema,
        })
        .strict(),
    ),
    agents: list(
      z
        .object({
          agent: z.enum(INSPECTION_AGENTS),
          present: z.enum(['yes', 'no']),
          ppe: short.optional(),
          notes: short.optional(),
        })
        .strict(),
    ),
    documents: list(
      z.object({ id: itemId, document: short.min(1), requested: z.boolean(), notes: short.optional() }).strict(),
    ),
    // Internas: nunca vão ao laudo.
    notes: z.string().trim().max(10_000, 'observações muito longas').optional(),
  })
  .strict();
export type InspectionData = z.infer<typeof inspectionDataSchema>;

export const INSPECTION_EMPTY_DATA: InspectionData = {
  attendees: [],
  comparators: [],
  jobs: [],
  agents: [],
  documents: [],
};

// Salvar o formulário inteiro com a versão que o aparelho conhecia (AD-128).
export const saveInspectionSchema = z.object({ version: z.number().int().min(0), data: inspectionDataSchema }).strict();
export type SaveInspection = z.infer<typeof saveInspectionSchema>;

export const updateMediaSchema = z.object({ caption: short }).strict();
export type UpdateMedia = z.infer<typeof updateMediaSchema>;
