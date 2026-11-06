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
  TECHNICAL_ASSISTANCE_PHASES,
} from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';

// Service phase (AD-178): labels shared by listing, detail, home and charts. The key is not the value:
// several values read differently in other domains (`report_delivered`, `removal`).
const CASE_PHASE_KEY: Record<CasePhase, string> = {
  nomination_accepted: 'nomination_accepted',
  fee_proposal: 'fee_proposal',
  document_request: 'awaiting_documents',
  awaiting_scheduling: 'awaiting_scheduling',
  inspection_scheduled: 'inspection_scheduled',
  inspection_done: 'inspection_done',
  withdrawal: 'withdrawal',
  removal: 'expert_removal',
  settlement: 'settlement',
  drafting_report: 'report_in_progress',
  reviewing_report: 'report_in_review',
  report_delivered: 'report_delivered',
  objection_reply: 'objection_reply',
  objection_return: 'objection_return',
  clarifications: 'clarifications',
  awaiting_judge: 'awaiting_judge',
  evidence_closed: 'monitor_fees',
  fees_received: 'fees_received',
  supplement_inspection: 'supplement_inspection',
  petition: 'draft_petition',
  assistance_fee_proposal: 'fee_proposal_sent',
  assistance_hired: 'contracted',
  case_file_study: 'case_file_study_initial_questions',
  alignment_meeting: 'alignment_meeting',
  on_site_inspection: 'on_site_inspection',
  technical_opinion_drafting: 'technical_opinion_in_progress',
  technical_opinion_delivered: 'technical_opinion_delivered',
  supplementary_questions: 'supplementary_questions',
  report_objection: 'expert_report_objection',
  complementary_questions: 'complementary_questions',
  complementary_inspection: 'complementary_inspection',
  extra_stage: 'extra_stage',
  assistance_finished: 'assistance_finished',
  assistance_settlement: 'settlement_or_withdrawal',
  custom: 'own_phase',
};
// A phase typed in the office's own type (AD-176) shows its name.
export const casePhaseLabel = (phase: CasePhase, phaseName?: string): string =>
  (phase === 'custom' && phaseName) || t(CASE_PHASE_KEY[phase]);
const PHASE_GROUP_KEY: Record<CasePhaseGroup, string> = {
  initial: 'initial_phase',
  intermediate: 'intermediate_phase',
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
// Technical assistance list (AD-186), without groups.
export const TECHNICAL_ASSISTANCE_PHASE_ITEMS = TECHNICAL_ASSISTANCE_PHASES.map((value) => ({
  value,
  label: casePhaseLabel(value),
}));
// Every routine phase once (listing filter): the perícia groups, then the assistance-only ones.
export const CASE_PHASE_ITEMS = [
  ...CASE_PHASE_GROUP_ITEMS.flatMap((group) => group.items),
  ...TECHNICAL_ASSISTANCE_PHASE_ITEMS.filter((item) => item.value !== 'fees_received'),
];
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
// Own types always offered (AD-199), even before the first service; the name saved on the service is the label.
export const PARTNERSHIP_SERVICE_TYPE = 'Parceria';
const FIXED_OWN_TYPES = [PARTNERSHIP_SERVICE_TYPE, 'Serviço particular'];
export const serviceTypeItems = (officeTypes: readonly { name: string }[]) => [
  ...SERVICE_KINDS.map((role) => ({ value: role, label: t(SERVICE_KIND_KEY[role]) })),
  ...[...new Set([...FIXED_OWN_TYPES, ...officeTypes.map(({ name }) => name)])].map((name) => ({
    value: `${OWN_TYPE_PREFIX}${name}`,
    label: name,
  })),
];
export const ROLE_ITEMS = JUDICIAL_CASE_ROLES.map((value) => ({ value, label: t(value) }));
// A role typed in the office's own type (AD-176) shows its name.
export const caseRoleLabel = (role: CaseRole, roleName?: string): string => (role === 'other' && roleName) || t(role);
