import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { casePartyInputSchema } from './party.schema.js';

export const COURTTYPES = ['labor', 'civil', 'federal'] as const;
export type CourtType = (typeof COURTTYPES)[number];

export const CASE_ROLES = ['court_expert', 'technical_assistant'] as const;
export type CaseRole = (typeof CASE_ROLES)[number];

// Case statuses, in flow order. `declined` closes without a report.
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

// Detailed phase (AD-133): optional, each one belonging to a status. The suspension ones fit any
// open status and do not change the status. The state is derived, never stored.
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

// CNJ unique number (Resolution 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO.
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
  // Plaintiff, defendant and the lawyers of each side, linked to the party registry (AD-117).
  parties: z.array(casePartyInputSchema).max(30, 'partes demais').optional(),
  nominationDate: calendarDateSchema.optional(),
  proposedFeesCents: centsSchema.optional(),
  notes: z.string().trim().max(2000, 'observações inválidas').optional(),
  // Labor report auxiliary data (IMP-04).
  docketingDate: calendarDateSchema.optional(),
  hireDate: calendarDateSchema.optional(),
  terminationDate: calendarDateSchema.optional(),
  claimantJob: z.string().trim().max(120, 'função inválida').optional(),
  nonPrescribedPeriodStart: calendarDateSchema.optional(),
  nonPrescribedPeriodEnd: calendarDateSchema.optional(),
  location: z.string().trim().max(300, 'endereço inválido').optional(),
});

// `reportDeadline` only exists at registration: it becomes the "Entrega do laudo" deadline (AD-109), not a case field.
export const createCaseSchema = caseFields
  .extend({ reportDeadline: calendarDateSchema.optional(), phase: z.enum(CASE_PHASES).optional() })
  .strict();
export type CreateCase = z.infer<typeof createCaseSchema>;

// PATCH accepts any subset of the fields + the status, the phase (`null` clears it, AD-133) and the
// fee fixed by the court or, in an assistant case, the contracted one (AD-135).
export const updateCaseSchema = caseFields
  .partial()
  .extend({
    status: z.enum(CASE_STATUS).optional(),
    phase: z.enum(CASE_PHASES).nullable().optional(),
    fixedFeesCents: centsSchema.optional(),
  })
  .strict();
export type UpdateCase = z.infer<typeof updateCaseSchema>;

// Client (AD-135): at most one, and only in a technical assistant case. Checked in the
// service against the final result (role and parties may come in separate requests).
export const validClient = (data: { role?: CaseRole; parties?: Array<{ client?: boolean }> }) => {
  const clients = (data.parties ?? []).filter((party) => party.client).length;
  return clients === 0 || (clients === 1 && data.role === 'technical_assistant');
};

// Movements that count for the stalled case (AD-121): report delivery, fee
// receipt notice and summons for clarifications or for a supplementary report.
export const MOVEMENT_TYPES = [
  'report_filed',
  'fees_notice',
  'clarification_summons',
  'supplementary_report_summons',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const createMovementSchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES),
    date: calendarDateSchema,
    notes: z.string().trim().max(500, 'observações inválidas').optional(),
  })
  .strict();
export type CreateMovement = z.infer<typeof createMovementSchema>;

// Suggested non-prescribed period (AD-115): from the latest of (docketing − 5 years) and the
// hire date up to the termination; without termination, up to the docketing. Without docketing, no suggestion.
export const suggestNonPrescribedPeriod = (dates: {
  docketingDate?: string;
  hireDate?: string;
  terminationDate?: string;
}): { start: string; end: string } | undefined => {
  const { docketingDate, hireDate, terminationDate } = dates;
  if (!docketingDate) return undefined;
  const [year, month, day] = docketingDate.split('-');
  const fiveYearsBefore = `${Number(year) - 5}-${month}-${month === '02' && day === '29' ? '28' : day}`;
  const start = hireDate && hireDate > fiveYearsBefore ? hireDate : fiveYearsBefore;
  return { start, end: terminationDate ?? docketingDate };
};
