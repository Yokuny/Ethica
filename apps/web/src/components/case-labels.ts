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
// The court type key has a suffix (`civil` alone would be ambiguous in the dictionary).
const COURT_TYPE_KEY: Record<CourtType, string> = {
  labor: 'labor_court',
  civil: 'civil_court',
  federal: 'federal_court',
  other: 'other_service',
};
export const courtTypeLabel = (courtType: CourtType): string => t(COURT_TYPE_KEY[courtType]);

export const COURT_TYPE_ITEMS = COURTTYPES.map((value) => ({ value, label: courtTypeLabel(value) }));
// Opportunities come from Datajud: only the judicial types.
export const JUDICIAL_COURT_TYPE_ITEMS = JUDICIAL_COURT_TYPES.map((value) => ({ value, label: courtTypeLabel(value) }));

// Service type (AD-158): a judicial one is court type × role, in the order the expert listed;
// one created by the office carries its name. The select value encodes the pair.
const JUDICIAL_SERVICE_TYPES = [
  ['civil', 'court_expert', 'court_expert_civil'],
  ['labor', 'court_expert', 'court_expert_labor'],
  ['civil', 'technical_assistant', 'technical_assistant_civil'],
  ['labor', 'technical_assistant', 'technical_assistant_labor'],
  ['federal', 'court_expert', 'court_expert_federal'],
  ['federal', 'technical_assistant', 'technical_assistant_federal'],
] as const satisfies readonly (readonly [Exclude<CourtType, 'other'>, CaseRole, string])[];
export const NEW_SERVICE_TYPE = 'new';
type ServiceTypeFields = { courtType?: CourtType; role?: CaseRole; serviceType?: string | null };
export const serviceTypeValue = ({ courtType, role, serviceType }: ServiceTypeFields): string | undefined =>
  courtType === 'other'
    ? serviceType
      ? `other:${serviceType}`
      : NEW_SERVICE_TYPE
    : courtType && `${courtType}:${role}`;
export const serviceTypeLabel = ({ courtType, role, serviceType }: ServiceTypeFields): string => {
  if (courtType === 'other') return serviceType ?? t('other_service');
  const found = JUDICIAL_SERVICE_TYPES.find(([type, typeRole]) => type === courtType && typeRole === role);
  return found ? t(found[2]) : '';
};
export const serviceTypeItems = (officeTypes: readonly { name: string }[]) => [
  ...JUDICIAL_SERVICE_TYPES.map(([courtType, role, key]) => ({ value: `${courtType}:${role}`, label: t(key) })),
  ...officeTypes.map(({ name }) => ({ value: `other:${name}`, label: name })),
  { value: NEW_SERVICE_TYPE, label: t('register_new') },
];
export const ROLE_ITEMS = JUDICIAL_CASE_ROLES.map((value) => ({ value, label: t(value) }));
// A role typed in the office's own type (AD-176) shows its name.
export const caseRoleLabel = (role: CaseRole, roleName?: string): string => (role === 'other' && roleName) || t(role);
