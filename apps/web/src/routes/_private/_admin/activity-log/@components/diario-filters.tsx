import { DIARIO_ACOES, DIARIO_MODULOS } from '@ethica/contracts';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/date-picker.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { usersQuery } from '@/query/user.js';
import { DIARIO_ACAO_KEY, DIARIO_MODULO_KEY } from '../@consts/diario-labels.js';
import type { DiarioSearch } from '../@interface/diario.interface.js';

const ALL = '__all__';

function FilterSelect({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: string; label: string }[];
  value?: string;
  onChange: (value: string | undefined) => void;
}) {
  const withAll = [{ value: ALL, label: t('all') }, ...items];
  return (
    <div className="grid gap-1.5">
      <ItemDescription>{label}</ItemDescription>
      <Select
        items={withAll}
        value={value ?? ALL}
        onValueChange={(next) => onChange(!next || next === ALL ? undefined : next)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {withAll.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Filtros do diário (GES-01.2): período, pessoa, módulo e ação.
export function DiarioFilters({
  search,
  onChange,
}: {
  search: DiarioSearch;
  onChange: (patch: Partial<DiarioSearch>) => void;
}) {
  const users = useQuery(usersQuery);
  return (
    <>
      <div className="grid gap-1.5">
        <ItemDescription>{t('period')}</ItemDescription>
        <div className="grid grid-cols-2 gap-2">
          <DatePicker value={search.from} onChange={(from) => onChange({ from, page: 1 })} placeholder={t('from')} />
          <DatePicker value={search.to} onChange={(to) => onChange({ to, page: 1 })} placeholder={t('to')} />
        </div>
      </div>
      <FilterSelect
        label={t('user')}
        items={(users.data ?? []).map((user) => ({ value: user.id, label: user.name }))}
        value={search.userId}
        onChange={(userId) => onChange({ userId, page: 1 })}
      />
      <FilterSelect
        label={t('module')}
        items={DIARIO_MODULOS.map((value) => ({ value, label: t(DIARIO_MODULO_KEY[value]) }))}
        value={search.modulo}
        onChange={(modulo) => onChange({ modulo: modulo as DiarioSearch['modulo'], page: 1 })}
      />
      <FilterSelect
        label={t('action')}
        items={DIARIO_ACOES.map((value) => ({ value, label: t(DIARIO_ACAO_KEY[value]) }))}
        value={search.acao}
        onChange={(acao) => onChange({ acao: acao as DiarioSearch['acao'], page: 1 })}
      />
    </>
  );
}
