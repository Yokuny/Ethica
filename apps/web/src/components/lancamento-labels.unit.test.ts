import { describe, expect, it } from 'vitest';
import type { LancamentoRecord } from '@/query/lancamento.js';
import { situacaoDoLancamento } from './lancamento-labels.js';

const lancamento = (status: LancamentoRecord['status'], vencimento: string) =>
  ({ status, vencimento, parcelas: [] }) as unknown as LancamentoRecord;

describe('situacaoDoLancamento', () => {
  const today = '2026-11-10';

  it('previsto e parcial vencidos aparecem como atrasado; em dia mantêm o status', () => {
    expect(situacaoDoLancamento(lancamento('previsto', '2026-11-09'), today)).toBe('atrasado');
    expect(situacaoDoLancamento(lancamento('parcial', '2026-11-09'), today)).toBe('atrasado');
    expect(situacaoDoLancamento(lancamento('parcial', '2026-11-10'), today)).toBe('parcial');
  });

  it('liquidado e cancelado nunca atrasam', () => {
    expect(situacaoDoLancamento(lancamento('liquidado', '2026-01-01'), today)).toBe('liquidado');
    expect(situacaoDoLancamento(lancamento('cancelado', '2026-01-01'), today)).toBe('cancelado');
  });
});
