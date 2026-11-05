import { DEADLINE_KINDS, DEADLINE_STATUS, type DeadlineKind, type DeadlineStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { addDaysToDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Deadline status tones (AD-109), shared by cases and agenda.
export const DEADLINE_STATUS_VARIANT: Record<DeadlineStatus, IndicatorVariant> = {
  pending: 'info',
  filed: 'success',
  missed: 'neutral',
  done: 'success',
};

// Deadline or alert (AD-189): the key is the label.
export const DEADLINE_KIND_ITEMS: { value: DeadlineKind; label: string }[] = [
  { value: 'deadline', label: t('deadline') },
  { value: 'alert', label: t('alert') },
];
export const DEADLINE_STATUS_ITEMS = DEADLINE_STATUS.map((value) => ({ value, label: t(value) }));

// Criticality of a pending deadline or alert (AD-190), by the days left: overdue, urgent (today up to 5 days),
// due soon (6 to 10) and attention (11 to 30); later, none. The returned key is the badge translation key itself.
export type DeadlineAlert = 'deadline_overdue' | 'deadline_urgent' | 'due_soon' | 'deadline_attention';
const ALERT_DAYS: [DeadlineAlert, number][] = [
  ['deadline_urgent', 5],
  ['due_soon', 10],
  ['deadline_attention', 30],
];

export const deadlineAlert = (
  deadline: { dueDate: string; status?: DeadlineStatus },
  today: string,
): DeadlineAlert | undefined => {
  if (deadline.status && deadline.status !== 'pending') return undefined;
  if (deadline.dueDate < today) return 'deadline_overdue';
  return ALERT_DAYS.find(([, days]) => deadline.dueDate <= addDaysToDisplayDate(today, days))?.[0];
};

export const ALERT_VARIANT: Record<DeadlineAlert, IndicatorVariant> = {
  deadline_overdue: 'error',
  deadline_urgent: 'orange',
  due_soon: 'warning',
  deadline_attention: 'info',
};

// Approved deadline and alert titles by service type (AD-190): perícia, technical assistance and the office's
// "Parceria" type; the other own types are only typed. The title saved is the label itself.
const SUGGESTIONS: Record<'court_expert' | 'technical_assistant' | 'partnership', Record<DeadlineKind, string[]>> = {
  court_expert: {
    deadline: [
      'nomination_acceptance',
      'fee_proposal',
      'report_filed',
      'objection_response',
      'clarifications_to_court',
      'supplementary_report',
      'fees_statement',
    ],
    alert: [
      'schedule_inspection',
      'notify_parties_of_inspection',
      'request_documents_from_parties',
      'collect_fee_deposit',
      'check_case_progress',
    ],
  },
  technical_assistant: {
    deadline: [
      'initial_questions',
      'technical_opinion',
      'supplementary_questions',
      'expert_report_objection',
      'complementary_questions',
    ],
    alert: [
      'client_alignment_meeting',
      'follow_on_site_inspection',
      'check_expert_report_released',
      'collect_client_fees',
    ],
  },
  partnership: {
    deadline: ['service_delivery', 'revision_delivery'],
    alert: ['partner_meeting', 'send_documents_to_partner', 'collect_payment', 'check_progress'],
  },
};
const PARTNERSHIP_SERVICE_TYPE = 'Parceria';

export const deadlineSuggestions = (legalCase: { role: string; serviceType?: string }) => {
  const list = legalCase.serviceType
    ? legalCase.serviceType === PARTNERSHIP_SERVICE_TYPE
      ? SUGGESTIONS.partnership
      : undefined
    : SUGGESTIONS[legalCase.role === 'technical_assistant' ? 'technical_assistant' : 'court_expert'];
  return list ? DEADLINE_KINDS.map((kind) => ({ kind, titles: list[kind].map((key) => t(key)) })) : [];
};
