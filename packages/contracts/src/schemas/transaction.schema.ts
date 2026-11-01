import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

// Income (receivable fee) and operating expense are separated by kind.
export const TRANSACTION_KINDS = ['income', 'expense'] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export const TRANSACTION_CATEGORIES = {
  income: ['advance_fees', 'fixed_fees', 'contracted_fees'],
  expense: ['travel', 'supplies', 'fees_and_taxes', 'other_expenses'],
} as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[TransactionKind][number];
export const ALL_TRANSACTION_CATEGORIES = [
  ...TRANSACTION_CATEGORIES.income,
  ...TRANSACTION_CATEGORIES.expense,
] as const;

// An overdue `expected` shows as overdue on screen; it is not a stored status.
// Income (fee, AD-111): status derived from the installments — expected, partial or settled —
// and never canceled. Expense: expected, settled or canceled, without partial.
export const TRANSACTION_STATUS = ['expected', 'partial', 'settled', 'canceled'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

const transactionFields = z.object({
  kind: z.enum(TRANSACTION_KINDS),
  category: z.enum(ALL_TRANSACTION_CATEGORIES),
  description: z.string().trim().min(1, 'descrição é obrigatória').max(200, 'descrição inválida'),
  amountCents: z.number().int('valor deve ser inteiro').min(1, 'valor deve ser positivo'),
  dueDate: calendarDateSchema,
  caseId: idSchema.optional(),
});

const kindCategory = (data: { kind?: TransactionKind; category?: TransactionCategory }) =>
  !data.kind || !data.category || (TRANSACTION_CATEGORIES[data.kind] as readonly string[]).includes(data.category);

export const createTransactionSchema = transactionFields
  .strict()
  .refine(kindCategory, { message: 'categoria não pertence à natureza', path: ['category'] });
export type CreateTransaction = z.infer<typeof createTransactionSchema>;

export const updateTransactionSchema = transactionFields
  .partial()
  .extend({ status: z.enum(TRANSACTION_STATUS).optional(), settledDate: calendarDateSchema.optional() })
  .strict()
  .refine(kindCategory, { message: 'categoria não pertence à natureza', path: ['category'] });
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;

// Partial receipt of a fee (AD-111): amount, day it hit the account and the account.
export const createInstallmentSchema = z
  .object({
    amountCents: z.number().int('valor deve ser inteiro').min(1, 'valor deve ser positivo'),
    date: calendarDateSchema,
    account: z.string().trim().max(120, 'conta inválida').optional(),
  })
  .strict();
export type CreateInstallment = z.infer<typeof createInstallmentSchema>;
