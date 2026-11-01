import { ToggleGroup, ToggleGroupItem } from '@ethica/ui/components/toggle-group';
import { NATUREZA_ITEMS, SITUACAO_ITEMS } from '@/components/lancamento-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LancamentosSearch } from '../@interface/lancamentos.interface.js';

const ALL = '__all__';

// Filtros rápidos na própria barra da tabela: natureza e situação.
export function LancamentosFilters({
  search,
  onChange,
}: {
  search: LancamentosSearch;
  onChange: (patch: Partial<LancamentosSearch>) => void;
}) {
  return (
    <>
      <ToggleGroup
        aria-label={t('nature')}
        value={search.natureza ?? ALL}
        onValueChange={(value) =>
          onChange({ natureza: value === ALL ? undefined : (value as LancamentosSearch['natureza']), page: 1 })
        }
      >
        {[{ value: ALL, label: t('all') }, ...NATUREZA_ITEMS].map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        aria-label={t('status')}
        value={search.situacao ?? ALL}
        onValueChange={(value) =>
          onChange({ situacao: value === ALL ? undefined : (value as LancamentosSearch['situacao']), page: 1 })
        }
      >
        {[{ value: ALL, label: t('all') }, ...SITUACAO_ITEMS].map((item) => (
          <ToggleGroupItem key={item.value} value={item.value}>
            {item.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </>
  );
}
