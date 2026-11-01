import { ACTIVITY_LOG_ACTIONS, ACTIVITY_LOG_MODULES } from '@ethica/contracts';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useQuery } from '@tanstack/react-query';
import { DatePicker } from '@/components/date-picker.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { usersQuery } from '@/query/user.js';
import { ACTIVITY_LOG_ACTION_KEY, ACTIVITY_LOG_MODULE_KEY } from '../@consts/activity-log-labels.js';
import type { ActivityLogSearch } from '../@interface/activityLog.interface.js';

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

// Activity log filters (GES-01.2): period, person, module and action.
export function ActivityLogFilters({
  search,
  onChange,
}: {
  search: ActivityLogSearch;
  onChange: (patch: Partial<ActivityLogSearch>) => void;
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
        items={ACTIVITY_LOG_MODULES.map((value) => ({ value, label: t(ACTIVITY_LOG_MODULE_KEY[value]) }))}
        value={search.module}
        onChange={(module) => onChange({ module: module as ActivityLogSearch['module'], page: 1 })}
      />
      <FilterSelect
        label={t('action')}
        items={ACTIVITY_LOG_ACTIONS.map((value) => ({ value, label: t(ACTIVITY_LOG_ACTION_KEY[value]) }))}
        value={search.action}
        onChange={(action) => onChange({ action: action as ActivityLogSearch['action'], page: 1 })}
      />
    </>
  );
}
