import { z } from 'zod';
import { calendarDateSchema, wallTimeSchema } from './date.schema.js';
import { casePartyInputSchema, documentSchema, emailSchema, phoneSchema } from './party.schema.js';

// Sphere of the service ("Esfera"): only a perícia has one (AD-178).
export const COURTTYPES = ['labor', 'civil', 'federal'] as const;
export type CourtType = (typeof COURTTYPES)[number];

// Service type (AD-310): one of these four, the same value in the database, the API and the URL.
export const SERVICE_TYPES = ['expert_examination', 'technical_assistance', 'partnership', 'private_service'] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

// Service phase (AD-178, AD-196, AD-310): a fixed list per type. "Finalizado" (`finished`) is the last phase of
// every type and closes the service.
export const CASE_PHASE_GROUPS = {
  // `nominated`: the case is under analysis, before accepting or declining the nomination.
  initial: [
    'nominated',
    'nomination_accepted',
    'fee_proposal',
    'document_request',
    'awaiting_scheduling',
    'inspection_scheduled',
    'inspection_done',
  ],
  intermediate: ['drafting_report', 'reviewing_report'],
  losses: ['withdrawal', 'removal', 'settlement'],
  final: ['report_delivered', 'objection_reply', 'objection_return', 'clarifications', 'awaiting_judge'],
  receiving: ['evidence_closed', 'fees_received', 'finished'],
  auxiliary: ['supplement_inspection', 'petition'],
} as const;
export type CasePhaseGroup = keyof typeof CASE_PHASE_GROUPS;
const EXPERT_EXAMINATION_PHASES = Object.values(CASE_PHASE_GROUPS).flat();
// Technical assistance phases (AD-186): a list of its own, in order, without groups.
export const TECHNICAL_ASSISTANCE_PHASES = [
  'assistance_fee_proposal',
  'hired',
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
  'fees_received',
  'assistance_settlement',
  'finished',
] as const;
// Partnership and private service (AD-310).
export const OWN_SERVICE_PHASES = ['hired', 'in_progress', 'delivered', 'fees_received', 'finished'] as const;
export const CASE_PHASES = [
  ...new Set([...EXPERT_EXAMINATION_PHASES, ...TECHNICAL_ASSISTANCE_PHASES, ...OWN_SERVICE_PHASES]),
] as [CasePhase, ...CasePhase[]];
export type CasePhase =
  | (typeof EXPERT_EXAMINATION_PHASES)[number]
  | (typeof TECHNICAL_ASSISTANCE_PHASES)[number]
  | (typeof OWN_SERVICE_PHASES)[number];
export const casePhases = (serviceType: ServiceType): readonly CasePhase[] =>
  serviceType === 'expert_examination'
    ? EXPERT_EXAMINATION_PHASES
    : serviceType === 'technical_assistance'
      ? TECHNICAL_ASSISTANCE_PHASES
      : OWN_SERVICE_PHASES;
// Phase of a new service without one: the first step of its type.
export const defaultPhase = (serviceType: ServiceType): CasePhase =>
  serviceType === 'expert_examination' ? 'awaiting_scheduling' : 'hired';

// Order of the services listing (AD-188, AD-192): registration date (default, no column), or a click on the
// name, type or service order number (AD-190) column.
export const CASE_LIST_SORTS = ['createdAt', 'name', 'type', 'serviceOrder'] as const;
export type CaseListSort = (typeof CASE_LIST_SORTS)[number];
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

// Service status (AD-178), apart from the phase.
export const CASE_STATUS = ['active', 'suspended', 'canceled'] as const;
export type CaseStatus = (typeof CASE_STATUS)[number];
// Closed (AD-178, AD-306, AD-310): canceled, or a loss phase (in the assistance, "Acordo / desistência"), or
// "Finalizado". Fees received do not close a service. Suspended is open but not stalled.
export const CASE_CLOSED_PHASES: readonly CasePhase[] = [
  ...CASE_PHASE_GROUPS.losses,
  'assistance_settlement',
  'finished',
];
// "Situação" filter of the services list (AD-308): open (with work ahead) or closed, by the rule above.
export const CASE_SITUATIONS = ['open', 'closed'] as const;
export type CaseSituation = (typeof CASE_SITUATIONS)[number];
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

// Link of the service folder in OneDrive, Google Drive, Dropbox or another (SPA-01).
const folderUrlSchema = z
  .url({ protocol: /^https?$/, error: 'link inválido' })
  .trim()
  .max(500, 'link inválido');

