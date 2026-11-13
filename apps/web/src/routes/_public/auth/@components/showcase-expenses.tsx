import type { TransactionCategory } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Separator } from '@ethica/ui/components/separator';
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
  { kind: 'expense', category: 'third_parties', cents: 22_000, state: 'expected', days: 9 },
];
const EXPENSES_CENTS = ENTRIES.filter((entry) => entry.kind === 'expense').reduce(
  (total, entry) => total + entry.cents,
  0,
);
const FIGURES = [
  { label: t('base_fees'), value: formatMoney(BASE_CENTS) },
  { label: t('received'), value: formatMoney(325_000) },
  { label: t('expenses'), value: formatMoney(EXPENSES_CENTS) },
  { label: t('net_fees'), value: formatMoney(BASE_CENTS - EXPENSES_CENTS) },
];

export function ShowcaseExpenses() {
  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        {FIGURES.map((figure) => (
          <div key={figure.label} className="flex flex-col gap-1">
            <ItemDescription className="text-[10px] uppercase tracking-wide">{figure.label}</ItemDescription>
            <ItemTitle className="font-medium text-base tabular-nums">{figure.value}</ItemTitle>
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        {ENTRIES.map((entry) => (
          <div key={entry.category} className="flex flex-col">
            <Separator />
            <div className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <ItemTitle className="block w-full truncate font-normal text-xs">
                  {categoryLabel({ category: entry.category })}
                </ItemTitle>
                <ItemDescription className="text-[10px]">
                  {formatDate(new Date(`${addDaysToDisplayDate(TODAY, entry.days)}T12:00:00`))}
                </ItemDescription>
              </div>
              <Badge variant={STATE_VARIANT[entry.state]} className="text-[9px] uppercase tracking-wide">
                {stateLabel(entry.state)}
              </Badge>
              <ItemTitle className="w-20 justify-end font-normal sm:w-24 text-xs tabular-nums">
                {`${entry.kind === 'expense' ? '−' : ''}${formatMoney(entry.cents)}`}
              </ItemTitle>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
