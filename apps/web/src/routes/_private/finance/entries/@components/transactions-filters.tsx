import { BadgeIndicator } from '@ethica/ui/components/badge';
import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { KIND_ITEMS, KIND_VARIANT, STATE_ITEMS, STATE_VARIANT } from '@/components/transaction-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionsSearch } from '../@interface/transactions.interface.js';

const ALL = '__all__';

// Quick filters on the table bar itself: kind and state, each a glued bar; every button carries the dot and, pressed,
// the tone of its badge in the table (income green, expense red, overdue red…).
export function TransactionsFilters({
  search,
  onChange,
}: {
  search: TransactionsSearch;
  onChange: (patch: Partial<TransactionsSearch>) => void;
}) {
  return (
    <>
      <ToggleGroup
        aria-label={t('nature')}
        value={search.kind ?? ALL}
        onValueChange={(value) =>
          onChange({ kind: value === ALL ? undefined : (value as TransactionsSearch['kind']), page: 1 })
        }
      >
        <ToggleGroupItem value={ALL}>{t('all')}</ToggleGroupItem>
        {KIND_ITEMS.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value} tone={KIND_VARIANT[item.value]}>
            <BadgeIndicator variant={KIND_VARIANT[item.value]} />
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        aria-label={t('status')}
        value={search.state ?? ALL}
        onValueChange={(value) =>
          onChange({ state: value === ALL ? undefined : (value as TransactionsSearch['state']), page: 1 })
        }
      >
        <ToggleGroupItem value={ALL}>{t('all')}</ToggleGroupItem>
        {STATE_ITEMS.map((item) => (
          <ToggleGroupItem key={item.value} value={item.value} tone={STATE_VARIANT[item.value]}>
            <BadgeIndicator variant={STATE_VARIANT[item.value]} />
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );
}
