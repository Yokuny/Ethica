import {
  CASE_PHASES,
  CASE_PHASES_BY_STATUS,
  CASE_PHASES_SUSPENSION,
  CASE_ROLES,
  CASE_STATES,
  CASE_STATUS,
  type CaseRole,
  type CaseState,
  type CaseStatus,
  COURTTYPES,
  type CourtType,
  JUDICIAL_COURT_TYPES,
  SERVICE_STATUS,
  type ServiceStatus,
} from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Case status labels and tones, shared by listing, detail,
// home and charts. The translation key is the enum value itself.
export const CASE_STATUS_VARIANT: Record<CaseStatus, IndicatorVariant> = {
  appointed: 'info',
  accepted: 'info',
  inspection: 'violet',
  drafting_report: 'warning',
  report_delivered: 'success',
  clarifications: 'orange',
  completed: 'success',
  declined: 'neutral',
};

export const CASE_STATUS_ITEMS = CASE_STATUS.map((value) => ({ value, label: t(value) }));

// Detailed phase and state (AD-133). The phase key is the value itself, like the status.
export const phaseLabel = (phase: string): string => t(phase);
export const WITHOUT_PHASE = 'none';
// In the form: the phases of the chosen status, the suspension ones and "no phase".
export const phaseItems = (status: CaseStatus) => [
  { value: WITHOUT_PHASE, label: t('no_detailed_phase') },
  ...[
    ...CASE_PHASES_BY_STATUS[status],
    ...(['completed', 'declined'].includes(status) ? [] : CASE_PHASES_SUSPENSION),
  ].map((value) => ({ value, label: phaseLabel(value) })),
];
export const CASE_PHASE_ITEMS = CASE_PHASES.map((value) => ({ value, label: phaseLabel(value) }));
export const CASE_STATE_VARIANT: Record<CaseState, IndicatorVariant> = {
  active: 'success',
  suspended: 'warning',
  closed: 'neutral',
};
const STATE_KEY: Record<CaseState, string> = {
  active: 'situation_active',
  suspended: 'situation_suspended',
  closed: 'situation_closed',
};
export const stateLabel = (state: CaseState): string => t(STATE_KEY[state]);
export const CASE_STATE_ITEMS = CASE_STATES.map((value) => ({ value, label: stateLabel(value) }));
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

// Service status (AD-158), independent of the stage. "Com pendência" is not the generic "Pendente".
const SERVICE_STATUS_KEY: Record<ServiceStatus, string> = {
  proposal_sent: 'proposal_sent',
  in_progress: 'in_progress',
  delivered: 'delivered',
  pending: 'with_pending_issue',
  canceled: 'canceled',
};
export const SERVICE_STATUS_VARIANT: Record<ServiceStatus, IndicatorVariant> = {
  proposal_sent: 'info',
  in_progress: 'warning',
  delivered: 'success',
  pending: 'orange',
  canceled: 'neutral',
};
export const serviceStatusLabel = (status: ServiceStatus): string => t(SERVICE_STATUS_KEY[status]);
export const SERVICE_STATUS_ITEMS = SERVICE_STATUS.map((value) => ({ value, label: serviceStatusLabel(value) }));

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
export const ROLE_ITEMS = CASE_ROLES.map((value) => ({ value, label: t(value) }));
