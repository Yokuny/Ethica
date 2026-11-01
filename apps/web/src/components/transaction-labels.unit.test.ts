import { describe, expect, it } from 'vitest';
import type { TransactionRecord } from '@/query/transaction.js';
import { transactionState } from './transaction-labels.js';

const transaction = (status: TransactionRecord['status'], dueDate: string) =>
  ({ status, dueDate, installments: [] }) as unknown as TransactionRecord;

describe('transactionState', () => {
  const today = '2026-11-10';

  it('previsto e parcial vencidos aparecem como atrasado; em dia mantêm o status', () => {
    expect(transactionState(transaction('expected', '2026-11-09'), today)).toBe('overdue');
    expect(transactionState(transaction('partial', '2026-11-09'), today)).toBe('overdue');
    expect(transactionState(transaction('partial', '2026-11-10'), today)).toBe('partial');
  });

  it('liquidado e cancelado nunca atrasam', () => {
    expect(transactionState(transaction('settled', '2026-01-01'), today)).toBe('settled');
    expect(transactionState(transaction('canceled', '2026-01-01'), today)).toBe('canceled');
  });
});
