import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import type { CaseListItem } from '@/query/case.js';
import type { CasesSearch } from '../@interface/cases.interface.js';

export function useCasesSearch() {
  const search = useSearch({ strict: false }) as CasesSearch;
  const navigate = useNavigate({ from: '/expert-cases/' });

  function update(patch: Partial<CasesSearch>) {
    navigate({ search: (prev: CasesSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  const [searchInput, handleSearchInput] = useDebouncedSearch(search.q, (q: string) => update({ q, page: 1 }));

  function handleRowClick(row: CaseListItem) {
    navigate({ to: '/expert-cases/details', search: { id: row.id } });
  }

  const activeFilters = [search.state, search.status, search.phase, search.courtType].filter(Boolean).length;
  const hasFilters = Boolean(search.q) || activeFilters > 0;

  function clearFilters() {
    update({ q: '', state: undefined, status: undefined, phase: undefined, courtType: undefined, page: 1 });
  }

  return {
    search,
    searchInput,
    handleSearchInput,
    handlePaginationChange,
    handleRowClick,
    update,
    activeFilters,
    hasFilters,
    clearFilters,
  };
}
