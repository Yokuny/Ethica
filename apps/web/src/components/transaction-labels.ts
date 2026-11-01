import { TRANSACTION_CATEGORIES, TRANSACTION_KINDS, type TransactionKind } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord, TransactionState } from '@/query/transaction.js';

// `atrasado` é derivado na tela: previsto ou parcial com vencimento antes de hoje.
export const transactionState = (transaction: TransactionRecord, today: string): TransactionState =>
  (transaction.status === 'expected' || transaction.status === 'partial') && transaction.dueDate < today
    ? 'overdue'
    : transaction.status;

export const STATE_VARIANT: Record<TransactionState, IndicatorVariant> = {
  expected: 'info',
  partial: 'warning',
  settled: 'success',
  canceled: 'neutral',
  overdue: 'error',
};

export const STATE_ITEMS = (['expected', 'partial', 'overdue', 'settled', 'canceled'] as const).map((value) => ({
  value,
  label: t(value),
}));

export const KIND_ITEMS = TRANSACTION_KINDS.map((value) => ({ value, label: t(value) }));

export const categoryItems = (kind: TransactionKind) =>
  TRANSACTION_CATEGORIES[kind].map((value) => ({ value, label: t(value) }));
