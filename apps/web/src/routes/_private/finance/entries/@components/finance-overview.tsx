import { RecordStat, RecordStats } from '@/components/record.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { FinanceSummary } from '@/query/transaction.js';

const show = (value: number | undefined) => (value === undefined ? '—' : formatMoney(value));

// Money X-ray: receivable, overdue, received and expenses of the month.
export function FinanceOverview({ summary }: { summary?: FinanceSummary }) {
  return (
    <RecordStats variant="band" role="group" aria-label={t('finance')}>
      <RecordStat label={t('receivable')} value={show(summary?.receivableCents)} />
      <RecordStat label={t('overdue')} value={show(summary?.lateCents)} />
      <RecordStat label={t('received_this_month')} value={show(summary?.receivedMonthCents)} />
      <RecordStat label={t('expenses_this_month')} value={show(summary?.expensesMonthCents)} />
    </RecordStats>
  );
}