// Files attached to the service (SPA-03): they count in the tenant quota (AD-120).
export const CASE_ATTACHMENT_LIMIT = {
  maxBytes: 20 * 1024 * 1024,
  maxByCase: 30,
  mimes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
    'application/zip',
    'application/x-zip-compressed',
  ],
};

// Whoever hired a service of the office's own type (AD-176): a field of the service, not a registry party.
export const caseContractorSchema = z
  .object({
    name: z
      .string('nome do contratante é obrigatório')
      .trim()
      .min(1, 'nome do contratante é obrigatório')
      .max(200, 'nome inválido'),
    document: documentSchema.optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    address: optional(z.string().trim().max(300, 'endereço inválido')),
  })
  .strict();
export type CaseContractor = z.infer<typeof caseContractorSchema>;

const caseFields = z.object({
  processNumber: optional(processNumberSchema),
  // Service order control number (NLA-01): given by the office sequence when missing at registration. Upper
  // case, so "ts-1" and "TS-1" are the same number (AD-187).
  serviceOrder: optional(z.string().trim().toUpperCase().max(30, 'OS inválida')),
  courtType: z.enum(COURTTYPES, 'esfera é obrigatória').optional(),
  serviceType: z.enum(SERVICE_TYPES, 'tipo de serviço é obrigatório'),
  phase: z.enum(CASE_PHASES).optional(),
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
  folderUrl: optional(folderUrlSchema),
  // Labor report auxiliary data (IMP-04).
  docketingDate: calendarDateSchema.optional(),
  hireDate: calendarDateSchema.optional(),
  terminationDate: calendarDateSchema.optional(),
  claimantJob: z.string().trim().max(120, 'função inválida').optional(),
  nonPrescribedPeriodStart: calendarDateSchema.optional(),
  nonPrescribedPeriodEnd: calendarDateSchema.optional(),
  location: z.string().trim().max(300, 'endereço inválido').optional(),
});

// The contractor form (AD-176) instead of the process: every type but the perícia (AD-178, AD-310).
export const usesContractor = (data: { serviceType?: ServiceType }): boolean =>
  data.serviceType !== 'expert_examination';

// The phase belongs to the list of the type; a perícia needs the sphere, the process number and the court, and
// no contractor. Checked on the final result when editing.
export const validServiceType = (data: {
  serviceType: ServiceType;
  courtType?: CourtType;
  processNumber?: string;
  court?: string;
  phase?: CasePhase;
  contractor?: CaseContractor;
}): boolean => {
  if (data.phase && !casePhases(data.serviceType).includes(data.phase)) return false;
  if (usesContractor(data)) return true;
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

// `reportDueDate` and `inspection` only exist at registration: they become the "Entrega do laudo"
// deadline (AD-264) and the perícia appointment (AD-160), not case fields.
// Receipt given at registration (AD-176): it becomes a receipt of the fee income, on the payoff date.
export const casePaymentSchema = z
  .object({
    amountCents: z.number().int('valor deve ser inteiro').min(1, 'valor deve ser positivo'),
    date: calendarDateSchema,
  })
  .strict();
export type CasePayment = z.infer<typeof casePaymentSchema>;

// The unrefined shape serves the field-by-field check of the import (`.shape`); the API validates with the refined one.
export const createCaseFieldsSchema = caseFields
  .extend({
    reportDueDate: calendarDateSchema.optional(),
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
export const validContractor = (data: { serviceType?: ServiceType; contractor?: CaseContractor }): boolean =>
  !usesContractor(data) || Boolean(data.contractor?.name);
export const validNominationDate = (data: { serviceType?: ServiceType; nominationDate?: string | null }): boolean =>
  usesContractor(data) || Boolean(data.nominationDate);

// PATCH accepts any subset of the fields + the fee fixed by the court or, in an assistant case, the
// contracted one (AD-135), and the perícia date, which moves the appointment on the agenda (AEV-04).
// `null` clears (AD-177): a field erased on screen.
const clearable = <T extends z.ZodType>(schema: T) => schema.nullable().optional();
export const updateCaseSchema = caseFields
  .partial()
  .extend({
    fixedFeesCents: centsSchema.optional(),
    inspection: caseInspectionSchema.optional(),
    courtType: clearable(caseFields.shape.courtType.unwrap()),
    contractor: clearable(caseContractorSchema),
    folderUrl: optional(folderUrlSchema.nullable()),
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
// service against the final result (type and parties may come in separate requests).
export const validClient = (data: { serviceType?: ServiceType; parties?: Array<{ client?: boolean }> }) => {
  const clients = (data.parties ?? []).filter((party) => party.client).length;
  return clients === 0 || (clients === 1 && data.serviceType === 'technical_assistance');
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
