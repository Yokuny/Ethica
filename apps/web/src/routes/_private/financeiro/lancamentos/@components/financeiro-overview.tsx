import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { FinanceiroResumo } from '@/query/lancamento.js';

const show = (value: number | undefined) => (value === undefined ? '—' : formatMoney(value));

// Raio-X do dinheiro: a receber, atrasado, recebido e despesas do mês.
export function FinanceiroOverview({ resumo }: { resumo?: FinanceiroResumo }) {
  return (
    <RecordStats variant="band" role="group" aria-label={t('financeiro')}>
      <RecordStat label={t('receivable')} value={show(resumo?.aReceberCents)} />
      <RecordStat label={t('overdue')} value={show(resumo?.atrasadoCents)} />
      <RecordStat label={t('received_this_month')} value={show(resumo?.recebidoMesCents)} />
      <RecordStat label={t('expenses_this_month')} value={show(resumo?.despesasMesCents)} />
    </RecordStats>
  );
}
