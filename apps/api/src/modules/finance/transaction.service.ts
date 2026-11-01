import { dateInDisplayTz } from '@ethica/db';
import { CustomError, KeyedError } from '../../middlewares/errorHandler.middleware.js';
import * as caseService from '../case/case.service.js';
import * as transactionRepository from './transaction.repository.js';
import type {
  CaseFinanceSummary,
  CreateInstallment,
  CreateTransaction,
  FinanceReport,
  FinanceReportRow,
  ListTransactionsQuery,
  TransactionRecord,
  UpdateTransaction,
} from './transaction.schema.js';

export class TransactionNotFoundError extends KeyedError {}

// Default term to receive fixed fees when the court does not set a date.
const DAYS_TO_RECEIVE_FEES = 30;

const shiftMonth = (month: string, offset: number): string => {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, m - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
};

const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const withCaseNumber = async (tenantId: string, items: TransactionRecord[]): Promise<TransactionRecord[]> => {
  const ids = [...new Set(items.flatMap((item) => (item.caseId ? [item.caseId] : [])))];
  const summaries = await caseService.findSummariesByIds(tenantId, ids);
  return items.map((item) => {
    const summary = item.caseId ? summaries.get(item.caseId) : undefined;
    if (!summary) return item;
    return {
      ...item,
      caseNumber: summary.processNumber,
      ...(summary.client ? { client: summary.client } : {}),
    };
  });
};

// Settling without a date saves today.
const withLiquidacao = (data: UpdateTransaction, today: string): UpdateTransaction => {
  if (data.status === 'settled') return { ...data, settledDate: data.settledDate ?? today };
  return data;
};

export const createTransaction = async (tenantId: string, data: CreateTransaction): Promise<TransactionRecord> => {
  if (data.caseId) await caseService.getCase(tenantId, data.caseId);
  return transactionRepository.createTransaction(tenantId, data);
};

const findOrThrow = async (tenantId: string, id: string): Promise<TransactionRecord> => {
  const transaction = await transactionRepository.findById(tenantId, id);
  if (!transaction) throw new TransactionNotFoundError('not_found');
  return transaction;
};

// Fee (AD-111): the status comes from the installments, never from the form, and the amount does not go
// below what already hit the account. An expense keeps settle/reopen/cancel by hand.
// The kind does not change after posting: the status rules are different.
export const updateTransaction = async (
  tenantId: string,
  id: string,
  data: UpdateTransaction,
  now: Date = new Date(),
): Promise<TransactionRecord> => {
  const current = await findOrThrow(tenantId, id);
  if (data.kind && data.kind !== current.kind) throw new CustomError('invalid_data', 422);
  if (data.caseId) await caseService.getCase(tenantId, data.caseId);

  if (current.kind === 'income') {
    if (data.status || data.settledDate) throw new CustomError('fee_status_comes_from_parcels', 422);
    const updated = await transactionRepository.updateIncome(tenantId, id, data);
    if (!updated) throw new CustomError('amount_below_received', 422);
    return updated;
  }

  if (data.status === 'partial') throw new CustomError('invalid_data', 422);
  const updated = await transactionRepository.updateTransaction(
    tenantId,
    id,
    withLiquidacao(data, dateInDisplayTz(now)),
  );
  if (!updated) throw new TransactionNotFoundError('not_found');
  return updated;
};

export const deleteTransaction = async (tenantId: string, id: string): Promise<void> => {
  const current = await findOrThrow(tenantId, id);
  if (current.kind === 'income') throw new CustomError('fee_cannot_be_removed', 409);
  const { deletedCount } = await transactionRepository.deleteTransaction(tenantId, id);
  if (deletedCount === 0) throw new TransactionNotFoundError('not_found');
};

// Partial receipt (PRZ-02): the installment does not exceed the balance; the status is recalculated with it.
export const addInstallment = async (
  tenantId: string,
  id: string,
  installment: CreateInstallment,
): Promise<TransactionRecord> => {
  const current = await findOrThrow(tenantId, id);
  if (current.kind !== 'income') throw new CustomError('invalid_data', 422);
  const updated = await transactionRepository.addInstallment(tenantId, id, installment);
  if (!updated) throw new CustomError('parcel_exceeds_balance', 422);
  return updated;
};

export const reverseInstallment = async (
  tenantId: string,
  id: string,
  installmentId: string,
): Promise<TransactionRecord> => {
  const updated = await transactionRepository.removeInstallment(tenantId, id, installmentId);
  if (!updated) throw new TransactionNotFoundError('not_found');
  return updated;
};

export const listTransactions = async (tenantId: string, query: ListTransactionsQuery, now: Date = new Date()) => {
  const result = await transactionRepository.listTransactions(tenantId, query, dateInDisplayTz(now));
  return { ...result, items: await withCaseNumber(tenantId, result.items) };
};

