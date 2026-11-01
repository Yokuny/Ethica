import { z } from 'zod';
import { type COURTTYPES, processNumberSchema } from './case.schema.js';

// Alias do índice da API Pública do Datajud (`api_publica_<alias>`), por justiça.
// Lista dos tribunais atendidos hoje; acrescente aqui para liberar outro tribunal.
export const DATAJUD_COURTS = {
  labor: [
    'trt1',
    'trt2',
    'trt3',
    'trt4',
    'trt5',
    'trt6',
    'trt7',
    'trt8',
    'trt9',
    'trt10',
    'trt11',
    'trt12',
    'trt13',
    'trt14',
    'trt15',
    'trt16',
    'trt17',
    'trt18',
    'trt19',
    'trt20',
    'trt21',
    'trt22',
    'trt23',
    'trt24',
  ],
  federal: ['trf1', 'trf2', 'trf3', 'trf4', 'trf5', 'trf6'],
  civil: [
    'tjac',
    'tjal',
    'tjam',
    'tjap',
    'tjba',
    'tjce',
    'tjdft',
    'tjes',
    'tjgo',
    'tjma',
    'tjmg',
    'tjms',
    'tjmt',
    'tjpa',
    'tjpb',
    'tjpe',
    'tjpi',
    'tjpr',
    'tjrj',
    'tjrn',
    'tjro',
    'tjrr',
    'tjrs',
    'tjsc',
    'tjse',
    'tjsp',
    'tjto',
  ],
} as const satisfies Record<(typeof COURTTYPES)[number], readonly string[]>;
export const ALL_DATAJUD_COURTS = [
  ...DATAJUD_COURTS.labor,
  ...DATAJUD_COURTS.federal,
  ...DATAJUD_COURTS.civil,
] as const;
export type DatajudCourt = (typeof ALL_DATAJUD_COURTS)[number];

// Chaves em inglês (AD-113); o nome do assunto no Datajud fica no client (`providers/datajudClient.ts`).
export const DATAJUD_TECHNICAL_SUBJECTS = ['unhealthy_conditions', 'hazardous_conditions', 'work_accident'] as const;
export type DatajudTechnicalSubject = (typeof DATAJUD_TECHNICAL_SUBJECTS)[number];

// Busca de possíveis nomeações: texto livre nos movimentos/assuntos/classe e
// recorte por órgão julgador. `cursor` é o `sort` do último resultado
// (paginação `search_after` do Elasticsearch do Datajud).
export const datajudSearchSchema = z
  .object({
    court: z.enum(ALL_DATAJUD_COURTS),
    technicalSubjects: z.array(z.enum(DATAJUD_TECHNICAL_SUBJECTS)).max(DATAJUD_TECHNICAL_SUBJECTS.length).optional(),
    termo: z.string().trim().max(120, 'termo inválido').optional(),
    courtUnit: z.string().trim().max(120, 'órgão julgador inválido').optional(),
    processNumber: z
      .string()
      .trim()
      .regex(/^[\d.\-\s]*$/, 'número de processo inválido')
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value === '' || value.length === 20, 'informe os 20 dígitos do processo')
      .transform((value) => value || undefined)
      .optional(),
    caseClassCode: z.number().int().positive().optional(),
    courtUnitCode: z.number().int().positive().optional(),
    size: z.number().int().min(1).max(50).optional(),
    cursor: z
      .array(z.union([z.string(), z.number()]))
      .max(4)
      .optional(),
  })
  .strict();
export type DatajudSearch = z.infer<typeof datajudSearchSchema>;

export const OPPORTUNITY_STATUS = ['new', 'under_review', 'discarded', 'converted'] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUS)[number];

// Processo do Datajud guardado para análise. Os campos vêm do resultado da busca.
export const createOpportunitySchema = z
  .object({
    processNumber: processNumberSchema,
    court: z.enum(ALL_DATAJUD_COURTS),
    caseClass: z.string().trim().max(200).optional(),
    subjects: z.array(z.string().trim().max(200)).max(20).optional(),
    courtUnit: z.string().trim().max(200).optional(),
    filingDate: z.string().max(40).optional(),
    lastMovement: z.string().trim().max(300).optional(),
    lastMovementAt: z.string().max(40).optional(),
  })
  .strict();
export type CreateOpportunity = z.infer<typeof createOpportunitySchema>;

// `convertida` só é alcançada por POST /prospeccao/oportunidades/:id/converter.
export const updateOpportunitySchema = z
  .object({
    status: z.enum(['new', 'under_review', 'discarded']).optional(),
    observacoes: z.string().trim().max(2000).optional(),
  })
  .strict();
export type UpdateOpportunity = z.infer<typeof updateOpportunitySchema>;
