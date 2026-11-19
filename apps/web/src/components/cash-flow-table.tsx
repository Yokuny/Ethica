import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { MonthHeatTable } from '@/components/month-heat-table.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { MonthlyFlow } from '@/query/transaction.js';

const columns = [
  { key: 'received', label: t('received') },
  { key: 'receivable', label: t('receivable') },
  { key: 'expenses', label: t('expenses') },
  { key: 'balance', label: t('balance'), balance: true },
];

const changeFormat = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  style: 'currency',
  currency: 'BRL',
  signDisplay: 'exceptZero',
});

// Cash flow (AD-235): the period balance on top and, below, received, receivable, expenses and balance (received
// minus expenses) month by month. `data` comes with one month more at the start, the base of the first change.
export function CashFlowTable({ data }: { data: MonthlyFlow[] }) {
  const period = data.slice(1);
  const received = period.reduce((sum, row) => sum + row.receivedCents, 0);
  const expenses = period.reduce((sum, row) => sum + row.expensesCents, 0);
  const rows = data.map((row) => ({
    month: row.month,
    values: {
      received: row.receivedCents,
      receivable: row.receivableCents,
      expenses: row.expensesCents,
      balance: row.receivedCents - row.expensesCents,
    },
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <ItemDescription>{t('balance_of_period')}</ItemDescription>
        <ItemTitle className="text-3xl font-medium tracking-tight tabular-nums text-impact">
          {formatMoney(received - expenses)}
        </ItemTitle>
        <ItemDescription className="tabular-nums">
          {`${t('received')} ${formatMoney(received)} · ${t('expenses')} ${formatMoney(expenses)}`}
        </ItemDescription>
      </div>
      <MonthHeatTable
        base
        columns={columns}
        rows={rows}
        format={formatMoney}
        formatChange={(cents) => changeFormat.format(cents / 100)}
      />
    </div>
  );
}
