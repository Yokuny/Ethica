import { describe, expect, it } from 'vitest';
import type { CaseRecord } from '@/query/case.js';
import type { TransactionRecord } from '@/query/transaction.js';
import { caseFinance } from './case-finance.js';

const legalCase = { fixedFeesCents: 300_000 } as CaseRecord;
const fee = (receivedCents: number) =>
  ({ kind: 'income', amountCents: 300_000, receivedCents, status: 'expected' }) as TransactionRecord;
const expense = (amountCents: number, status: TransactionRecord['status'] = 'expected') =>
  ({ kind: 'expense', amountCents, status }) as TransactionRecord;

describe('caseFinance (SRV-04, SRV-05)', () => {
  it('pagamento: Não sem recebimento, Parcial abaixo do honorário, Sim ao alcançar', () => {
    expect(caseFinance(legalCase, [fee(0)]).payment).toBe('no');
    expect(caseFinance(legalCase, [fee(100_000)]).payment).toBe('partial');
    expect(caseFinance(legalCase, [fee(300_000)]).payment).toBe('yes');
  });

  it('sem honorário fixado usa o proposto; sem nenhum, o que foi lançado', () => {
    expect(caseFinance({ proposedFeesCents: 100_000 } as CaseRecord, [fee(100_000)]).baseCents).toBe(100_000);
    expect(caseFinance({} as CaseRecord, [fee(300_000)]).payment).toBe('yes');
  });

  it('líquido desconta as despesas não canceladas', () => {
    const result = caseFinance(legalCase, [fee(0), expense(20_000), expense(5_000, 'canceled'), expense(10_000)]);
    expect(result.expensesCents).toBe(30_000);
    expect(result.netCents).toBe(270_000);
  });
});
