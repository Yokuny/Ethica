import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';

export const JUSTICAS = ['trabalhista', 'civel', 'federal'] as const;
export type Justica = (typeof JUSTICAS)[number];

export const PAPEIS_PERICIA = ['perito', 'assistente_tecnico'] as const;
export type PapelPericia = (typeof PAPEIS_PERICIA)[number];

// Etapas da perícia, na ordem do fluxo. `recusada` encerra sem laudo.
export const PERICIA_STATUS = [
  'nomeada',
  'aceita',
  'vistoria',
  'em_laudo',
  'laudo_entregue',
  'esclarecimentos',
  'concluida',
  'recusada',
] as const;
export type PericiaStatus = (typeof PERICIA_STATUS)[number];

// Número único do CNJ (Resolução 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO.
export const numeroProcessoSchema = z
  .string()
  .trim()
  .regex(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, 'número do processo inválido (padrão CNJ)');

const centsSchema = z.number().int('valor deve ser inteiro').min(0, 'valor não pode ser negativo');

const periciaFields = z.object({
  numeroProcesso: numeroProcessoSchema,
  justica: z.enum(JUSTICAS),
  papel: z.enum(PAPEIS_PERICIA),
  tribunal: z.string().trim().min(1, 'tribunal é obrigatório').max(20, 'tribunal inválido'),
  vara: z.string().trim().max(120, 'vara inválida').optional(),
  comarca: z.string().trim().max(120, 'comarca inválida').optional(),
  objeto: z.string().trim().min(1, 'objeto é obrigatório').max(500, 'objeto inválido'),
  autor: z.string().trim().max(200, 'autor inválido').optional(),
  reu: z.string().trim().max(200, 'réu inválido').optional(),
  dataNomeacao: calendarDateSchema.optional(),
  prazoLaudo: calendarDateSchema.optional(),
  honorariosPropostosCents: centsSchema.optional(),
  observacoes: z.string().trim().max(2000, 'observações inválidas').optional(),
});

export const createPericiaSchema = periciaFields.strict();
export type CreatePericia = z.infer<typeof createPericiaSchema>;

// PATCH aceita qualquer subconjunto dos campos + a etapa e o honorário fixado pelo juízo.
export const updatePericiaSchema = periciaFields
  .partial()
  .extend({ status: z.enum(PERICIA_STATUS).optional(), honorariosFixadosCents: centsSchema.optional() })
  .strict();
export type UpdatePericia = z.infer<typeof updatePericiaSchema>;
