import { z } from 'zod';
import { type COURTTYPES, processNumberSchema } from './case.schema.js';

// Datajud Public API index alias (`api_publica_<alias>`), by court type.
// List of the courts served today; add here to enable another court.
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

// English keys (AD-113); the subject name on Datajud stays in the client (`providers/datajudClient.ts`).
export const DATAJUD_TECHNICAL_SUBJECTS = ['unhealthy_conditions', 'hazardous_conditions', 'work_accident'] as const;
export type DatajudTechnicalSubject = (typeof DATAJUD_TECHNICAL_SUBJECTS)[number];

// Search for possible nominations: free text over movements/subjects/class and
// a slice by court unit. `cursor` is the `sort` of the last result
// (Datajud Elasticsearch `search_after` pagination).
export const datajudSearchSchema = z
  .object({
    court: z.enum(ALL_DATAJUD_COURTS),
    technicalSubjects: z.array(z.enum(DATAJUD_TECHNICAL_SUBJECTS)).max(DATAJUD_TECHNICAL_SUBJECTS.length).optional(),
    term: z.string().trim().max(120, 'termo inválido').optional(),
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

// Datajud process saved for analysis. The fields come from the search result.
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

// `converted` is only reached through POST /prospecting/opportunities/:id/convert.
export const updateOpportunitySchema = z
  .object({
    status: z.enum(['new', 'under_review', 'discarded']).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();
export type UpdateOpportunity = z.infer<typeof updateOpportunitySchema>;
