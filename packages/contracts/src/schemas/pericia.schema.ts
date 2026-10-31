import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { periciaParteInputSchema } from './parte.schema.js';

export const JUSTICAS = ['labor', 'civil', 'federal'] as const;
export type Justica = (typeof JUSTICAS)[number];

export const PAPEIS_PERICIA = ['court_expert', 'technical_assistant'] as const;
export type PapelPericia = (typeof PAPEIS_PERICIA)[number];

// Etapas da perícia, na ordem do fluxo. `recusada` encerra sem laudo.
export const PERICIA_STATUS = [
  'appointed',
  'accepted',
  'inspection',
  'drafting_report',
  'report_delivered',
  'clarifications',
  'completed',
  'declined',
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
  // Autor, réu e advogados de cada polo, ligados ao cadastro de partes (AD-117).
  partes: z.array(periciaParteInputSchema).max(30, 'partes demais').optional(),
  dataNomeacao: calendarDateSchema.optional(),
  honorariosPropostosCents: centsSchema.optional(),
  observacoes: z.string().trim().max(2000, 'observações inválidas').optional(),
  // Dados auxiliares do laudo trabalhista (IMP-04).
  dataAutuacao: calendarDateSchema.optional(),
  dataAdmissao: calendarDateSchema.optional(),
  dataDemissao: calendarDateSchema.optional(),
  funcaoReclamante: z.string().trim().max(120, 'função inválida').optional(),
  periodoImprescritoInicio: calendarDateSchema.optional(),
  periodoImprescritoFim: calendarDateSchema.optional(),
  localPericia: z.string().trim().max(300, 'endereço inválido').optional(),
});

// `prazoLaudo` só existe no cadastro: vira o prazo "Entrega do laudo" (AD-109), não é campo da perícia.
export const createPericiaSchema = periciaFields.extend({ prazoLaudo: calendarDateSchema.optional() }).strict();
export type CreatePericia = z.infer<typeof createPericiaSchema>;

// PATCH aceita qualquer subconjunto dos campos + a etapa e o honorário fixado pelo juízo.
export const updatePericiaSchema = periciaFields
  .partial()
  .extend({ status: z.enum(PERICIA_STATUS).optional(), honorariosFixadosCents: centsSchema.optional() })
  .strict();
export type UpdatePericia = z.infer<typeof updatePericiaSchema>;

// Período imprescrito sugerido (AD-115): do mais recente entre (autuação − 5 anos) e a
// admissão até a demissão; sem demissão, até a autuação. Sem autuação, sem sugestão.
export const sugerirPeriodoImprescrito = (datas: {
  dataAutuacao?: string;
  dataAdmissao?: string;
  dataDemissao?: string;
}): { inicio: string; fim: string } | undefined => {
  const { dataAutuacao, dataAdmissao, dataDemissao } = datas;
  if (!dataAutuacao) return undefined;
  const [ano, mes, dia] = dataAutuacao.split('-');
  const cincoAnosAntes = `${Number(ano) - 5}-${mes}-${mes === '02' && dia === '29' ? '28' : dia}`;
  const inicio = dataAdmissao && dataAdmissao > cincoAnosAntes ? dataAdmissao : cincoAnosAntes;
  return { inicio, fim: dataDemissao ?? dataAutuacao };
};
