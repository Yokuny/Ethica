import type {
  CreateInstallment,
  CreateTransaction,
  TransactionCategory,
  TransactionKind,
  TransactionStatus,
  UpdateTransaction,
} from '@ethica/contracts';
import {
  calendarDateSchema,
  createInstallmentSchema,
  createTransactionSchema,
  idSchema,
  TRANSACTION_KINDS,
  TRANSACTION_STATUS,
  updateTransactionSchema,
} from '@ethica/contracts';
import type { RequestHandler } from 'express';
import { z } from 'zod';

export type { CreateInstallment, CreateTransaction, UpdateTransaction };
export { createInstallmentSchema, createTransactionSchema, updateTransactionSchema };

export const transactionIdParamSchema = z.object({ id: idSchema }).strict();
export const installmentIdParamSchema = z.object({ id: idSchema, installmentId: idSchema }).strict();

// `overdue` is a derived slice (expected or partial with a due date before today), not a stored status.
export const listTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    kind: z.enum(TRANSACTION_KINDS).optional(),
    state: z.enum([...TRANSACTION_STATUS, 'overdue']).optional(),
    caseId: idSchema.optional(),
    from: calendarDateSchema.optional(),
    to: calendarDateSchema.optional(),
  })
  .strict();
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export const flowQuerySchema = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) }).strict();
export type FlowQuery = z.infer<typeof flowQuerySchema>;

export const categoriesQuerySchema = z.object({ kind: z.enum(TRANSACTION_KINDS) }).strict();

export type FinanceRouterDeps = { validToken: RequestHandler };

export type TransactionRecord = {
  id: string;
  kind: TransactionKind;
  category: TransactionCategory;
  description: string;
  amountCents: number;
  dueDate: string;
  status: TransactionStatus;
  settledDate?: string;
  // Income only (AD-111): received installments, received sum and what is left to receive.
  installments: InstallmentRecord[];
  receivedCents?: number;
  balanceCents?: number;
  caseId?: string;
  caseNumber?: string;
  // Whoever hired the case's technical assistant (AD-135).
  client?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InstallmentRecord = { id: string; amountCents: number; date: string; account?: string };

// X-ray view: what is receivable, what came in and went out in the month and what is overdue.
export type FinanceSummary = {
  receivableCents: number;
  lateCents: number;
  receivedMonthCents: number;
  expensesMonthCents: number;
};

export type MonthlyFlow = {
  month: string;
  receivedCents: number;
  receivableCents: number;
  expensesCents: number;
};

// Finance report for a period (DOC-03): the actual (received installments and expenses
// paid in the period) and the expected (fee balance and payable expenses due in it).
export type FinanceReportRow = {
  date: string;
  description: string;
  category: TransactionCategory;
  amountCents: number;
  caseNumber?: string;
  account?: string;
};

export type FinanceReport = {
  received: FinanceReportRow[];
  paid: FinanceReportRow[];
  receivable: FinanceReportRow[];
  payable: FinanceReportRow[];
  totals: {
    receivedCents: number;
    paidCents: number;
    actualBalanceCents: number;
    receivableCents: number;
    payableCents: number;
    expectedBalanceCents: number;
  };
};

// Finance summary on the case sheet (DOC-02), only for admin/manager (AD-107).
export type CaseFinanceSummary = {
  feesCents: number;
  receivedCents: number;
  balanceCents: number;
  expensesCents: number;
};

export type CategoryTotal = { category: TransactionCategory; totalCents: number };
