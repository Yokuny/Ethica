import type { CaseRecord } from '@/query/case.js';
import type { TransactionRecord } from '@/query/transaction.js';

export type PaymentState = 'yes' | 'no' | 'partial';

// Service money (AD-159): payment comes from the receipts posted on the fees; the base is the fixed
// (or contracted) fee, else the proposed one; net = base − expenses that were not canceled.
export const caseFinance = (legalCase: CaseRecord, transactions: TransactionRecord[]) => {
  const income = transactions.filter((item) => item.kind === 'income');
  const expenses = transactions.filter((item) => item.kind === 'expense' && item.status !== 'canceled');
  const receivedCents = income.reduce((total, item) => total + (item.receivedCents ?? 0), 0);
  const expensesCents = expenses.reduce((total, item) => total + item.amountCents, 0);
  const baseCents = legalCase.fixedFeesCents ?? legalCase.proposedFeesCents ?? 0;
  // Without a base fee, paid means every posted fee was received.
  const dueCents = baseCents || income.reduce((total, item) => total + item.amountCents, 0);
  // The case's fee (fixed or contracted, AD-111/AD-135) still open: receipts go into it and lower its balance.
  const openFee = income.find(
    (item) =>
      (item.category === 'fixed_fees' || item.category === 'contracted_fees') &&
      item.status !== 'settled' &&
      item.status !== 'canceled',
  );
  const payment: PaymentState = receivedCents === 0 ? 'no' : dueCents && receivedCents >= dueCents ? 'yes' : 'partial';
  return { baseCents, receivedCents, expensesCents, netCents: baseCents - expensesCents, payment, expenses, openFee };
};
