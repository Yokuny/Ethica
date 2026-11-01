import { DEADLINE_DUE_SOON_DAYS, type DeadlineStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { addDaysToDisplayDate } from '@/lib/helpers/displayTime.helper.js';

// Tons do status do prazo (AD-109), compartilhados por perícias e agenda.
export const DEADLINE_STATUS_VARIANT: Record<DeadlineStatus, IndicatorVariant> = {
  pending: 'info',
  filed: 'success',
  missed: 'neutral',
};

export type DeadlineAlert = 'deadline_overdue' | 'due_soon';

// Só prazo pendente alerta: vencido (antes de hoje) ou vence em breve (até 15 dias).
// A chave devolvida é a própria chave de tradução do selo.
export const deadlineAlert = (
  deadline: { vencimento: string; status?: DeadlineStatus },
  today: string,
): DeadlineAlert | undefined => {
  if (deadline.status && deadline.status !== 'pending') return undefined;
  if (deadline.vencimento < today) return 'deadline_overdue';
  if (deadline.vencimento <= addDaysToDisplayDate(today, DEADLINE_DUE_SOON_DAYS)) return 'due_soon';
  return undefined;
};

export const ALERTA_VARIANT: Record<DeadlineAlert, IndicatorVariant> = {
  deadline_overdue: 'error',
  due_soon: 'warning',
};
