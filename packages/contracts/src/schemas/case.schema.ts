import { z } from 'zod';
import { calendarDateSchema, wallTimeSchema } from './date.schema.js';
import { casePartyInputSchema, documentSchema, emailSchema, phoneSchema } from './party.schema.js';

// Sphere of the service ("Esfera"): only a perícia has one (AD-178).
export const COURTTYPES = ['labor', 'civil', 'federal'] as const;
export type CourtType = (typeof COURTTYPES)[number];

// `other`: role typed by the office in its own service type (AD-176), named in `Case.roleName`.
export const CASE_ROLES = ['court_expert', 'technical_assistant', 'other'] as const;
export type CaseRole = (typeof CASE_ROLES)[number];
export const JUDICIAL_CASE_ROLES = ['court_expert', 'technical_assistant'] as const;

// Service phase (AD-178): the expert's routine list, in groups and in order. `custom`: phase typed in the
// office's own type, named in `Case.phaseName`.
export const CASE_PHASE_GROUPS = {
  initial: [
    'nomination_accepted',
    'fee_proposal',
    'document_request',
    'awaiting_scheduling',
    'awaiting_report_approval',
    'awaiting_pje_signature',
    'awaiting_site_info',
    'awaiting_inspection',
    'inspection_scheduled',
    'inspection_done',
  ],
  intermediate: ['drafting_report', 'pending_documents', 'reviewing_report'],
  losses: ['withdrawal', 'removal', 'settlement'],
  final: [
    'report_delivered',
    'objection_reply_1',
    'objection_return_1',
    'objection_reply_2',
    'objection_return_2',
    'objection_reply_3',
    'objection_return_3',
    'objection_reply_4',
    'objection_return_4',
    'awaiting_clarification_approval',
    'awaiting_clarification_response',
    'awaiting_new_clarifications',
    'awaiting_judge',
  ],
  receiving: ['evidence_closed', 'fees_received'],
  auxiliary: ['environmental_assessment', 'supplement_inspection', 'petition'],
} as const;
export type CasePhaseGroup = keyof typeof CASE_PHASE_GROUPS;
// Technical assistance phases (AD-186): a list of its own, in order, without groups; "Honorários recebidos" is
// the same phase of the perícia.
const ASSISTANCE_ONLY_PHASES = [
  'assistance_fee_proposal',
  'assistance_hired',
  'case_file_study',
  'alignment_meeting',
  'on_site_inspection',
  'technical_opinion_drafting',
  'technical_opinion_delivered',
  'supplementary_questions',
  'report_objection',
  'complementary_questions',
  'complementary_inspection',
  'extra_stage',
  'assistance_finished',
] as const;
export const TECHNICAL_ASSISTANCE_PHASES = [
  ...ASSISTANCE_ONLY_PHASES,
  'fees_received',
  'assistance_settlement',
] as const;
export const CASE_PHASES = [
  ...Object.values(CASE_PHASE_GROUPS).flat(),
  ...ASSISTANCE_ONLY_PHASES,
  'assistance_settlement',
  'custom',
] as const;
export type CasePhase = (typeof CASE_PHASES)[number];
// The office's own type offers its typed phases and this one of the routine list (AD-178).
export const OWN_TYPE_PHASES: readonly CasePhase[] = ['fees_received'];

// Service status (AD-178), apart from the phase.
export const CASE_STATUS = ['active', 'suspended', 'canceled'] as const;
export type CaseStatus = (typeof CASE_STATUS)[number];
// Closed (AD-178): canceled, or a loss phase, or fees received. Suspended is open but not stalled.
export const CASE_CLOSED_PHASES: readonly CasePhase[] = [
  ...CASE_PHASE_GROUPS.losses,
  'fees_received',
  'assistance_settlement',
];
export const isCaseClosed = (data: { status: CaseStatus; phase: CasePhase }): boolean =>
  data.status === 'canceled' || CASE_CLOSED_PHASES.includes(data.phase);

// CNJ unique number (Resolution 65/2008): NNNNNNN-DD.AAAA.J.TR.OOOO.
export const processNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/, 'número do processo inválido (padrão CNJ)');

