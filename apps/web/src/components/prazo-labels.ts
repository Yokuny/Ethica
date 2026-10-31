import { PRAZO_VENCE_EM_BREVE_DIAS, type PrazoStatus } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { addDaysToDisplayDate } from '@/lib/helpers/displayTime.helper.js';

// Tons do status do prazo (AD-109), compartilhados por perícias e agenda.
export const PRAZO_STATUS_VARIANT: Record<PrazoStatus, IndicatorVariant> = {
  pendente: 'info',
  protocolado: 'success',
  perdido: 'neutral',
};

export type AlertaDoPrazo = 'deadline_overdue' | 'due_soon';

// Só prazo pendente alerta: vencido (antes de hoje) ou vence em breve (até 15 dias).
// A chave devolvida é a própria chave de tradução do selo.
export const alertaDoPrazo = (
  prazo: { vencimento: string; status?: PrazoStatus },
  today: string,
): AlertaDoPrazo | undefined => {
  if (prazo.status && prazo.status !== 'pendente') return undefined;
  if (prazo.vencimento < today) return 'deadline_overdue';
  if (prazo.vencimento <= addDaysToDisplayDate(today, PRAZO_VENCE_EM_BREVE_DIAS)) return 'due_soon';
  return undefined;
};

export const ALERTA_VARIANT: Record<AlertaDoPrazo, IndicatorVariant> = {
  deadline_overdue: 'error',
  due_soon: 'warning',
};