export const summary = (tenantId: string, now: Date = new Date()) => {
  const today = dateInDisplayTz(now);
  const month = today.slice(0, 7);
  return transactionRepository.summary(tenantId, {
    today,
    monthStart: `${month}-01`,
    nextMonthStart: `${shiftMonth(month, 1)}-01`,
  });
};

// The last `months` months up to the current one, from oldest to newest.
export const monthlyFlow = (tenantId: string, months: number, now: Date = new Date()) => {
  const month = dateInDisplayTz(now).slice(0, 7);
  return transactionRepository.monthlyFlow(
    tenantId,
    Array.from({ length: months }, (_, index) => shiftMonth(month, index - months + 1)),
  );
};

export const totalsByCategory = (tenantId: string, kind: string) =>
  transactionRepository.totalsByCategory(tenantId, kind);

const soma = (rows: FinanceReportRow[]) => rows.reduce((total, row) => total + row.amountCents, 0);

// DOC-03: inclusive dates. Canceled does not count; a fee counts by its installments (AD-111).
export const reportPeriod = async (tenantId: string, period: { from: string; to: string }): Promise<FinanceReport> => {
  const inPeriod = (day?: string): day is string => Boolean(day && day >= period.from && day <= period.to);
  const items = await withCaseNumber(
    tenantId,
    (await transactionRepository.listAll(tenantId, { period })).filter((item) => item.status !== 'canceled'),
  );
  const row = (item: TransactionRecord, date: string, amountCents: number, account?: string) => ({
    date,
    description: item.client ? `${item.description} · contratante: ${item.client}` : item.description,
    category: item.category,
    amountCents,
    ...(item.caseNumber ? { caseNumber: item.caseNumber } : {}),
    ...(account ? { account } : {}),
  });
  const income = items.filter((item) => item.kind === 'income');
  const expenses = items.filter((item) => item.kind === 'expense');
  const received = income
    .flatMap((item) =>
      item.installments
        .filter((installment) => inPeriod(installment.date))
        .map((p) => row(item, p.date, p.amountCents, p.account)),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  const paid = expenses
    .filter((item) => item.status === 'settled' && inPeriod(item.settledDate))
    .map((item) => row(item, item.settledDate as string, item.amountCents))
    .sort((a, b) => a.date.localeCompare(b.date));
  const receivable = income
    .filter((item) => (item.balanceCents ?? 0) > 0 && inPeriod(item.dueDate))
    .map((item) => row(item, item.dueDate, item.balanceCents as number));
  const payable = expenses
    .filter((item) => item.status === 'expected' && inPeriod(item.dueDate))
    .map((item) => row(item, item.dueDate, item.amountCents));
  const receivedCents = soma(received);
  const paidCents = soma(paid);
  const receivableCents = soma(receivable);
  const payableCents = soma(payable);
  return {
    received,
    paid,
    receivable,
    payable,
    totals: {
      receivedCents,
      paidCents,
      actualBalanceCents: receivedCents - paidCents,
      receivableCents,
      payableCents,
      expectedBalanceCents: receivedCents - paidCents + receivableCents - payableCents,
    },
  };
};

export const caseSummary = async (tenantId: string, caseId: string): Promise<CaseFinanceSummary> => {
  const items = (await transactionRepository.listAll(tenantId, { caseId })).filter(
    (item) => item.status !== 'canceled',
  );
  const income = items.filter((item) => item.kind === 'income');
  const feesCents = income.reduce((total, item) => total + item.amountCents, 0);
  const receivedCents = income.reduce((total, item) => total + (item.receivedCents ?? 0), 0);
  return {
    feesCents,
    receivedCents,
    balanceCents: feesCents - receivedCents,
    expensesCents: items.filter((item) => item.kind === 'expense').reduce((total, item) => total + item.amountCents, 0),
  };
};

export const listForExport = (tenantId: string) => transactionRepository.listAll(tenantId);

// Subscriber of `case:fixed_fees`: the fee becomes receivable income. If the case
// already has the fixed fee posted, only the amount changes (AD-111) — rejected if it goes below
// what was received, which the bus only records in the log.
export const postFixedFees = async (
  input: {
    tenantId: string;
    caseId: string;
    processNumber: string;
    amountCents: number;
    category: 'fixed_fees' | 'contracted_fees';
  },
  now: Date = new Date(),
): Promise<void> => {
  const existing = await transactionRepository.findFixedFee(input.tenantId, input.caseId);
  if (existing) {
    const updated = await transactionRepository.updateIncome(input.tenantId, existing.id, {
      amountCents: input.amountCents,
    });
    if (!updated) throw new CustomError('amount_below_received', 422);
    return;
  }
  await transactionRepository.createTransaction(input.tenantId, {
    kind: 'income',
    category: input.category,
    description: `${input.category === 'contracted_fees' ? 'Honorários contratados' : 'Honorários fixados'} — ${input.processNumber}`,
    amountCents: input.amountCents,
    dueDate: addDays(dateInDisplayTz(now), DAYS_TO_RECEIVE_FEES),
    caseId: input.caseId,
  });
};
