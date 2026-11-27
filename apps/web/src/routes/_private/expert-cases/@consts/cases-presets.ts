import { CASE_CLOSED_PHASES, CASE_PHASES, CASE_STATUS } from '@ethica/contracts';
import type { CasesSearch } from '../@interface/cases.interface.js';

// Ready-made filters of the "…" menu (AD-307): written to the URL, so "Filtros" shows them and "Limpar" removes
// them. A preset changes only its own filters. Open = not canceled nor in a closing phase (AD-306); the phase
// list keeps `custom` (own phases), which the checklist does not offer.
const OPEN: Partial<CasesSearch> = {
  status: CASE_STATUS.filter((status) => status !== 'canceled'),
  phase: CASE_PHASES.filter((phase) => !CASE_CLOSED_PHASES.includes(phase)),
};

export const CASES_PRESETS: { label: string; filters: Partial<CasesSearch> }[] = [
  { label: 'hide_closed', filters: OPEN },
  { label: 'open_expert_examinations', filters: { ...OPEN, role: ['court_expert'], serviceType: undefined } },
  { label: 'open_technical_assistances', filters: { ...OPEN, role: ['technical_assistant'], serviceType: undefined } },
];
