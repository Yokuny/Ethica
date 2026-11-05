import { DEADLINE_DUE_SOON_DAYS, DEADLINE_STATUS, type DeadlineKind, type DeadlineStatus } from '@ethica/contracts';
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

export type DeadlineAlert = 'deadline_overdue' | 'due_soon';

// Only a pending deadline alerts: overdue (before today) or due soon (up to 15 days).
// The returned key is the badge translation key itself.
export const deadlineAlert = (
  deadline: { dueDate: string; status?: DeadlineStatus },
  today: string,
): DeadlineAlert | undefined => {
  if (deadline.status && deadline.status !== 'pending') return undefined;
  if (deadline.dueDate < today) return 'deadline_overdue';
  if (deadline.dueDate <= addDaysToDisplayDate(today, DEADLINE_DUE_SOON_DAYS)) return 'due_soon';
  return undefined;
};

export const ALERT_VARIANT: Record<DeadlineAlert, IndicatorVariant> = {
  deadline_overdue: 'error',
  due_soon: 'warning',
};
