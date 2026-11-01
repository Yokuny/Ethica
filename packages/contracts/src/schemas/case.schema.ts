import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { casePartyInputSchema } from './party.schema.js';

export const COURTTYPES = ['labor', 'civil', 'federal'] as const;
export type CourtType = (typeof COURTTYPES)[number];

export const CASE_ROLES = ['court_expert', 'technical_assistant'] as const;
export type CaseRole = (typeof CASE_ROLES)[number];

// Etapas da perícia, na ordem do fluxo. `recusada` encerra sem laudo.
export const CASE_STATUS = [
  'appointed',
  'accepted',
  'inspection',
  'drafting_report',
  'report_delivered',
  'clarifications',
  'completed',
  'declined',
] as const;
export type CaseStatus = (typeof CASE_STATUS)[number];

// Fase detalhada (AD-133): opcional, cada uma de uma etapa. As de suspensão cabem em qualquer
// etapa aberta e não mudam a etapa. A situação é derivada, nunca gravada.
export const CASE_PHASES_BY_STATUS = {
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
} as const satisfies Record<CaseStatus, readonly string[]>;
export const CASE_PHASES_SUSPENSION = ['withdrawal', 'removal', 'settlement'] as const;
export const CASE_PHASES = [
  ...Object.values(CASE_PHASES_BY_STATUS).flat(),
  ...CASE_PHASES_SUSPENSION,
] as readonly CasePhase[];
export type CasePhase = (typeof CASE_PHASES_BY_STATUS)[CaseStatus][number] | (typeof CASE_PHASES_SUSPENSION)[number];

export const CASE_STATES = ['active', 'suspended', 'closed'] as const;
export type CaseState = (typeof CASE_STATES)[number];
export const CASE_CLOSED_STATUSES: readonly CaseStatus[] = ['completed', 'declined'];

const isSuspension = (phase: CasePhase): boolean => (CASE_PHASES_SUSPENSION as readonly string[]).includes(phase);

export const phaseStatus = (phase: CasePhase): CaseStatus | undefined =>
  CASE_STATUS.find((status) => (CASE_PHASES_BY_STATUS[status] as readonly string[]).includes(phase));

export const phaseFitsInStatus = (phase: CasePhase, status: CaseStatus): boolean =>
  isSuspension(phase) ? !CASE_CLOSED_STATUSES.includes(status) : phaseStatus(phase) === status;

export const caseState = ({ status, phase }: { status: CaseStatus; phase?: CasePhase }): CaseState => {
  if (CASE_CLOSED_STATUSES.includes(status)) return 'closed';
  return phase && isSuspension(phase) ? 'suspended' : 'active';
};

// Número único do CNJ (Resolução 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO.
export const processNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, 'número do processo inválido (padrão CNJ)');

const centsSchema = z.number().int('valor deve ser inteiro').min(0, 'valor não pode ser negativo');

const caseFields = z.object({
  processNumber: processNumberSchema,
  courtType: z.enum(COURTTYPES),
  role: z.enum(CASE_ROLES),
  court: z.string().trim().min(1, 'tribunal é obrigatório').max(20, 'tribunal inválido'),
  division: z.string().trim().max(120, 'vara inválida').optional(),
  district: z.string().trim().max(120, 'comarca inválida').optional(),
  subject: z.string().trim().min(1, 'objeto é obrigatório').max(500, 'objeto inválido'),
  // Autor, réu e advogados de cada polo, ligados ao cadastro de partes (AD-117).
  parties: z.array(casePartyInputSchema).max(30, 'partes demais').optional(),
  nominationDate: calendarDateSchema.optional(),
  proposedFeesCents: centsSchema.optional(),
  observacoes: z.string().trim().max(2000, 'observações inválidas').optional(),
  // Dados auxiliares do laudo trabalhista (IMP-04).
  docketingDate: calendarDateSchema.optional(),
  hireDate: calendarDateSchema.optional(),
  terminationDate: calendarDateSchema.optional(),
  claimantJob: z.string().trim().max(120, 'função inválida').optional(),
  nonPrescribedPeriodStart: calendarDateSchema.optional(),
  nonPrescribedPeriodEnd: calendarDateSchema.optional(),
  location: z.string().trim().max(300, 'endereço inválido').optional(),
});

// `prazoLaudo` só existe no cadastro: vira o prazo "Entrega do laudo" (AD-109), não é campo da perícia.
export const createCaseSchema = caseFields
  .extend({ reportDeadline: calendarDateSchema.optional(), phase: z.enum(CASE_PHASES).optional() })
  .strict();
export type CreateCase = z.infer<typeof createCaseSchema>;

// PATCH aceita qualquer subconjunto dos campos + a etapa, a fase (`null` apaga, AD-133) e o
// honorário fixado pelo juízo ou, na perícia de assistente, o contratado (AD-135).
export const updateCaseSchema = caseFields
  .partial()
  .extend({
    status: z.enum(CASE_STATUS).optional(),
    phase: z.enum(CASE_PHASES).nullable().optional(),
    fixedFeesCents: centsSchema.optional(),
  })
  .strict();
export type UpdateCase = z.infer<typeof updateCaseSchema>;

// Contratante (AD-135): no máximo um, e só na perícia de assistente técnico. Conferido no
// service contra o resultado final (papel e partes podem vir em pedidos separados).
export const validClient = (data: { role?: CaseRole; parties?: Array<{ client?: boolean }> }) => {
  const clients = (data.parties ?? []).filter((party) => party.client).length;
  return clients === 0 || (clients === 1 && data.role === 'technical_assistant');
};

// Movimentações que contam para a perícia parada (AD-121): entrega do laudo, notificação de
// recebimento de honorários e intimação para esclarecimentos ou para laudo complementar.
export const MOVEMENT_TYPES = [
  'report_filed',
  'fees_notice',
  'clarification_summons',
  'supplementary_report_summons',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const createMovementSchema = z
  .object({
    tipo: z.enum(MOVEMENT_TYPES),
    data: calendarDateSchema,
    observacoes: z.string().trim().max(500, 'observações inválidas').optional(),
  })
  .strict();
export type CreateMovement = z.infer<typeof createMovementSchema>;

// Período imprescrito sugerido (AD-115): do mais recente entre (autuação − 5 anos) e a
// admissão até a demissão; sem demissão, até a autuação. Sem autuação, sem sugestão.
export const suggestNonPrescribedPeriod = (datas: {
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
}): { inicio: string; fim: string } | undefined => {
  const { docketingDate, hireDate, terminationDate } = datas;
  if (!docketingDate) return undefined;
  const [ano, mes, dia] = docketingDate.split('-');
  const cincoAnosAntes = `${Number(ano) - 5}-${mes}-${mes === '02' && dia === '29' ? '28' : dia}`;
  const inicio = hireDate && hireDate > cincoAnosAntes ? hireDate : cincoAnosAntes;
  return { inicio, fim: terminationDate ?? docketingDate };
};
