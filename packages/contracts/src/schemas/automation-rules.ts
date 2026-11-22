import {
  CASE_CLOSED_PHASES,
  type CasePhase,
  type CaseRole,
  type CaseStatus,
  casePhases,
  isCaseClosed,
} from './case.schema.js';
import type { CourtMovement } from './court-process.schema.js';

// Rules of the Automação Datajud (AD-268, plan section 4): a court movement (TPU code of the CNJ) that a rule
// recognizes becomes a suggestion; nothing changes before a person accepts it. Codes checked in the official
// TPU and in real processes (`.specs/features/automacao-datajud/context.md`). A rule changes version when its
// codes or target change; the rejections count per rule.

export type CaseProposal = { target: 'case_status'; value: CaseStatus } | { target: 'case_phase'; value: CasePhase };

export type AutomationRule = {
  key: string;
  version: number;
  codes: readonly number[];
  // The proposal for the case role; undefined = the rule does not apply to this role.
  propose: (role: CaseRole) => CaseProposal | undefined;
};

export const AUTOMATION_RULES: readonly AutomationRule[] = [
  {
    // Suspensão ou sobrestamento (children of 25): the process stopped.
    key: 'case_suspended',
    version: 1,
    codes: [272, 898, 14973, 14975, 14984, 14985],
    propose: () => ({ target: 'case_status', value: 'suspended' }),
  },
  {
    // 12066 "Cumprimento de Levantamento da Suspensão": the process is back.
    key: 'case_resumed',
    version: 1,
    codes: [12066],
    propose: () => ({ target: 'case_status', value: 'active' }),
  },
  {
    // Homologação de transação / de acordo em execução: the parties settled.
    key: 'case_settlement',
    version: 1,
    codes: [466, 14099],
    propose: (role) => ({
      target: 'case_phase',
      value: role === 'technical_assistant' ? 'assistance_settlement' : 'settlement',
    }),
  },
  {
    // Desistência and extinção sem julgamento do mérito (indeferimento, abandono, falta de pressupostos ou de
    // condições, ausência do reclamante).
    key: 'case_withdrawal',
    version: 1,
    codes: [463, 454, 458, 459, 461, 473],
    propose: (role) => (role === 'court_expert' ? { target: 'case_phase', value: 'withdrawal' } : undefined),
  },
  {
    // Sentença (procedência, improcedência, procedência em parte): the evidence phase is over.
    key: 'case_sentence',
    version: 1,
    codes: [219, 220, 221],
    propose: (role) => (role === 'court_expert' ? { target: 'case_phase', value: 'evidence_closed' } : undefined),
  },
];

export type RuleMatch = { rule: AutomationRule; proposal: CaseProposal; movement: CourtMovement };

export const matchRules = (movement: CourtMovement, role: CaseRole): RuleMatch[] =>
  AUTOMATION_RULES.flatMap((rule) => {
    const proposal = rule.codes.includes(movement.code) ? rule.propose(role) : undefined;
    return proposal ? [{ rule, proposal, movement }] : [];
  });

// Whether a proposal still fits the case now (AD-268, invariant 3): `already` = the case is in the proposed
// state (superseded); `impossible` = a closed case, a phase of the other role or a phase behind the current one
// (a suggestion never moves the phase back, except to a loss phase that closes the case).
export const proposalFits = (
  legalCase: { role: CaseRole; status: CaseStatus; phase: CasePhase },
  proposal: CaseProposal,
): 'apply' | 'already' | 'impossible' => {
  if (proposal.target === 'case_status') {
    if (legalCase.status === proposal.value) return 'already';
    return legalCase.status === 'canceled' || isCaseClosed(legalCase) ? 'impossible' : 'apply';
  }
  if (legalCase.phase === proposal.value) return 'already';
  if (isCaseClosed(legalCase)) return 'impossible';
  const phases = casePhases(legalCase.role);
  const target = phases.indexOf(proposal.value);
  if (target < 0) return 'impossible';
  if (CASE_CLOSED_PHASES.includes(proposal.value)) return 'apply';
  return target > phases.indexOf(legalCase.phase) ? 'apply' : 'impossible';
};
