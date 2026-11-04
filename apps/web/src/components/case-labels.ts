import {
  CASE_PHASE_GROUPS,
  CASE_STATUS,
  type CasePhase,
  type CasePhaseGroup,
  type CaseRole,
  type CaseStatus,
  COURTTYPES,
  type CourtType,
  JUDICIAL_CASE_ROLES,
} from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Service phase (AD-178): labels shared by listing, detail, home and charts. The key is not the value:
// several values read differently in other domains (`report_delivered`, `removal`).
const CASE_PHASE_KEY: Record<CasePhase, string> = {
  awaiting_scheduling: 'awaiting_inspection_scheduling_checklist',
  awaiting_report_approval: 'awaiting_report_approval',
  awaiting_pje_signature: 'awaiting_expert_pje_signature',
  awaiting_site_info: 'awaiting_inspection_site_info',
  awaiting_inspection: 'awaiting_inspection',
  withdrawal: 'process_withdrawal',
  removal: 'expert_removal',
  settlement: 'settlement_between_parties',
  awaiting_expert_report: 'awaiting_expert_report',
  reviewing_report: 'review_expert_report',
  report_delivered: 'report_delivered_awaiting_objection',
  awaiting_clarification_approval: 'awaiting_clarification_approval',
  awaiting_clarification_response: 'awaiting_clarification_response',
  awaiting_new_clarifications: 'awaiting_new_clarifications',
  awaiting_judge: 'awaiting_judge_response',
  evidence_closed: 'evidence_closed_monitor_fees',
  fees_received: 'fees_received',
  environmental_assessment: 'return_environmental_assessment',
  supplement_inspection: 'return_supplement_inspection',
  petition: 'draft_petition',
  objection_reply_1: 'reply_objection_1',
  objection_return_1: 'awaiting_objection_1_return',
  objection_reply_2: 'reply_objection_2',
  objection_return_2: 'awaiting_objection_2_return',
  objection_reply_3: 'reply_objection_3',
  objection_return_3: 'awaiting_objection_3_return',
  objection_reply_4: 'reply_objection_4',
  objection_return_4: 'awaiting_objection_4_return',
  custom: 'own_phase',
};
// A phase typed in the office's own type (AD-176) shows its name.
export const casePhaseLabel = (phase: CasePhase, phaseName?: string): string =>
  (phase === 'custom' && phaseName) || t(CASE_PHASE_KEY[phase]);
const PHASE_GROUP_KEY: Record<CasePhaseGroup, string> = {
  initial: 'initial_phase',
  losses: 'losses_phase',
  final: 'final_phase',
  receiving: 'receiving_phase',
  auxiliary: 'auxiliary_phases',
};
// The routine list in groups, as the select shows it.
export const CASE_PHASE_GROUP_ITEMS = (Object.keys(CASE_PHASE_GROUPS) as CasePhaseGroup[]).map((group) => ({
  group,
  label: t(PHASE_GROUP_KEY[group]),
  items: CASE_PHASE_GROUPS[group].map((value) => ({ value, label: casePhaseLabel(value) })),
}));
export const CASE_PHASE_ITEMS = CASE_PHASE_GROUP_ITEMS.flatMap((group) => group.items);
export const casePhaseGroupLabel = (group: CasePhaseGroup): string => t(PHASE_GROUP_KEY[group]);

// Service status (AD-178).
const CASE_STATUS_KEY: Record<CaseStatus, string> = { active: 'active', suspended: 'suspended', canceled: 'canceled' };
export const caseStatusLabel = (status: CaseStatus): string => t(CASE_STATUS_KEY[status]);
export const CASE_STATUS_VARIANT: Record<CaseStatus, IndicatorVariant> = {
  active: 'success',
  suspended: 'warning',
  canceled: 'neutral',
};
export const CASE_STATUS_ITEMS = CASE_STATUS.map((value) => ({ value, label: caseStatusLabel(value) }));

// Sphere ("Esfera", only in a perícia, AD-178). The key has a suffix (`civil` alone would be ambiguous).
const COURT_TYPE_KEY: Record<CourtType, string> = {
  labor: 'labor_court',
  civil: 'civil_court',
  federal: 'federal_court',
};
export const courtTypeLabel = (courtType: CourtType): string => t(COURT_TYPE_KEY[courtType]);

export const COURT_TYPE_ITEMS = COURTTYPES.map((value) => ({ value, label: courtTypeLabel(value) }));

// "Tipo de serviço" (AD-178): Perícia, Assistência técnica, the office's own types and "Cadastrar novo".
// The select value is the role or `name:` + the own type's name.
const SERVICE_KIND_KEY = {
  court_expert: 'expert_examination',
  technical_assistant: 'technical_assistance',
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
export const serviceLabel = (data: ServiceTypeFields & { courtType?: CourtType }): string =>
  [serviceTypeLabel(data), data.courtType && courtTypeLabel(data.courtType)].filter(Boolean).join(' · ');
export const serviceTypeItems = (officeTypes: readonly { name: string }[]) => [
  ...SERVICE_KINDS.map((role) => ({ value: role, label: t(SERVICE_KIND_KEY[role]) })),
  ...officeTypes.map(({ name }) => ({ value: `${OWN_TYPE_PREFIX}${name}`, label: name })),
];
export const ROLE_ITEMS = JUDICIAL_CASE_ROLES.map((value) => ({ value, label: t(value) }));
// A role typed in the office's own type (AD-176) shows its name.
export const caseRoleLabel = (role: CaseRole, roleName?: string): string => (role === 'other' && roleName) || t(role);
