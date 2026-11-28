import {
  AUTOMATION_RULES,
  CASE_FILL_RULE,
  CASE_FINISHED_RULE,
  type CaseProposal,
  PAYMENT_RULE,
} from '@ethica/contracts';
import { casePhaseLabel, caseStatusLabel } from '@/components/case-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';

export type RuleItem = { key: string; kind: 'notice' | 'suggestion'; title: string; description: string };

// Literal keys, so the dictionary checks each one; a rule without a title here is left out of the list.
const RULE_TITLE_KEY: Record<string, string> = {
  case_suspended: 'automation_rule_case_suspended',
  case_resumed: 'automation_rule_case_resumed',
  case_settlement: 'automation_rule_case_settlement',
  case_withdrawal: 'automation_rule_case_withdrawal',
  case_sentence: 'automation_rule_case_sentence',
};

const proposalText = (proposal: CaseProposal): string => {
  if (proposal.target === 'case_status') return `${t('proposed_status')} ${caseStatusLabel(proposal.value)}`;
  if (proposal.target === 'case_phase') return `${t('proposed_phase')} ${casePhaseLabel(proposal.value)}`;
  return t('automation_rule_payment_available_description');
};

// What each court movement brings (AD-268, AD-274), in the words of the expert: the notices only inform,
// the suggestions wait for someone to approve. The proposal shown is the one of a perícia.
export const RULE_ITEMS: RuleItem[] = [
  {
    key: 'new_movement',
    kind: 'notice',
    title: t('automation_rule_new_movement'),
    description: t('court_movement_notice'),
  },
  ...AUTOMATION_RULES.flatMap((rule): RuleItem[] => {
    const proposal = rule.propose('expert_examination');
    const titleKey = RULE_TITLE_KEY[rule.key];
    return proposal && titleKey
      ? [
          {
            key: rule.key,
            kind: 'suggestion',
            title: t(titleKey),
            description: proposalText(proposal),
          },
        ]
      : [];
  }),
  {
    key: 'payment_intent',
    kind: 'notice',
    title: t('automation_rule_payment_intent'),
    description: t('payment_in_progress_notice'),
  },
  {
    key: PAYMENT_RULE.key,
    kind: 'suggestion',
    title: t('automation_rule_payment_available'),
    description: proposalText({ target: 'transaction_installment', date: '' }),
  },
  // SGD-05, AD-309: by the state of the process, once per service.
  {
    key: 'fees_collection',
    kind: 'notice',
    title: t('automation_rule_fees_collection'),
    description: t('fees_collection_notice'),
  },
  {
    key: CASE_FINISHED_RULE.key,
    kind: 'suggestion',
    title: t('automation_rule_case_finished'),
    description: proposalText(CASE_FINISHED_RULE.propose('expert_examination') as CaseProposal),
  },
  {
    key: 'fees_open_finished',
    kind: 'notice',
    title: t('automation_rule_fees_open_finished'),
    description: t('fees_open_finished_notice'),
  },
  {
    key: CASE_FILL_RULE.key,
    kind: 'suggestion',
    title: t('automation_rule_case_fill'),
    description: t('proposed_fill'),
  },
];
