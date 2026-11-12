import type { TransactionCategory } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Wallet } from 'lucide-react';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { RecordStat, RecordStats } from '@/components/record.js';
import { categoryLabel, STATE_VARIANT, stateLabel } from '@/components/transaction-labels.js';
import { addDaysToDisplayDate, formatDisplayDate } from '@/lib/helpers/displayTime.helper.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { formatMoney } from '@/lib/helpers/money.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';

// APA-10: the money of one service — fee, payment, expenses and net fee, with its entries — as in
// expert-cases/details/@components/case-finance.tsx.

const TODAY = formatDisplayDate(new Date());
const BASE_CENTS = 650_000;
const ENTRIES: {
  kind: 'income' | 'expense';
  category: TransactionCategory;
  cents: number;
  state: keyof typeof STATE_VARIANT;
  days: number;
}[] = [
  { kind: 'income', category: 'advance_fees', cents: 325_000, state: 'settled', days: -20 },
  { kind: 'expense', category: 'travel', cents: 8_290, state: 'settled', days: -6 },
  { kind: 'expense', category: 'equipment', cents: 38_000, state: 'settled', days: -4 },
  { kind: 'expense', category: 'fees_and_taxes', cents: 14_950, state: 'expected', days: 3 },
];
const EXPENSES_CENTS = ENTRIES.filter((entry) => entry.kind === 'expense').reduce(
  (total, entry) => total + entry.cents,
  0,
);

export function ShowcaseExpenses() {
  return (
    <Panel
      icon={<Wallet />}
      size="sm"
      title={t('service_finance')}
      description={t('service_finance_description')}
      actions={<Button variant="outline">{t('add_expense')}</Button>}
    >
      <RecordStats columns={2}>
        <RecordStat label={t('base_fees')} value={formatMoney(BASE_CENTS)} />
        <RecordStat label={t('payment')} value={t('partial')} hint={`${t('received')}: ${formatMoney(325_000)}`} />
        <RecordStat label={t('expenses')} value={formatMoney(EXPENSES_CENTS)} />
        <RecordStat label={t('net_fees')} value={formatMoney(BASE_CENTS - EXPENSES_CENTS)} />
      </RecordStats>
      <LinkList>
        {ENTRIES.map((entry) => (
          <LinkListItem
            key={entry.category}
            icon={Wallet}
            title={`${entry.kind === 'expense' ? '−' : ''}${formatMoney(entry.cents)}`}
            badges={<Badge variant={STATE_VARIANT[entry.state]}>{stateLabel(entry.state)}</Badge>}
            description={`${categoryLabel({ category: entry.category })} · ${formatDate(
              new Date(`${addDaysToDisplayDate(TODAY, entry.days)}T12:00:00`),
            )}`}
          />
        ))}
      </LinkList>
    </Panel>
  );
}
