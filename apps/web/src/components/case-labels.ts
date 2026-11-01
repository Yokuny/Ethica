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

// Rótulos e tons de status da perícia, compartilhados por listagem, detalhe,
// início e gráficos. A chave de tradução é o próprio valor do enum.
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

// Fase detalhada e situação (AD-133). A chave da fase é o próprio valor, como a etapa.
export const phaseLabel = (phase: string): string => t(phase);
export const WITHOUT_PHASE = 'none';
// No formulário: as fases da etapa escolhida, as de suspensão e "sem fase".
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
// A chave da justiça leva sufixo (`civil` sozinho seria ambíguo no dicionário).
const COURT_TYPE_KEY: Record<CourtType, string> = {
  labor: 'labor_court',
  civil: 'civil_court',
  federal: 'federal_court',
};
export const courtTypeLabel = (courtType: CourtType): string => t(COURT_TYPE_KEY[courtType]);

export const COURT_TYPE_ITEMS = COURTTYPES.map((value) => ({ value, label: courtTypeLabel(value) }));
export const ROLE_ITEMS = CASE_ROLES.map((value) => ({ value, label: t(value) }));
