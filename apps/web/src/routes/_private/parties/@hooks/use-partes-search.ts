import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import type { ParteRecord } from '@/query/parte.js';
import type { PartesSearch } from '../@interface/partes.interface.js';

export function usePartesSearch() {
  const search = useSearch({ strict: false }) as PartesSearch;
  const navigate = useNavigate({ from: '/parties/' });

  function update(patch: Partial<PartesSearch>) {
    navigate({ search: (prev: PartesSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  const [searchInput, handleSearchInput] = useDebouncedSearch(search.q, (q: string) => update({ q, page: 1 }));

  function openParte(parte: Pick<ParteRecord, 'id'>) {
    navigate({ to: '/parties/details', search: { id: parte.id } });
  }

  return { search, update, searchInput, handleSearchInput, handlePaginationChange, openParte };
}
