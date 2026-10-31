import { LANCAMENTO_CATEGORIAS, LANCAMENTO_NATUREZAS, type LancamentoNatureza } from '@ethica/contracts';
import type { IndicatorVariant } from '@ethica/ui/components/badge';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LancamentoRecord, LancamentoSituacao } from '@/query/lancamento.js';

// `atrasado` é derivado na tela: previsto ou parcial com vencimento antes de hoje.
export const situacaoDoLancamento = (lancamento: LancamentoRecord, today: string): LancamentoSituacao =>
  (lancamento.status === 'expected' || lancamento.status === 'partial') && lancamento.vencimento < today
    ? 'overdue'
    : lancamento.status;

export const SITUACAO_VARIANT: Record<LancamentoSituacao, IndicatorVariant> = {
  expected: 'info',
  partial: 'warning',
  settled: 'success',
  canceled: 'neutral',
  overdue: 'error',
};

export const SITUACAO_ITEMS = (['expected', 'partial', 'overdue', 'settled', 'canceled'] as const).map((value) => ({
  value,
  label: t(value),
}));

export const NATUREZA_ITEMS = LANCAMENTO_NATUREZAS.map((value) => ({ value, label: t(value) }));

export const categoriaItems = (natureza: LancamentoNatureza) =>
  LANCAMENTO_CATEGORIAS[natureza].map((value) => ({ value, label: t(value) }));
