import { describe, expect, it, vi } from 'vitest';
import * as lancamentoRepository from './lancamento.repository.js';
import { fluxoMensal, lancarHonorariosFixados, resumo, updateLancamento } from './lancamento.service.js';

vi.mock('./lancamento.repository.js', () => ({
  createLancamento: vi.fn(),
  findById: vi.fn(),
  findHonorarioFixado: vi.fn(),
  updateLancamento: vi.fn(),
  updateReceita: vi.fn(),
  resumo: vi.fn(),
  fluxoMensal: vi.fn(),
}));
vi.mock('../pericia/pericia.service.js', () => ({ getPericia: vi.fn(), findResumosByIds: vi.fn() }));

// 2026-10-29 15:00 em São Paulo.
const now = new Date('2026-10-29T18:00:00.000Z');

describe('lancamento.service', () => {
  it('liquidar despesa sem data grava o dia de hoje no fuso de exibição', async () => {
    vi.mocked(lancamentoRepository.findById).mockResolvedValue({ id: 'l1', natureza: 'expense' } as never);
    vi.mocked(lancamentoRepository.updateLancamento).mockResolvedValue({ id: 'l1' } as never);

    await updateLancamento('t1', 'l1', { status: 'settled' }, now);

    expect(lancamentoRepository.updateLancamento).toHaveBeenCalledWith('t1', 'l1', {
      status: 'settled',
      liquidadoEm: '2026-10-29',
    });
  });

  it('resumo usa o mês corrente [01, 01 do mês seguinte)', async () => {
    await resumo('t1', now);

    expect(lancamentoRepository.resumo).toHaveBeenCalledWith('t1', {
      today: '2026-10-29',
      monthStart: '2026-10-01',
      nextMonthStart: '2026-11-01',
    });
  });

  it('fluxoMensal pede os N últimos meses até o atual, do mais antigo ao mais recente', async () => {
    await fluxoMensal('t1', 3, now);

    expect(lancamentoRepository.fluxoMensal).toHaveBeenCalledWith('t1', ['2026-08', '2026-09', '2026-10']);
  });

  it('honorários fixados sem lançamento anterior viram receita prevista com vencimento em 30 dias', async () => {
    vi.mocked(lancamentoRepository.findHonorarioFixado).mockResolvedValue(null);
    await lancarHonorariosFixados(
      {
        tenantId: 't1',
        periciaId: 'p1',
        numeroProcesso: '0001',
        valorCents: 500_000,
        categoria: 'fixed_fees' as const,
      },
      now,
    );

    expect(lancamentoRepository.createLancamento).toHaveBeenCalledWith('t1', {
      natureza: 'income',
      categoria: 'fixed_fees',
      descricao: 'Honorários fixados — 0001',
      valorCents: 500_000,
      vencimento: '2026-11-28',
      periciaId: 'p1',
    });
  });

  it('honorário contratado do assistente técnico vira receita contracted_fees (AD-135)', async () => {
    vi.mocked(lancamentoRepository.findHonorarioFixado).mockResolvedValue(null);
    await lancarHonorariosFixados(
      { tenantId: 't1', periciaId: 'p1', numeroProcesso: '0001', valorCents: 300_000, categoria: 'contracted_fees' },
      now,
    );

    expect(lancamentoRepository.createLancamento).toHaveBeenLastCalledWith(
      't1',
      expect.objectContaining({ categoria: 'contracted_fees', descricao: 'Honorários contratados — 0001' }),
    );
  });

  it('honorário fixado já lançado: o valor novo atualiza o mesmo lançamento (AD-111)', async () => {
    vi.mocked(lancamentoRepository.createLancamento).mockClear();
    vi.mocked(lancamentoRepository.findHonorarioFixado).mockResolvedValue({ id: 'l9' } as never);
    vi.mocked(lancamentoRepository.updateReceita).mockResolvedValue({ id: 'l9' } as never);

    await lancarHonorariosFixados(
      {
        tenantId: 't1',
        periciaId: 'p1',
        numeroProcesso: '0001',
        valorCents: 650_000,
        categoria: 'fixed_fees' as const,
      },
      now,
    );

    expect(lancamentoRepository.updateReceita).toHaveBeenCalledWith('t1', 'l9', { valorCents: 650_000 });
    expect(lancamentoRepository.createLancamento).not.toHaveBeenCalled();
  });

  it('honorário fixado reduzido abaixo do recebido rejeita (o bus só registra no log)', async () => {
    vi.mocked(lancamentoRepository.findHonorarioFixado).mockResolvedValue({ id: 'l9' } as never);
    vi.mocked(lancamentoRepository.updateReceita).mockResolvedValue(null);

    await expect(
      lancarHonorariosFixados(
        { tenantId: 't1', periciaId: 'p1', numeroProcesso: '0001', valorCents: 1, categoria: 'fixed_fees' as const },
        now,
      ),
    ).rejects.toMatchObject({ message: 'amount_below_received' });
  });
});
