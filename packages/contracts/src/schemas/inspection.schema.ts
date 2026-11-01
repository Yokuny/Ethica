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

const curto = z.string().trim().max(200, 'texto muito longo');
const longo = z.string().trim().max(2000, 'texto muito longo');
const itemId = z.string().min(1).max(40);
const year = z.number().int().min(1900).max(2100);
const lista = <T extends z.ZodType>(item: T) => z.array(item).max(30, 'itens demais');

const versionJobSchema = z
  .object({ activities: longo.optional(), frequency: curto.optional(), timeExposure: curto.optional() })
  .strict();

export const inspectionDataSchema = z
  .object({
    attendees: lista(
      z
        .object({
          id: itemId,
          nome: curto.min(1, 'nome é obrigatório'),
          capacity: z.enum(INSPECTION_CAPACITIES),
          email: z.email('e-mail inválido').optional(),
          signatureId: mediaIdSchema.optional(),
        })
        .strict(),
    ),
    comparators: lista(
      z
        .object({
          id: itemId,
          side: z.enum(SIDES),
          nome: curto.min(1, 'nome é obrigatório'),
          job: curto.optional(),
          period: curto.optional(),
          workedTogether: z.boolean().optional(),
        })
        .strict(),
    ),
    jobs: lista(
      z
        .object({
          id: itemId,
          titulo: curto.min(1, 'função é obrigatória'),
          yearStart: year.optional(),
          yearEnd: year.optional(),
          local: curto.optional(),
          plaintiff: versionJobSchema,
          defendant: versionJobSchema,
        })
        .strict(),
    ),
    agents: lista(
      z
        .object({
          agent: z.enum(INSPECTION_AGENTS),
          present: z.enum(['yes', 'no']),
          ppe: curto.optional(),
          observacoes: curto.optional(),
        })
        .strict(),
    ),
    documents: lista(
      z.object({ id: itemId, document: curto.min(1), requested: z.boolean(), observacoes: curto.optional() }).strict(),
    ),
    // Internas: nunca vão ao laudo.
    observacoes: z.string().trim().max(10_000, 'observações muito longas').optional(),
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
export const saveInspectionSchema = z.object({ versao: z.number().int().min(0), dados: inspectionDataSchema }).strict();
export type SaveInspection = z.infer<typeof saveInspectionSchema>;

export const updateMediaSchema = z.object({ caption: curto }).strict();
export type UpdateMedia = z.infer<typeof updateMediaSchema>;
