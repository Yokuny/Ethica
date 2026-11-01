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

// Fase detalhada (AD-133): opcional, cada uma de uma etapa. As de suspensão cabem em qualquer
// etapa aberta e não mudam a etapa. A situação é derivada, nunca gravada.
export const PERICIA_FASES_POR_ETAPA = {
  appointed: ['awaiting_acceptance_signature'],
  accepted: ['awaiting_site_info', 'scheduling_inspection'],
  inspection: ['awaiting_inspection', 'return_environmental_assessment', 'return_complement_inspection'],
  drafting_report: ['writing_report', 'reviewing_report', 'awaiting_report_approval'],
  report_delivered: ['awaiting_objections'],
  clarifications: [
    'answering_objection',
    'awaiting_objection_reply',
    'awaiting_clarification_approval',
    'awaiting_clarification_reply',
    'awaiting_new_clarifications',
    'awaiting_judge_decision',
    'drafting_petition',
  ],
  completed: ['monitoring_fees', 'fees_received'],
  declined: [],
} as const satisfies Record<PericiaStatus, readonly string[]>;
export const PERICIA_FASES_SUSPENSAO = ['withdrawal', 'removal', 'settlement'] as const;
export const PERICIA_FASES = [
  ...Object.values(PERICIA_FASES_POR_ETAPA).flat(),
  ...PERICIA_FASES_SUSPENSAO,
] as readonly PericiaFase[];
export type PericiaFase =
  | (typeof PERICIA_FASES_POR_ETAPA)[PericiaStatus][number]
  | (typeof PERICIA_FASES_SUSPENSAO)[number];

export const PERICIA_SITUACOES = ['active', 'suspended', 'closed'] as const;
export type PericiaSituacao = (typeof PERICIA_SITUACOES)[number];
export const PERICIA_ETAPAS_ENCERRADAS: readonly PericiaStatus[] = ['completed', 'declined'];

const ehSuspensao = (fase: PericiaFase): boolean => (PERICIA_FASES_SUSPENSAO as readonly string[]).includes(fase);

export const etapaDaFase = (fase: PericiaFase): PericiaStatus | undefined =>
  PERICIA_STATUS.find((status) => (PERICIA_FASES_POR_ETAPA[status] as readonly string[]).includes(fase));

export const faseCabeNaEtapa = (fase: PericiaFase, status: PericiaStatus): boolean =>
  ehSuspensao(fase) ? !PERICIA_ETAPAS_ENCERRADAS.includes(status) : etapaDaFase(fase) === status;

export const situacaoDaPericia = ({ status, fase }: { status: PericiaStatus; fase?: PericiaFase }): PericiaSituacao => {
  if (PERICIA_ETAPAS_ENCERRADAS.includes(status)) return 'closed';
  return fase && ehSuspensao(fase) ? 'suspended' : 'active';
};

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
export const createPericiaSchema = periciaFields
  .extend({ prazoLaudo: calendarDateSchema.optional(), fase: z.enum(PERICIA_FASES).optional() })
  .strict();
export type CreatePericia = z.infer<typeof createPericiaSchema>;

// PATCH aceita qualquer subconjunto dos campos + a etapa, a fase (`null` apaga, AD-133) e o
// honorário fixado pelo juízo ou, na perícia de assistente, o contratado (AD-135).
export const updatePericiaSchema = periciaFields
  .partial()
  .extend({
    status: z.enum(PERICIA_STATUS).optional(),
    fase: z.enum(PERICIA_FASES).nullable().optional(),
    honorariosFixadosCents: centsSchema.optional(),
  })
  .strict();
export type UpdatePericia = z.infer<typeof updatePericiaSchema>;

// Contratante (AD-135): no máximo um, e só na perícia de assistente técnico. Conferido no
// service contra o resultado final (papel e partes podem vir em pedidos separados).
export const contratanteValido = (data: { papel?: PapelPericia; partes?: Array<{ contratante?: boolean }> }) => {
  const contratantes = (data.partes ?? []).filter((parte) => parte.contratante).length;
  return contratantes === 0 || (contratantes === 1 && data.papel === 'technical_assistant');
};

// Movimentações que contam para a perícia parada (AD-121): entrega do laudo, notificação de
// recebimento de honorários e intimação para esclarecimentos ou para laudo complementar.
export const MOVIMENTACAO_TIPOS = [
  'report_filed',
  'fees_notice',
  'clarification_summons',
  'supplementary_report_summons',
] as const;
export type MovimentacaoTipo = (typeof MOVIMENTACAO_TIPOS)[number];

export const createMovimentacaoSchema = z
  .object({
    tipo: z.enum(MOVIMENTACAO_TIPOS),
    data: calendarDateSchema,
    observacoes: z.string().trim().max(500, 'observações inválidas').optional(),
  })
  .strict();
export type CreateMovimentacao = z.infer<typeof createMovimentacaoSchema>;

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
