import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import type { DiarioSearch } from '../@interface/diario.interface.js';

export function useDiarioSearch() {
  const search = useSearch({ strict: false }) as DiarioSearch;
  const navigate = useNavigate({ from: '/diario/' });

  function update(patch: Partial<DiarioSearch>) {
    navigate({ search: (prev: DiarioSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  const active = [search.from, search.to, search.userId, search.modulo, search.acao].filter(Boolean).length;
  return { search, update, handlePaginationChange, active };
}
