import { z } from 'zod';
import { calendarDateSchema } from './date.schema.js';
import { idSchema } from './id.schema.js';

// Receita (honorário a receber) e despesa operacional ficam separadas por natureza.
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

// `previsto` vencido aparece como atrasado na tela; não é um status gravado.
// Receita (honorário, AD-111): status derivado das parcelas — previsto, parcial ou liquidado —
// e nunca cancelado. Despesa: previsto, liquidado ou cancelado, sem parcial.
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

// Recebimento parcial de um honorário (AD-111): valor, dia em que caiu na conta e a conta.
export const createInstallmentSchema = z
  .object({
    amountCents: z.number().int('valor deve ser inteiro').min(1, 'valor deve ser positivo'),
    date: calendarDateSchema,
    account: z.string().trim().max(120, 'conta inválida').optional(),
  })
  .strict();
export type CreateInstallment = z.infer<typeof createInstallmentSchema>;