const centsSchema = z.number().int('valor deve ser inteiro').min(0, 'valor não pode ser negativo');

// Optional text that the form sends empty: empty is missing (service without a process, AD-158).
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const nameText = (message: string) => z.string().trim().min(1, message).max(80, message);

// Whoever hired a service of the office's own type (AD-176): a field of the service, not a registry party.
export const caseContractorSchema = z
  .object({
    name: z.string().trim().min(1, 'nome do contratante é obrigatório').max(200, 'nome inválido'),
    document: documentSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    address: optional(z.string().trim().max(300, 'endereço inválido')),
  })
  .strict();
export type CaseContractor = z.infer<typeof caseContractorSchema>;

const caseFields = z.object({
  processNumber: optional(processNumberSchema),
  // Service order control number (NLA-01): given by the office sequence when missing at registration.
  serviceOrder: optional(z.string().trim().max(30, 'OS inválida')),
  courtType: z.enum(COURTTYPES, 'esfera é obrigatória').optional(),
  serviceType: z.string().trim().min(1, 'tipo de serviço é obrigatório').max(80, 'tipo de serviço inválido').optional(),
  role: z.enum(CASE_ROLES),
  roleName: nameText('atuação inválida').optional(),
  phase: z.enum(CASE_PHASES).optional(),
  phaseName: nameText('fase inválida').optional(),
  status: z.enum(CASE_STATUS).optional(),
  contractor: caseContractorSchema.optional(),
  court: optional(z.string().trim().min(1, 'tribunal é obrigatório').max(20, 'tribunal inválido')),
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

// The office's own type (AD-158) carries its name; "Perícia" and "Assistência técnica" do not.
export const isOwnType = (data: { serviceType?: string | null }): boolean => Boolean(data.serviceType);
// The contractor form (AD-176) instead of the process: the office's own type and the technical assistance (AD-178).
export const usesContractor = (data: { serviceType?: string | null; role?: CaseRole }): boolean =>
  isOwnType(data) || data.role === 'technical_assistant';

const PERICIA_PHASES: readonly CasePhase[] = Object.values(CASE_PHASE_GROUPS).flat();
// Phases of the routine lists: the perícia one in groups or the technical assistance one (AD-186). The own
// type has its typed phases instead.
export const casePhases = (role?: CaseRole): readonly CasePhase[] =>
  role === 'technical_assistant' ? TECHNICAL_ASSISTANCE_PHASES : PERICIA_PHASES;
// Phase of a new service without one: "Contratado" in the assistance (AD-186), the model default otherwise.
export const defaultPhase = (data: { serviceType?: string | null; role?: CaseRole }): CasePhase | undefined =>
  !isOwnType(data) && data.role === 'technical_assistant' ? 'assistance_hired' : undefined;

// Perícia needs the sphere, the process number and the court; the other types take the contractor. Only the
// own type takes a typed role and a typed phase, with their names; the others, a phase of their list
// (`casePhases`). Checked on the final result when editing.
export const validServiceType = (data: {
  courtType?: CourtType;
  serviceType?: string;
  processNumber?: string;
  court?: string;
  role?: CaseRole;
  roleName?: string;
  phase?: CasePhase;
  phaseName?: string;
  contractor?: CaseContractor;
}): boolean => {
  if ((data.phase === 'custom') !== Boolean(data.phaseName)) return false;
  if (isOwnType(data)) return (data.role === 'other') === Boolean(data.roleName);
  if (data.role === 'other' || data.roleName || data.phase === 'custom') return false;
  if (data.phase && !casePhases(data.role).includes(data.phase)) return false;
  if (data.role === 'technical_assistant') return true;
  return Boolean(data.courtType && data.processNumber && data.court) && !data.contractor;
};

// How a case is named on screen, in e-mails and in file names: the process number or, in a service
// without a process (AD-158), its object.
export const caseLabel = (data: { processNumber?: string; subject: string }): string =>
  data.processNumber ?? data.subject;

// Perícia date at registration (AD-160): becomes an inspection appointment on the agenda. The location
// takes a full address or "lat, long" coordinates.
// Date and time are optional (PSV-03): without a date there is no appointment; with a date, the time is asked.
export const caseInspectionSchema = z
  .object({
    date: optional(calendarDateSchema),
    time: optional(wallTimeSchema),
    location: optional(z.string().trim().max(200, 'local inválido')),
  })
  .strict()
  .refine((value) => !value.date || Boolean(value.time), { message: 'informe a hora da perícia', path: ['time'] });
export type CaseInspection = z.infer<typeof caseInspectionSchema>;

// "lat, long" typed as the location (AD-160); anything else is an address.
export const parseCoordinates = (text: string): { lat: number; lng: number } | undefined => {
  const match = text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,;]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!match) return undefined;
  const [lat, lng] = [Number(match[1]), Number(match[2])];
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : undefined;
};

