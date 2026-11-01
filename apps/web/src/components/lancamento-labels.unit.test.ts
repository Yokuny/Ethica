import { describe, expect, it } from 'vitest';
import type { LancamentoRecord } from '@/query/lancamento.js';
import { transactionState } from './lancamento-labels.js';

const lancamento = (status: LancamentoRecord['status'], vencimento: string) =>
  ({ status, vencimento, parcelas: [] }) as unknown as LancamentoRecord;

describe('transactionState', () => {
  const today = '2026-11-10';

  it('previsto e parcial vencidos aparecem como atrasado; em dia mantêm o status', () => {
    expect(transactionState(lancamento('expected', '2026-11-09'), today)).toBe('overdue');
    expect(transactionState(lancamento('partial', '2026-11-09'), today)).toBe('overdue');
    expect(transactionState(lancamento('partial', '2026-11-10'), today)).toBe('partial');
  });

  it('liquidado e cancelado nunca atrasam', () => {
    expect(transactionState(lancamento('settled', '2026-01-01'), today)).toBe('settled');
    expect(transactionState(lancamento('canceled', '2026-01-01'), today)).toBe('canceled');
  });
});
