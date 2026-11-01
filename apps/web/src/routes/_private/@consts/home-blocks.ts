import type { HomeBlock, PermissionModule } from '@ethica/contracts';

// Module each home block requires viewing (AD-136, AD-137); `null` = anyone.
export const HOME_BLOCK_MODULE: Record<HomeBlock, PermissionModule | null> = {
  overview: 'expert_cases',
  upcoming: 'agenda',
  cash_flow: 'finance',
  stalled: 'expert_cases',
  by_stage: 'expert_cases',
  by_court: 'expert_cases',
  sections: null,
};

export const HOME_BLOCK_KEY: Record<HomeBlock, string> = {
  overview: 'home_block_overview',
  upcoming: 'upcoming_commitments',
  cash_flow: 'cash_flow',
  stalled: 'stalled_expert_cases',
  by_stage: 'expert_cases_by_stage',
  by_court: 'expert_cases_by_court',
  sections: 'home_block_sections',
};