// `reportDeadline` and `inspection` only exist at registration: they become the "Entrega do laudo"
// deadline (AD-109) and the perícia appointment (AD-160), not case fields.
// The unrefined shape serves `.pick` (opportunity conversion); the API validates with the refined one.
// Receipt given at registration (AD-176): it becomes a receipt of the fee income, on the payoff date.
export const casePaymentSchema = z
  .object({
    amountCents: z.number().int('valor deve ser inteiro').min(1, 'valor deve ser positivo'),
    date: calendarDateSchema,
  })
  .strict();
export type CasePayment = z.infer<typeof casePaymentSchema>;

export const createCaseFieldsSchema = caseFields
  .extend({
    reportDeadline: calendarDateSchema.optional(),
    inspection: caseInspectionSchema.optional(),
    // Fee contracted in the office's own type, and its payment, already at registration (AD-176).
    fixedFeesCents: centsSchema.optional(),
    payment: casePaymentSchema.optional(),
  })
  .strict();
export const createCaseSchema = createCaseFieldsSchema
  .refine((data) => !usesContractor(data) || validServiceType(data), {
    message: 'tipo de serviço inválido',
    path: ['serviceType'],
  })
  .refine((data) => usesContractor(data) || validServiceType(data), {
    message: 'esfera, número do processo e tribunal são obrigatórios',
    path: ['processNumber'],
  })
  .refine((data) => !data.payment || data.payment.amountCents <= (data.fixedFeesCents ?? 0), {
    message: 'valor recebido acima do honorário',
    path: ['payment', 'amountCents'],
  });
export type CreateCase = z.infer<typeof createCaseSchema>;
// The registration form asks for the contractor (AD-176) and, in a perícia, the nomination date (AD-178);
// imports (PDF, CSV) may come without them, so the API accepts them missing.
export const validContractor = (data: {
  serviceType?: string | null;
  role?: CaseRole;
  contractor?: CaseContractor;
}): boolean => !usesContractor(data) || Boolean(data.contractor?.name);
export const validNominationDate = (data: {
  serviceType?: string | null;
  role?: CaseRole;
  nominationDate?: string | null;
}): boolean => usesContractor(data) || Boolean(data.nominationDate);

// PATCH accepts any subset of the fields + the fee fixed by the court or, in an assistant case, the
// contracted one (AD-135), and the perícia date, which moves the appointment on the agenda (AEV-04).
// `null` clears (AD-177): the own type's fields when the service becomes judicial, and a date erased on screen.
const clearable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
export const updateCaseSchema = caseFields
  .partial()
  .extend({
    fixedFeesCents: centsSchema.optional(),
    inspection: caseInspectionSchema.optional(),
    serviceType: clearable(caseFields.shape.serviceType.unwrap()),
    roleName: clearable(caseFields.shape.roleName.unwrap()),
    courtType: clearable(caseFields.shape.courtType.unwrap()),
    phaseName: clearable(caseFields.shape.phaseName.unwrap()),
    contractor: clearable(caseContractorSchema),
    nominationDate: clearable(calendarDateSchema),
    docketingDate: clearable(calendarDateSchema),
    hireDate: clearable(calendarDateSchema),
    terminationDate: clearable(calendarDateSchema),
    nonPrescribedPeriodStart: clearable(calendarDateSchema),
    nonPrescribedPeriodEnd: clearable(calendarDateSchema),
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
