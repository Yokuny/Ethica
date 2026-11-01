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

// `atrasado` é um recorte derivado (previsto ou parcial com vencimento antes de hoje), não um status gravado.
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
  descricao: string;
  amountCents: number;
  dueDate: string;
  status: TransactionStatus;
  settledDate?: string;
  // Só receita (AD-111): parcelas recebidas, soma recebida e o que falta receber.
  installments: InstallmentRecord[];
  receivedCents?: number;
  balanceCents?: number;
  caseId?: string;
  caseNumber?: string;
  // Quem contratou o assistente técnico da perícia (AD-135).
  client?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InstallmentRecord = { id: string; amountCents: number; data: string; account?: string };

// Visão de raio-X: o que está a receber, o que entrou e saiu no mês e o que atrasou.
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

// Relatório financeiro de um período (DOC-03): o realizado (parcelas recebidas e despesas
// pagas no período) e o previsto (saldo de honorários e despesas a pagar que vencem nele).
export type FinanceReportRow = {
  data: string;
  descricao: string;
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

// Resumo financeiro na ficha da perícia (DOC-02), só para admin/manager (AD-107).
export type CaseFinanceSummary = {
  feesCents: number;
  receivedCents: number;
  balanceCents: number;
  expensesCents: number;
};

export type CategoryTotal = { category: TransactionCategory; totalCents: number };
