import { describe, expect, it, vi } from 'vitest';
import * as transactionRepository from './transaction.repository.js';
import { monthlyFlow, postFixedFees, summary, updateTransaction } from './transaction.service.js';

vi.mock('./transaction.repository.js', () => ({
  createTransaction: vi.fn(),
  findById: vi.fn(),
  findFixedFee: vi.fn(),
  updateTransaction: vi.fn(),
  updateIncome: vi.fn(),
  summary: vi.fn(),
  monthlyFlow: vi.fn(),
}));
vi.mock('../case/case.service.js', () => ({ getCase: vi.fn(), findSummariesByIds: vi.fn() }));

// 2026-10-29 15:00 em São Paulo.
const now = new Date('2026-10-29T18:00:00.000Z');

describe('transaction.service', () => {
  it('liquidar despesa sem data grava o dia de hoje no fuso de exibição', async () => {
    vi.mocked(transactionRepository.findById).mockResolvedValue({ id: 'l1', kind: 'expense' } as never);
    vi.mocked(transactionRepository.updateTransaction).mockResolvedValue({ id: 'l1' } as never);

    await updateTransaction('t1', 'l1', { status: 'settled' }, now);

    expect(transactionRepository.updateTransaction).toHaveBeenCalledWith('t1', 'l1', {
      status: 'settled',
      settledDate: '2026-10-29',
    });
  });

  it('resumo usa o mês corrente [01, 01 do mês seguinte)', async () => {
    await summary('t1', now);

    expect(transactionRepository.summary).toHaveBeenCalledWith('t1', {
      today: '2026-10-29',
      monthStart: '2026-10-01',
      nextMonthStart: '2026-11-01',
    });
  });

  it('fluxoMensal pede os N últimos meses até o atual, do mais antigo ao mais recente', async () => {
    await monthlyFlow('t1', 3, now);

    expect(transactionRepository.monthlyFlow).toHaveBeenCalledWith('t1', ['2026-08', '2026-09', '2026-10']);
  });

  it('honorários fixados sem lançamento anterior viram receita prevista com vencimento em 30 dias', async () => {
    vi.mocked(transactionRepository.findFixedFee).mockResolvedValue(null);
    await postFixedFees(
      {
        tenantId: 't1',
        caseId: 'p1',
        processNumber: '0001',
        amountCents: 500_000,
        category: 'fixed_fees' as const,
      },
      now,
    );

    expect(transactionRepository.createTransaction).toHaveBeenCalledWith('t1', {
      kind: 'income',
      category: 'fixed_fees',
      description: 'Honorários fixados — 0001',
      amountCents: 500_000,
      dueDate: '2026-11-28',
      caseId: 'p1',
    });
  });

  it('honorário contratado do assistente técnico vira receita contracted_fees (AD-135)', async () => {
    vi.mocked(transactionRepository.findFixedFee).mockResolvedValue(null);
    await postFixedFees(
      { tenantId: 't1', caseId: 'p1', processNumber: '0001', amountCents: 300_000, category: 'contracted_fees' },
      now,
    );

    expect(transactionRepository.createTransaction).toHaveBeenLastCalledWith(
      't1',
      expect.objectContaining({ category: 'contracted_fees', description: 'Honorários contratados — 0001' }),
    );
  });

  it('honorário fixado já lançado: o valor novo atualiza o mesmo lançamento (AD-111)', async () => {
    vi.mocked(transactionRepository.createTransaction).mockClear();
    vi.mocked(transactionRepository.findFixedFee).mockResolvedValue({ id: 'l9' } as never);
    vi.mocked(transactionRepository.updateIncome).mockResolvedValue({ id: 'l9' } as never);

    await postFixedFees(
      {
        tenantId: 't1',
        caseId: 'p1',
        processNumber: '0001',
        amountCents: 650_000,
        category: 'fixed_fees' as const,
      },
      now,
    );

    expect(transactionRepository.updateIncome).toHaveBeenCalledWith('t1', 'l9', { amountCents: 650_000 });
    expect(transactionRepository.createTransaction).not.toHaveBeenCalled();
  });

  it('honorário fixado reduzido abaixo do recebido rejeita (o bus só registra no log)', async () => {
    vi.mocked(transactionRepository.findFixedFee).mockResolvedValue({ id: 'l9' } as never);
    vi.mocked(transactionRepository.updateIncome).mockResolvedValue(null);

    await expect(
      postFixedFees(
        { tenantId: 't1', caseId: 'p1', processNumber: '0001', amountCents: 1, category: 'fixed_fees' as const },
        now,
      ),
    ).rejects.toMatchObject({ message: 'amount_below_received' });
  });
});
