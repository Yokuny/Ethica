import type { HomeBloco, PermissaoModulo } from '@ethica/contracts';

// Módulo que cada bloco do início exige ver (AD-136, AD-137); `null` = qualquer pessoa.
export const HOME_BLOCO_MODULO: Record<HomeBloco, PermissaoModulo | null> = {
  overview: 'pericias',
  upcoming: 'agenda',
  cash_flow: 'financeiro',
  stalled: 'pericias',
  by_stage: 'pericias',
  by_court: 'pericias',
  sections: null,
};

export const HOME_BLOCO_KEY: Record<HomeBloco, string> = {
  overview: 'home_block_overview',
  upcoming: 'upcoming_commitments',
  cash_flow: 'cash_flow',
  stalled: 'stalled_expert_cases',
  by_stage: 'expert_cases_by_stage',
  by_court: 'expert_cases_by_court',
  sections: 'home_block_sections',
};
