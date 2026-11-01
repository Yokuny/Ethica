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

// Prazo padrão para receber honorários fixados quando o juízo não define data.
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

// Liquidar sem informar a data grava o dia de hoje.
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

// Honorário (AD-111): o status vem das parcelas, nunca do formulário, e o valor não fica
// abaixo do que já entrou na conta. Despesa segue com liquidar/reabrir/cancelar à mão.
// A natureza não muda depois de lançada: as regras de status são diferentes.
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

// Recebimento parcial (PRZ-02): a parcela não passa do saldo; o status é recalculado junto.
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

// Os últimos `meses` meses até o atual, do mais antigo para o mais recente.
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

// DOC-03: datas inclusivas. Cancelado não entra; honorário conta pelas parcelas (AD-111).
export const reportPeriod = async (tenantId: string, period: { from: string; to: string }): Promise<FinanceReport> => {
  const inPeriod = (day?: string): day is string => Boolean(day && day >= period.from && day <= period.to);
  const itens = await withCaseNumber(
    tenantId,
    (await transactionRepository.listAll(tenantId, { period })).filter((item) => item.status !== 'canceled'),
  );
  const row = (item: TransactionRecord, data: string, amountCents: number, account?: string) => ({
    data,
    descricao: item.client ? `${item.descricao} · contratante: ${item.client}` : item.descricao,
    category: item.category,
    amountCents,
    ...(item.caseNumber ? { caseNumber: item.caseNumber } : {}),
    ...(account ? { account } : {}),
  });
  const income = itens.filter((item) => item.kind === 'income');
  const expenses = itens.filter((item) => item.kind === 'expense');
  const received = income
    .flatMap((item) =>
      item.installments
        .filter((installment) => inPeriod(installment.data))
        .map((p) => row(item, p.data, p.amountCents, p.account)),
    )
    .sort((a, b) => a.data.localeCompare(b.data));
  const paid = expenses
    .filter((item) => item.status === 'settled' && inPeriod(item.settledDate))
    .map((item) => row(item, item.settledDate as string, item.amountCents))
    .sort((a, b) => a.data.localeCompare(b.data));
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
  const itens = (await transactionRepository.listAll(tenantId, { caseId })).filter(
    (item) => item.status !== 'canceled',
  );
  const income = itens.filter((item) => item.kind === 'income');
  const feesCents = income.reduce((total, item) => total + item.amountCents, 0);
  const receivedCents = income.reduce((total, item) => total + (item.receivedCents ?? 0), 0);
  return {
    feesCents,
    receivedCents,
    balanceCents: feesCents - receivedCents,
    expensesCents: itens.filter((item) => item.kind === 'expense').reduce((total, item) => total + item.amountCents, 0),
  };
};

export const listForExport = (tenantId: string) => transactionRepository.listAll(tenantId);

// Subscriber de `pericia:honorarios_fixados`: o honorário vira receita a receber. Se a perícia
// já tem o honorário fixado lançado, só o valor muda (AD-111) — recusado se ficar abaixo do
// recebido, o que o bus apenas registra no log.
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
  const existente = await transactionRepository.findFixedFee(input.tenantId, input.caseId);
  if (existente) {
    const updated = await transactionRepository.updateIncome(input.tenantId, existente.id, {
      amountCents: input.amountCents,
    });
    if (!updated) throw new CustomError('amount_below_received', 422);
    return;
  }
  await transactionRepository.createTransaction(input.tenantId, {
    kind: 'income',
    category: input.category,
    descricao: `${input.category === 'contracted_fees' ? 'Honorários contratados' : 'Honorários fixados'} — ${input.processNumber}`,
    amountCents: input.amountCents,
    dueDate: addDays(dateInDisplayTz(now), DAYS_TO_RECEIVE_FEES),
    caseId: input.caseId,
  });
};
