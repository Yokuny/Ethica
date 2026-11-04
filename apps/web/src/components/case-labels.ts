import {
  CASE_STATUS,
  type CaseRole,
  type CaseStatus,
  COURTTYPES,
  type CourtType,
  JUDICIAL_CASE_ROLES,
  JUDICIAL_COURT_TYPES,
} from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Service status (RSV-03): labels and tones shared by listing, detail, home and charts. The key is
// not the value: `completed`, `declined` and `suspended` read differently in other domains.
const CASE_STATUS_KEY: Record<CaseStatus, string> = {
  appointed: 'appointed_awaiting_acceptance',
  fees_proposed: 'fees_proposal_sent',
  fees_accepted: 'fees_accepted_awaiting_date',
  inspection_scheduled: 'inspection_scheduled',
  drafting_report: 'inspection_done_drafting_report',
  report_delivered: 'report_delivered',
  clarifications: 'clarifications_objection',
  awaiting_payment: 'awaiting_payment',
  completed: 'service_completed',
  suspended: 'service_suspended',
  declined: 'declined_canceled',
  custom: 'own_status',
};
// A status typed in the office's own type (AD-176) shows its name.
export const caseStatusLabel = (status: CaseStatus, statusName?: string): string =>
  (status === 'custom' && statusName) || t(CASE_STATUS_KEY[status]);
export const CASE_STATUS_VARIANT: Record<CaseStatus, IndicatorVariant> = {
  appointed: 'info',
  fees_proposed: 'info',
  fees_accepted: 'info',
  inspection_scheduled: 'violet',
  drafting_report: 'warning',
  report_delivered: 'success',
  clarifications: 'orange',
  awaiting_payment: 'warning',
  completed: 'success',
  suspended: 'neutral',
  declined: 'neutral',
  custom: 'info',
};
// Routine list of the judicial types; the typed status only exists in the office's own type (AD-176).
export const CASE_STATUS_ITEMS = CASE_STATUS.filter((value) => value !== 'custom').map((value) => ({
  value,
  label: caseStatusLabel(value),
}));
// Sphere ("Esfera", AD-177). The key has a suffix (`civil` alone would be ambiguous in the dictionary).
const COURT_TYPE_KEY: Record<CourtType, string> = {
  labor: 'labor_court',
  civil: 'civil_court',
  federal: 'federal_court',
  extrajudicial: 'extrajudicial',
};
export const courtTypeLabel = (courtType: CourtType): string => t(COURT_TYPE_KEY[courtType]);

export const COURT_TYPE_ITEMS = COURTTYPES.map((value) => ({ value, label: courtTypeLabel(value) }));
// Opportunities and court divisions come from the courts: only the judicial spheres.
export const JUDICIAL_COURT_TYPE_ITEMS = JUDICIAL_COURT_TYPES.map((value) => ({ value, label: courtTypeLabel(value) }));

// "Tipo de serviço" (AD-177): Perícia, Assistência técnica, Parceria, the office's own types and "Cadastrar
// novo". The select value is the role or `name:` + the own type's name.
const SERVICE_KIND_KEY = {
  court_expert: 'expert_examination',
  technical_assistant: 'technical_assistance',
  partnership: 'partnership',
} as const;
type ServiceKind = keyof typeof SERVICE_KIND_KEY;
export const SERVICE_KINDS = Object.keys(SERVICE_KIND_KEY) as ServiceKind[];
export const NEW_SERVICE_TYPE = 'new';
export const OWN_TYPE_PREFIX = 'name:';
type ServiceTypeFields = { role?: CaseRole; serviceType?: string | null };
export const serviceTypeValue = ({ role, serviceType }: ServiceTypeFields): string | undefined =>
  serviceType ? `${OWN_TYPE_PREFIX}${serviceType}` : role && role in SERVICE_KIND_KEY ? role : undefined;
export const serviceTypeLabel = ({ role, serviceType }: ServiceTypeFields): string =>
  serviceType || (role && role in SERVICE_KIND_KEY ? t(SERVICE_KIND_KEY[role as ServiceKind]) : '');
// Type + sphere, as the list and the detail show it ("Perícia · Trabalhista").
export const serviceLabel = (data: ServiceTypeFields & { courtType: CourtType }): string =>
  [serviceTypeLabel(data), courtTypeLabel(data.courtType)].filter(Boolean).join(' · ');
export const serviceTypeItems = (officeTypes: readonly { name: string }[]) => [
  ...SERVICE_KINDS.map((role) => ({ value: role, label: t(SERVICE_KIND_KEY[role]) })),
  ...officeTypes.map(({ name }) => ({ value: `${OWN_TYPE_PREFIX}${name}`, label: name })),
];
export const ROLE_ITEMS = JUDICIAL_CASE_ROLES.map((value) => ({ value, label: t(value) }));
// A role typed in the office's own type (AD-176) shows its name.
export const caseRoleLabel = (role: CaseRole, roleName?: string): string => (role === 'other' && roleName) || t(role);
