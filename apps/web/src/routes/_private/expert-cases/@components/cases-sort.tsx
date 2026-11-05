import type { CaseListSort } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CasesSearch } from '../@interface/cases.interface.js';

const SORT_ITEMS: { value: CaseListSort; label: string }[] = [
  { value: 'createdAt', label: t('registration_date') },
  { value: 'name', label: t('name') },
  { value: 'type', label: t('type') },
  { value: 'updatedAt', label: t('last_change_date') },
];

// "Ordenar por" of the services listing (AD-188): the field and the direction, kept in the URL. Without a
// choice, the newest registration first.
export function CasesSort({
  search,
  onChange,
}: {
  search: CasesSearch;
  onChange: (patch: Partial<CasesSearch>) => void;
}) {
  const sort = search.sort ?? 'createdAt';
  const ascending = search.order === 'asc';
  return (
    <div className="ms-auto flex items-center gap-2">
      <ItemDescription className="whitespace-nowrap">{t('sort_by')}</ItemDescription>
      <Select
        items={SORT_ITEMS}
        value={sort}
        onValueChange={(value) => value && onChange({ sort: value as CaseListSort, page: 1 })}
      >
        <SelectTrigger aria-label={t('sort_by')} className="w-48">
          <SelectValue placeholder={t('sort_by')} />
        </SelectTrigger>
        <SelectContent>
          {SORT_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t(ascending ? 'ascending' : 'descending')}
        title={t(ascending ? 'ascending' : 'descending')}
        onClick={() => onChange({ order: ascending ? 'desc' : 'asc', page: 1 })}
      >
        {ascending ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
      </Button>
    </div>
  );
}
