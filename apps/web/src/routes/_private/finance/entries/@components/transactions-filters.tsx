import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { KIND_ITEMS, STATE_ITEMS } from '@/components/transaction-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { TransactionsSearch } from '../@interface/transactions.interface.js';

const ALL = '__all__';

// Filtros rápidos na própria barra da tabela: natureza e situação.
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
        {[{ value: ALL, label: t('all') }, ...KIND_ITEMS].map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
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
        {[{ value: ALL, label: t('all') }, ...STATE_ITEMS].map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );
}
