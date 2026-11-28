import {
  type NotificationRecord,
  type NotificationStatus,
  type ServiceType,
  USER_NOTIFICATION_KINDS,
  type UserNotificationKind,
} from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { casePhaseLabel } from '@/components/case-labels.js';
import { addDaysToDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

const FINANCE_DUE_KEY: Record<string, string> = {
  overdue: 'finance_due_overdue',
  due_today: 'finance_due_today',
  due_soon: 'finance_due_soon',
};
const NOTICE_KEY: Record<string, string> = {
  court_movement: 'court_movement_notice',
  payment_in_progress: 'payment_in_progress_notice',
  deadlines_review: 'deadlines_review_notice',
  fees_collection: 'fees_collection_notice',
  fees_open_finished: 'fees_open_finished_notice',
  automation_expiring: 'automation_expiring_notice',
};

// What a notification says, whatever its kind (AD-282). The database keeps the topic, the proposal and their
// parameters; the sentence is built here, in pt-BR (AD-263).
export const notificationText = (item: NotificationRecord): { title: string; description: string } => {
  const params = item.params ?? {};
  if (item.kind === 'deadline' || item.kind === 'alert') return { title: item.title ?? '', description: t(item.kind) };
  if (item.kind === 'suggestion' && item.proposal && item.evidence) {
    const { proposal, evidence } = item;
    const title =
      proposal.target === 'case_status'
        ? `${t('proposed_status')} ${t(proposal.value)}`
        : proposal.target === 'case_phase'
          ? `${t('proposed_phase')} ${casePhaseLabel(proposal.value)}`
          : proposal.target === 'transaction_installment'
            ? `${t('proposed_receipt')} ${day(proposal.date)}`
            : proposal.target === 'case_fill'
              ? `${t('proposed_fill')}: ${[
                  proposal.division && `${t('court_division')} ${proposal.division}`,
                  proposal.docketingDate && `${t('lawsuit_filing_date')} ${day(proposal.docketingDate)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}`
              : `${t('proposed_cancel_deadlines')} (${proposal.count})`;
    return { title, description: `${t('court_movement_label')} (${evidence.court}): ${evidence.movement.name}` };
  }
  if (item.topic === 'finance_due') {
    return {
      title: t(FINANCE_DUE_KEY[String(params.bucket)] ?? item.kind),
      description: `${params.description} · ${formatMoney(Number(params.openCents))} · ${day(String(params.dueDate))}`,
    };
  }
  if (item.topic === 'court_movement') {
    const more = Number(params.count) > 1 ? ` (+${Number(params.count) - 1})` : '';
    return { title: t(NOTICE_KEY.court_movement), description: `${params.latestName}${more}` };
  }
  if (item.topic === 'automation_expiring') {
    return {
      title: t(NOTICE_KEY.automation_expiring),
      description: formatDate(new Date(String(params.automationUntil))),
    };
  }
  // Anything incomplete still says what kind it is.
  return {
    title: t((item.topic && NOTICE_KEY[item.topic]) ?? item.kind),
    description: params.latestName ? String(params.latestName) : t(item.kind),
  };
};

// Status tones of a deadline or alert (AD-109, AD-263), shared by cases and agenda.
export const DEADLINE_STATUS_VARIANT: Partial<Record<NotificationStatus, IndicatorVariant>> = {
  pending: 'info',
  filed: 'success',
  missed: 'neutral',
  done: 'success',
  canceled: 'neutral',
};

// A deadline or an alert (AD-189): the key is the label.
export const DEADLINE_KIND_ITEMS: { value: UserNotificationKind; label: string }[] = [
  { value: 'deadline', label: t('deadline') },
  { value: 'alert', label: t('alert') },
];

// Criticality of a pending deadline or alert (AD-190), by the days left: overdue, urgent (today up to 5 days),
// due soon (6 to 10) and attention (11 to 30); later, none. The returned key is the badge translation key itself.
export type DeadlineAlert = 'deadline_overdue' | 'deadline_urgent' | 'due_soon' | 'deadline_attention';
const ALERT_DAYS: [DeadlineAlert, number][] = [
  ['deadline_urgent', 5],
  ['due_soon', 10],
  ['deadline_attention', 30],
];

export const deadlineAlert = (
  deadline: { dueDate: string; status?: NotificationStatus },
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

// Approved deadline and alert titles by service type (AD-190, AD-310); the private service only has typed ones.
// The title saved is the label itself.
const SUGGESTIONS: Partial<Record<ServiceType, Record<UserNotificationKind, string[]>>> = {
  expert_examination: {
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
  technical_assistance: {
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

export const deadlineSuggestions = (legalCase: { serviceType: ServiceType }) => {
  const list = SUGGESTIONS[legalCase.serviceType];
  return list ? USER_NOTIFICATION_KINDS.map((kind) => ({ kind, titles: list[kind].map((key) => t(key)) })) : [];
};
