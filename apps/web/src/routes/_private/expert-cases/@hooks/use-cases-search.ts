import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, SortingState, Updater } from '@tanstack/react-table';
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

  // Column click (AD-192): ascending, descending, then back to the newest registration first.
  const sorting: SortingState = search.sort ? [{ id: search.sort, desc: search.order === 'desc' }] : [];
  function handleSortingChange(updater: Updater<SortingState>) {
    const [next] = typeof updater === 'function' ? updater(sorting) : updater;
    update({ sort: next?.id as CasesSearch['sort'], order: next && (next.desc ? 'desc' : 'asc'), page: 1 });
  }

  const [searchInput, handleSearchInput] = useDebouncedSearch(search.q, (q: string) => update({ q, page: 1 }));

  function handleRowClick(row: CaseListItem) {
    navigate({ to: '/expert-cases/details', search: { id: row.id } });
  }

  const activeFilters = [
    search.serviceOrder,
    search.phase,
    search.status,
    search.courtType,
    search.role ?? search.serviceType,
    search.deliveryFrom ?? search.deliveryTo,
  ].filter(Boolean).length;
  const hasFilters = Boolean(search.q) || activeFilters > 0;

  function clearFilters() {
    update({
      q: '',
      phase: undefined,
      status: undefined,
      courtType: undefined,
      role: undefined,
      serviceType: undefined,
      serviceOrder: undefined,
      deliveryFrom: undefined,
      deliveryTo: undefined,
      page: 1,
    });
  }

  return {
    search,
    searchInput,
    handleSearchInput,
    handlePaginationChange,
    sorting,
    handleSortingChange,
    handleRowClick,
    update,
    activeFilters,
    hasFilters,
    clearFilters,
  };
}
