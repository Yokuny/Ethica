import { ACTIVITY_LOG_ACTIONS, ACTIVITY_LOG_MODULES } from '@ethica/contracts';
import { useQuery } from '@tanstack/react-query';
import { periodSummary, type TableFilterItem } from '@/components/data-table.js';
import { DatePicker } from '@/components/date-picker.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { usersQuery } from '@/query/user.js';
import { ACTIVITY_LOG_ACTION_KEY, ACTIVITY_LOG_MODULE_KEY } from '../@consts/activity-log-labels.js';
import type { ActivityLogSearch } from '../@interface/activityLog.interface.js';

// "Filtros" of the activity log (GES-01.2, FIL-01): period, people, modules and actions (several each, FIL-03).
export function useActivityLogFilters(
  search: ActivityLogSearch,
  onChange: (patch: Partial<ActivityLogSearch>) => void,
): TableFilterItem[] {
  const users = useQuery(usersQuery);
  return [
    {
      label: t('period'),
      summary: periodSummary(search.from, search.to),
      content: (
        <div className="grid grid-cols-2 gap-2">
          <DatePicker value={search.from} onChange={(from) => onChange({ from, page: 1 })} placeholder={t('from')} />
          <DatePicker value={search.to} onChange={(to) => onChange({ to, page: 1 })} placeholder={t('to')} />
        </div>
      ),
    },
    {
      label: t('user'),
      items: (users.data ?? []).map((user) => ({ value: user.id, label: user.name })),
      value: search.userId,
      onChange: (userId) => onChange({ userId, page: 1 }),
    },
    {
      label: t('module'),
      items: ACTIVITY_LOG_MODULES.map((value) => ({ value, label: t(ACTIVITY_LOG_MODULE_KEY[value]) })),
      value: search.module,
      onChange: (module) => onChange({ module: module as ActivityLogSearch['module'], page: 1 }),
    },
    {
      label: t('action'),
      items: ACTIVITY_LOG_ACTIONS.map((value) => ({ value, label: t(ACTIVITY_LOG_ACTION_KEY[value]) })),
      value: search.action,
      onChange: (action) => onChange({ action: action as ActivityLogSearch['action'], page: 1 }),
    },
  ];
}
