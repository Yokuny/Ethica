import { z } from 'zod';
import { type JUSTICAS, numeroProcessoSchema } from './pericia.schema.js';

// Alias do índice da API Pública do Datajud (`api_publica_<alias>`), por justiça.
// Lista dos tribunais atendidos hoje; acrescente aqui para liberar outro tribunal.
export const DATAJUD_TRIBUNAIS = {
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
} as const satisfies Record<(typeof JUSTICAS)[number], readonly string[]>;
export const ALL_DATAJUD_TRIBUNAIS = [
  ...DATAJUD_TRIBUNAIS.labor,
  ...DATAJUD_TRIBUNAIS.federal,
  ...DATAJUD_TRIBUNAIS.civil,
] as const;
export type DatajudTribunal = (typeof ALL_DATAJUD_TRIBUNAIS)[number];

// Chaves em inglês (AD-113); o nome do assunto no Datajud fica no client (`providers/datajudClient.ts`).
export const DATAJUD_ASSUNTOS_TECNICOS = ['unhealthy_conditions', 'hazardous_conditions', 'work_accident'] as const;
export type DatajudAssuntoTecnico = (typeof DATAJUD_ASSUNTOS_TECNICOS)[number];

// Busca de possíveis nomeações: texto livre nos movimentos/assuntos/classe e
// recorte por órgão julgador. `cursor` é o `sort` do último resultado
// (paginação `search_after` do Elasticsearch do Datajud).
export const datajudSearchSchema = z
  .object({
    tribunal: z.enum(ALL_DATAJUD_TRIBUNAIS),
    assuntosTecnicos: z.array(z.enum(DATAJUD_ASSUNTOS_TECNICOS)).max(DATAJUD_ASSUNTOS_TECNICOS.length).optional(),
    termo: z.string().trim().max(120, 'termo inválido').optional(),
    orgaoJulgador: z.string().trim().max(120, 'órgão julgador inválido').optional(),
    numeroProcesso: z
      .string()
      .trim()
      .regex(/^[\d.\-\s]*$/, 'número de processo inválido')
      .transform((value) => value.replace(/\D/g, ''))
      .refine((value) => value === '' || value.length === 20, 'informe os 20 dígitos do processo')
      .transform((value) => value || undefined)
      .optional(),
    classeCodigo: z.number().int().positive().optional(),
    orgaoJulgadorCodigo: z.number().int().positive().optional(),
    size: z.number().int().min(1).max(50).optional(),
    cursor: z
      .array(z.union([z.string(), z.number()]))
      .max(4)
      .optional(),
  })
  .strict();
export type DatajudSearch = z.infer<typeof datajudSearchSchema>;

export const OPORTUNIDADE_STATUS = ['new', 'under_review', 'discarded', 'converted'] as const;
export type OportunidadeStatus = (typeof OPORTUNIDADE_STATUS)[number];

// Processo do Datajud guardado para análise. Os campos vêm do resultado da busca.
export const createOportunidadeSchema = z
  .object({
    numeroProcesso: numeroProcessoSchema,
    tribunal: z.enum(ALL_DATAJUD_TRIBUNAIS),
    classe: z.string().trim().max(200).optional(),
    assuntos: z.array(z.string().trim().max(200)).max(20).optional(),
    orgaoJulgador: z.string().trim().max(200).optional(),
    dataAjuizamento: z.string().max(40).optional(),
    ultimoMovimento: z.string().trim().max(300).optional(),
    ultimoMovimentoEm: z.string().max(40).optional(),
  })
  .strict();
export type CreateOportunidade = z.infer<typeof createOportunidadeSchema>;

// `convertida` só é alcançada por POST /prospeccao/oportunidades/:id/converter.
export const updateOportunidadeSchema = z
  .object({
    status: z.enum(['new', 'under_review', 'discarded']).optional(),
    observacoes: z.string().trim().max(2000).optional(),
  })
  .strict();
export type UpdateOportunidade = z.infer<typeof updateOportunidadeSchema>;
