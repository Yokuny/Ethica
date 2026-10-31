import { describe, expect, it, vi } from 'vitest';
import * as lancamentoRepository from './lancamento.repository.js';
import { fluxoMensal, lancarHonorariosFixados, resumo, updateLancamento } from './lancamento.service.js';

vi.mock('./lancamento.repository.js', () => ({
  createLancamento: vi.fn(),
  updateLancamento: vi.fn(),
  resumo: vi.fn(),
  fluxoMensal: vi.fn(),
}));
vi.mock('../pericia/pericia.service.js', () => ({ getPericia: vi.fn(), findResumosByIds: vi.fn() }));

// 2026-10-29 15:00 em São Paulo.
const now = new Date('2026-10-29T18:00:00.000Z');

describe('lancamento.service', () => {
  it('liquidar sem data grava o dia de hoje no fuso de exibição', async () => {
    vi.mocked(lancamentoRepository.updateLancamento).mockResolvedValue({ id: 'l1' } as never);

    await updateLancamento('t1', 'l1', { status: 'liquidado' }, now);

    expect(lancamentoRepository.updateLancamento).toHaveBeenCalledWith('t1', 'l1', {
      status: 'liquidado',
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

  it('honorários fixados viram receita prevista com vencimento em 30 dias', async () => {
    await lancarHonorariosFixados(
      { tenantId: 't1', periciaId: 'p1', numeroProcesso: '0001', valorCents: 500_000 },
      now,
    );

    expect(lancamentoRepository.createLancamento).toHaveBeenCalledWith('t1', {
      natureza: 'receita',
      categoria: 'honorarios_fixados',
      descricao: 'Honorários fixados — 0001',
      valorCents: 500_000,
      vencimento: '2026-11-28',
      periciaId: 'p1',
    });
  });
});
