import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import type { ActivityLogSearch } from '../@interface/activityLog.interface.js';

export function useActivityLogSearch() {
  const search = useSearch({ strict: false }) as ActivityLogSearch;
  const navigate = useNavigate({ from: '/activity-log/' });

  function update(patch: Partial<ActivityLogSearch>) {
    navigate({ search: (prev: ActivityLogSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  const active = [search.from, search.to, search.userId, search.module, search.action].filter(Boolean).length;
  return { search, update, handlePaginationChange, active };
}
