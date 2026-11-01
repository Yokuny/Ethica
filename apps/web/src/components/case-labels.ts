import {
  CASE_PHASES,
  CASE_PHASES_BY_STATUS,
  CASE_PHASES_SUSPENSION,
  CASE_ROLES,
  CASE_STATES,
  CASE_STATUS,
  type CaseState,
  type CaseStatus,
  COURTTYPES,
  type CourtType,
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
};
export const courtTypeLabel = (courtType: CourtType): string => t(COURT_TYPE_KEY[courtType]);

export const COURT_TYPE_ITEMS = COURTTYPES.map((value) => ({ value, label: courtTypeLabel(value) }));
export const ROLE_ITEMS = CASE_ROLES.map((value) => ({ value, label: t(value) }));
