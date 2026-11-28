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
  | { target: 'notifications_cancel'; count: number }
  // SGD-07: the court division and the filing day the court gives, for a case that has them empty.
  | { target: 'case_fill'; division?: string; docketingDate?: string };

// The module of the data a proposal changes (D5): who sees it and who may accept it.
export const proposalModule = (proposal: CaseProposal): 'expert_cases' | 'finance' =>
  proposal.target === 'transaction_installment' ? 'finance' : 'expert_cases';

// Payment in court (AD-274, `.specs/features/automacao-datajud/context.md`). Intention: the judge orders the
// alvará (12548) or the court requests the payment (12165, RPV 12173, precatório 12166, prepared 12175) — only a
// notice. Money available: the alvará issued (60 with the complement `tipo_de_documento` 73) or the RPV or
// precatório paid (12176, 12169) — a suggestion to register the receipt.
export const PAYMENT_INTENT_CODES: readonly number[] = [12548, 12165, 12173, 12166, 12175];
export const PAYMENT_RULE = { key: 'payment_available', version: 1 } as const;
// SGD-07: fill the empty division and filing day of a case with what the court gives.
export const CASE_FILL_RULE = { key: 'case_fill', version: 1 } as const;
export const isPaymentAvailable = (movement: CourtMovement): boolean =>
  movement.code === 12176 ||
  movement.code === 12169 ||
  (movement.code === 60 && movement.complements.some((item) => item.code === 4 && item.value === 73));
export const isPaymentIntent = (movement: CourtMovement): boolean => PAYMENT_INTENT_CODES.includes(movement.code);

export const SUSPENSION_CODES: readonly number[] = [
  25, 263, 264, 265, 268, 272, 275, 276, 277, 898, 11975, 12098, 12099, 12100, 12259, 14968, 14969, 14970, 14971, 14972,
  14973, 15067, 15204, 15247, 15248, 15413, 15415, 15425, 15780, 11025, 11012, 11013, 11016, 11017, 11018, 15009, 15238,
  12274, 245,
];
export const RESUME_CODES: readonly number[] = [
  12066, 14974, 14975, 14976, 14977, 14978, 14979, 14980, 14981, 14982, 14983, 14984, 14985, 15414, 15416, 849, 893,
];

// Time to collect the fees (SGD-05, AD-309): "Trânsito em julgado", "Liquidação iniciada" and "Execução/Cumprimento
// de Sentença Iniciada" — a notice when the case still has open income.
export const FEES_COLLECTION_CODES: readonly number[] = [848, 11384, 11385];
// End of the process in court: 246 "Arquivamento definitivo", 22 "Baixa Definitiva" (first degree only: in the
// second degree it is the appeal going back) and 196 "Extinção da execução ou do cumprimento da sentença".
export const CASE_FINISHED_CODES: readonly number[] = [246, 22, 196];
const FIRST_DEGREES = ['G1', 'JE'];

// The process ended in court when, among the finishing and the resuming movements of every degree, the latest is a
// finishing one (a TRF3 process had a "Baixa Definitiva" in 2011, a reactivation and its real end in 2023). Gives
// that movement, or nothing.
export const courtFinishing = (
  processes: { degree: string; movements: CourtMovement[] }[],
): CourtMovement | undefined =>
  processes
    .flatMap(({ degree, movements }) =>
      movements.filter(
        (movement) =>
          RESUME_CODES.includes(movement.code) ||
          (CASE_FINISHED_CODES.includes(movement.code) && (movement.code !== 22 || FIRST_DEGREES.includes(degree))),
      ),
    )
    .sort((a, b) => a.at.localeCompare(b.at))
    .filter((movement, index, list) => index === list.length - 1 && CASE_FINISHED_CODES.includes(movement.code))[0];

// The process ended and the fees are received (AD-309): "Honorários recebidos" in the perícia (the user's choice on
// 2026-11-27) and "Finalizado" in the technical assistance (AD-310); the worker applies it by the state of the
// process, not per movement.
export const CASE_FINISHED_RULE = {
  key: 'case_finished',
  version: 1,
  propose: (serviceType: ServiceType): CaseProposal | undefined =>
    serviceType === 'expert_examination'
      ? { target: 'case_phase', value: 'fees_received' }
      : serviceType === 'technical_assistance'
        ? { target: 'case_phase', value: 'finished' }
        : undefined,
} as const;

export type AutomationRule = {
  key: string;
  version: number;
  codes: readonly number[];
  // The proposal for the service type; undefined = the rule does not apply to this type.
  propose: (serviceType: ServiceType) => CaseProposal | undefined;
};

export const AUTOMATION_RULES: readonly AutomationRule[] = [
  {
    // The process stopped (TPU of 2026-11-27): 25 "Suspensão ou Sobrestamento" by the judge and its active children,
    // 11025 "Suspensão ou Sobrestamento" by order and its children, 12274 "Sobrestado" (decided in session) and 245
    // "Arquivamento provisório" (in labor courts, the execution waiting for the debtor's assets).
    key: 'case_suspended',
    version: 3,
    codes: SUSPENSION_CODES,
    propose: () => ({ target: 'case_status', value: 'suspended' }),
  },
  {
    // The process is back: 12066 "Cumprimento de Levantamento da Suspensão", 14974 "Levantamento da Causa
    // Suspensiva ou de Sobrestamento" and its children (14975, 14984 and 14985 sat in the suspension until version
    // 2), 849 "Reativação" and 893 "Desarquivamento".
    key: 'case_resumed',
    version: 3,
    codes: RESUME_CODES,
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

// The fields of a filling proposal the case still has empty (undefined = nothing left to fill).
export const caseFillOf = (
  legalCase: { division?: string | null; docketingDate?: string | null },
  proposal: { division?: string; docketingDate?: string },
): { division?: string; docketingDate?: string } | undefined => {
  const fill = {
    ...(proposal.division && !legalCase.division ? { division: proposal.division } : {}),
    ...(proposal.docketingDate && !legalCase.docketingDate ? { docketingDate: proposal.docketingDate } : {}),
  };
  return Object.keys(fill).length > 0 ? fill : undefined;
};

// The court writes some division names all in capitals ("VARA DO TRABALHO DE BATAGUASSU", TRT24): capital only at
// the start of each word, with the short connectors in lower case.
export const courtDivisionName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) =>
      index > 0 && ['de', 'do', 'da', 'dos', 'das', 'e'].includes(word)
        ? word
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ');
};

// Whether a proposal still fits the case now (AD-268, invariant 3): `already` = the case is in the proposed
// state (superseded); `impossible` = a closed case, a phase of another type or a phase behind the current one
// (a suggestion never moves the phase back, except to a loss phase that closes the case).
export const proposalFits = (
  legalCase: {
    serviceType: ServiceType;
    status: CaseStatus;
    phase: CasePhase;
    division?: string | null;
    docketingDate?: string | null;
  },
  proposal: CaseProposal,
): 'apply' | 'already' | 'impossible' => {
  // Filling is registration only: it fits while one of its fields is still empty, closed or not.
  if (proposal.target === 'case_fill') return caseFillOf(legalCase, proposal) ? 'apply' : 'already';
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
