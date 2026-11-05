import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_KINDS,
  type TransactionCategory,
  type TransactionKind,
} from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionRecord, TransactionState } from '@/query/transaction.js';

// `overdue` is derived on screen: expected or partial with a due date before today.
export const transactionState = (transaction: TransactionRecord, today: string): TransactionState =>
  (transaction.status === 'expected' || transaction.status === 'partial') && transaction.dueDate < today
    ? 'overdue'
    : transaction.status;

// Literal tones: the same color in the table badge and in the filter button (`ToggleTone`).
export const STATE_VARIANT = {
  expected: 'info',
  partial: 'warning',
  settled: 'success',
  canceled: 'neutral',
  overdue: 'error',
} as const satisfies Record<TransactionState, IndicatorVariant>;

// Income green, expense red: badge, filter button and amount speak the same color.
export const KIND_VARIANT = { income: 'success', expense: 'error' } as const satisfies Record<
  TransactionKind,
  IndicatorVariant
>;

export const STATE_ITEMS = (['expected', 'partial', 'overdue', 'settled', 'canceled'] as const).map((value) => ({
  value,
  label: t(value),
}));

export const KIND_ITEMS = TRANSACTION_KINDS.map((value) => ({ value, label: t(value) }));

export const categoryItems = (kind: TransactionKind) =>
  TRANSACTION_CATEGORIES[kind].map((value) => ({ value, label: t(value) }));

// Category on screen: the name the office created (AD-159) or the fixed one.
export const categoryLabel = ({ category, categoryName }: { category: TransactionCategory; categoryName?: string }) =>
  categoryName ?? t(category);

// Expense category select (AD-159): fixed ones, the office's names and "Cadastrar nova despesa".
export const NEW_EXPENSE_CATEGORY = 'new';
export const expenseCategoryValue = (category?: TransactionCategory, categoryName?: string) =>
  categoryName ? `name:${categoryName}` : category;
export const expenseCategoryItems = (names: readonly string[]) => [
  ...categoryItems('expense'),
  ...names.map((name) => ({ value: `name:${name}`, label: name })),
  { value: NEW_EXPENSE_CATEGORY, label: t('register_new_expense') },
];
