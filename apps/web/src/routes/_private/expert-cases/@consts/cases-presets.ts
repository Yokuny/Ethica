import type { CasesSearch } from '../@interface/cases.interface.js';

// Ready-made filters of the "…" menu (AD-307): written to the URL, so "Filtros" shows them and "Limpar" removes
// them. They speak of services, valid for every kind of office (AD-308).
export const CASES_PRESETS: { label: string; filters: Partial<CasesSearch> }[] = [
  { label: 'services_in_progress', filters: { situation: ['open'] } },
  { label: 'closed_expert_cases', filters: { situation: ['closed'] } },
];
