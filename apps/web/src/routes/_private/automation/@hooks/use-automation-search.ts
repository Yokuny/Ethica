import type { TrackedCase } from '@ethica/contracts';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, SortingState, Updater } from '@tanstack/react-table';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import type { AutomationSearch } from '../@interface/automation.interface.js';

// Period and list of the Automação page in the URL (PAT-02, PAT-03).
export function useAutomationSearch() {
  const search = useSearch({ strict: false }) as AutomationSearch;
  const navigate = useNavigate({ from: '/automation/' });

  function update(patch: Partial<AutomationSearch>) {
    navigate({ search: (prev: AutomationSearch) => ({ ...prev, ...patch }), replace: true });
  }

  // Column click (AD-192): ascending, descending, then back to the newest movement first.
  const sorting: SortingState = search.sort ? [{ id: search.sort, desc: search.order === 'desc' }] : [];
  function handleSortingChange(updater: Updater<SortingState>) {
    const [next] = typeof updater === 'function' ? updater(sorting) : updater;
    update({ sort: next?.id as AutomationSearch['sort'], order: next && (next.desc ? 'desc' : 'asc'), page: 1 });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  const [searchInput, handleSearchInput] = useDebouncedSearch(search.q, (q: string) => update({ q, page: 1 }));

  function openCase(item: Pick<TrackedCase, 'caseId'>) {
    navigate({ to: '/expert-cases/details', search: { id: item.caseId } });
  }

  return {
    search,
    update,
    searchInput,
    handleSearchInput,
    handlePaginationChange,
    sorting,
    handleSortingChange,
    openCase,
  };
}
