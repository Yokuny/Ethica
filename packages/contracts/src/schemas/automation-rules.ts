import {
  CASE_CLOSED_PHASES,
  type CasePhase,
  type CaseStatus,
  casePhases,
  isCaseClosed,
  type ServiceType,
} from './case.schema.js';
import type { CourtMovement } from './court-process.schema.js';

// Rules of the Automação Datajud (AD-268, plan section 4): a court movement (TPU code of the CNJ) that a rule
// recognizes becomes a suggestion; nothing changes before a person accepts it. Codes checked in the official
// TPU and in real processes (`.specs/features/automacao-datajud/context.md`). A rule changes version when its
// codes or target change; the rejections count per rule.

export type CaseProposal =
  | { target: 'case_status'; value: CaseStatus }
  | { target: 'case_phase'; value: CasePhase }
  // Fase 6 (AD-269, AD-274): register a receipt (the person confirms amount, date and account) and cancel the
  // pending deadlines and alerts of a case closed by agreement or dismissal.
  | { target: 'transaction_installment'; date: string }
  | { target: 'notifications_cancel'; count: number };

// The module of the data a proposal changes (D5): who sees it and who may accept it.
export const proposalModule = (proposal: CaseProposal): 'expert_cases' | 'finance' =>
  proposal.target === 'transaction_installment' ? 'finance' : 'expert_cases';

// Payment in court (AD-274, `.specs/features/automacao-datajud/context.md`). Intention: the judge orders the
// alvará (12548) or the court requests the payment (12165, RPV 12173, precatório 12166, prepared 12175) — only a
// notice. Money available: the alvará issued (60 with the complement `tipo_de_documento` 73) or the RPV or
// precatório paid (12176, 12169) — a suggestion to register the receipt.
export const PAYMENT_INTENT_CODES: readonly number[] = [12548, 12165, 12173, 12166, 12175];
export const PAYMENT_RULE = { key: 'payment_available', version: 1 } as const;
export const isPaymentAvailable = (movement: CourtMovement): boolean =>
  movement.code === 12176 ||
  movement.code === 12169 ||
  (movement.code === 60 && movement.complements.some((item) => item.code === 4 && item.value === 73));
export const isPaymentIntent = (movement: CourtMovement): boolean => PAYMENT_INTENT_CODES.includes(movement.code);

export type AutomationRule = {
  key: string;
  version: number;
  codes: readonly number[];
  // The proposal for the service type; undefined = the rule does not apply to this type.
  propose: (serviceType: ServiceType) => CaseProposal | undefined;
};

export const AUTOMATION_RULES: readonly AutomationRule[] = [
  {
    // Suspensão ou sobrestamento (children of 25): the process stopped.
    key: 'case_suspended',
    version: 2,
    codes: [272, 898, 14973],
    propose: () => ({ target: 'case_status', value: 'suspended' }),
  },
  {
    // 12066 "Cumprimento de Levantamento da Suspensão" and the children of 14974 "Levantamento da Causa Suspensiva
    // ou de Sobrestamento" (14975, 14984, 14985 sat in the suspension until version 2; TPU of 2026-11-27): the
    // process is back.
    key: 'case_resumed',
    version: 2,
    codes: [12066, 14975, 14984, 14985],
    propose: () => ({ target: 'case_status', value: 'active' }),
  },
  {
    // Homologação de transação / de acordo em execução: the parties settled.
    key: 'case_settlement',
    version: 1,
    codes: [466, 14099],
    propose: (serviceType) => ({
      target: 'case_phase',
      value: serviceType === 'technical_assistance' ? 'assistance_settlement' : 'settlement',
    }),
  },
  {
    // Desistência and extinção sem julgamento do mérito (indeferimento, abandono, falta de pressupostos ou de
    // condições, ausência do reclamante).
    key: 'case_withdrawal',
    version: 1,
    codes: [463, 454, 458, 459, 461, 473],
    propose: (serviceType) =>
      serviceType === 'expert_examination' ? { target: 'case_phase', value: 'withdrawal' } : undefined,
  },
  {
    // Sentença (procedência, improcedência, procedência em parte): the evidence phase is over.
    key: 'case_sentence',
    version: 1,
    codes: [219, 220, 221],
    propose: (serviceType) =>
      serviceType === 'expert_examination' ? { target: 'case_phase', value: 'evidence_closed' } : undefined,
  },
];

export type RuleMatch = { rule: AutomationRule; proposal: CaseProposal; movement: CourtMovement };

export const matchRules = (movement: CourtMovement, serviceType: ServiceType): RuleMatch[] =>
  AUTOMATION_RULES.flatMap((rule) => {
    const proposal = rule.codes.includes(movement.code) ? rule.propose(serviceType) : undefined;
    return proposal ? [{ rule, proposal, movement }] : [];
  });

// Whether a proposal still fits the case now (AD-268, invariant 3): `already` = the case is in the proposed
// state (superseded); `impossible` = a closed case, a phase of another type or a phase behind the current one
// (a suggestion never moves the phase back, except to a loss phase that closes the case).
export const proposalFits = (
  legalCase: { serviceType: ServiceType; status: CaseStatus; phase: CasePhase },
  proposal: CaseProposal,
): 'apply' | 'already' | 'impossible' => {
  // Money and deadlines are decided by the person in the form (and can come after the case is closed).
  if (proposal.target === 'transaction_installment' || proposal.target === 'notifications_cancel') return 'apply';
  if (proposal.target === 'case_status') {
    if (legalCase.status === proposal.value) return 'already';
    return legalCase.status === 'canceled' || isCaseClosed(legalCase) ? 'impossible' : 'apply';
  }
  if (legalCase.phase === proposal.value) return 'already';
  if (isCaseClosed(legalCase)) return 'impossible';
  const phases = casePhases(legalCase.serviceType);
  const target = phases.indexOf(proposal.value);
  if (target < 0) return 'impossible';
  if (CASE_CLOSED_PHASES.includes(proposal.value)) return 'apply';
  return target > phases.indexOf(legalCase.phase) ? 'apply' : 'impossible';
};
