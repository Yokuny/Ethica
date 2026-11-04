import { z } from 'zod';
import { calendarDateSchema, wallTimeSchema } from './date.schema.js';
import { casePartyInputSchema, documentSchema, emailSchema, phoneSchema } from './party.schema.js';

export const JUDICIAL_COURT_TYPES = ['labor', 'civil', 'federal'] as const;
export type JudicialCourtType = (typeof JUDICIAL_COURT_TYPES)[number];
// `other`: service type created by the office (AD-158), named in `Case.serviceType`; it may have no process.
export const COURTTYPES = [...JUDICIAL_COURT_TYPES, 'other'] as const;
export type CourtType = (typeof COURTTYPES)[number];

// `other`: role typed by the office in its own service type (AD-176), named in `Case.roleName`.
export const CASE_ROLES = ['court_expert', 'technical_assistant', 'other'] as const;
export type CaseRole = (typeof CASE_ROLES)[number];
export const JUDICIAL_CASE_ROLES = ['court_expert', 'technical_assistant'] as const;

// Service status (RSV-03), one list in the order of the expert's routine: it replaces the stage, the
// detailed phase and the service status of AD-133/AD-158. `suspended` pauses (settlement, withdrawal,
// removal); `declined` closes without a report.
export const CASE_STATUS = [
  'appointed',
  'fees_proposed',
  'fees_accepted',
  'inspection_scheduled',
  'drafting_report',
  'report_delivered',
  'clarifications',
  'awaiting_payment',
  'completed',
  'suspended',
  'declined',
  // Status typed by the office in its own service type (AD-176), named in `Case.statusName`; counts as open.
  'custom',
] as const;
export type CaseStatus = (typeof CASE_STATUS)[number];
// The office's own type offers only these of the routine list (AD-176); the other statuses are typed.
export const OWN_TYPE_STATUSES: readonly CaseStatus[] = ['completed', 'declined'];
export const CASE_CLOSED_STATUSES: readonly CaseStatus[] = ['completed', 'declined'];
// Not counted as stalled: closed or paused on purpose.
export const CASE_IDLE_STATUSES: readonly CaseStatus[] = [...CASE_CLOSED_STATUSES, 'suspended'];

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
  courtType: z.enum(COURTTYPES),
  serviceType: z.string().trim().min(1, 'tipo de serviço é obrigatório').max(80, 'tipo de serviço inválido').optional(),
  role: z.enum(CASE_ROLES),
  roleName: nameText('atuação inválida').optional(),
  status: z.enum(CASE_STATUS).optional(),
  statusName: nameText('status inválido').optional(),
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

// Process number and court are required except in a service type created by the office, which is
// the only one carrying a name (AD-158), a typed role or status and a contractor (AD-176). Checked on the
// final result in the service when editing.
export const validServiceType = (data: {
  courtType?: CourtType;
  serviceType?: string;
  processNumber?: string;
  court?: string;
  role?: CaseRole;
  roleName?: string;
  status?: CaseStatus;
  statusName?: string;
  contractor?: CaseContractor;
}): boolean => {
  if (data.courtType !== 'other') {
    return (
      !data.serviceType &&
      Boolean(data.processNumber && data.court) &&
      data.role !== 'other' &&
      data.status !== 'custom' &&
      !data.roleName &&
      !data.statusName &&
      !data.contractor
    );
  }
  return (
    Boolean(data.serviceType) &&
    (data.role === 'other') === Boolean(data.roleName) &&
    (data.status === 'custom') === Boolean(data.statusName)
  );
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
  .refine((data) => data.courtType !== 'other' || validServiceType(data), {
    message: 'tipo de serviço inválido',
    path: ['serviceType'],
  })
  .refine((data) => data.courtType === 'other' || validServiceType(data), {
    message: 'número do processo e tribunal são obrigatórios',
    path: ['processNumber'],
  })
  .refine((data) => !data.payment || data.payment.amountCents <= (data.fixedFeesCents ?? 0), {
    message: 'valor recebido acima do honorário',
    path: ['payment', 'amountCents'],
  });
export type CreateCase = z.infer<typeof createCaseSchema>;
// The registration form asks for the contractor in the office's own type (AD-176); imports (PDF, CSV)
// create the type without one, so the API accepts it missing.
export const validContractor = (data: { courtType?: CourtType; contractor?: CaseContractor }): boolean =>
  data.courtType !== 'other' || Boolean(data.contractor?.name);

// PATCH accepts any subset of the fields + the fee fixed by the court or, in an assistant case, the
// contracted one (AD-135), and the perícia date, which moves the appointment on the agenda (AEV-04).
export const updateCaseSchema = caseFields
  .partial()
  .extend({
    fixedFeesCents: centsSchema.optional(),
    inspection: caseInspectionSchema.optional(),
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
