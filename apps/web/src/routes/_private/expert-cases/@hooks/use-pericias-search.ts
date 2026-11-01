import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import type { PericiaListItem } from '@/query/pericia.js';
import type { PericiasSearch } from '../@interface/pericias.interface.js';

export function usePericiasSearch() {
  const search = useSearch({ strict: false }) as PericiasSearch;
  const navigate = useNavigate({ from: '/expert-cases/' });

  function update(patch: Partial<PericiasSearch>) {
    navigate({ search: (prev: PericiasSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  const [searchInput, handleSearchInput] = useDebouncedSearch(search.q, (q: string) => update({ q, page: 1 }));

  function handleRowClick(row: PericiaListItem) {
    navigate({ to: '/expert-cases/details', search: { id: row.id } });
  }

  const activeFilters = [search.situacao, search.status, search.fase, search.justica].filter(Boolean).length;
  const hasFilters = Boolean(search.q) || activeFilters > 0;

  function clearFilters() {
    update({ q: '', situacao: undefined, status: undefined, fase: undefined, justica: undefined, page: 1 });
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
