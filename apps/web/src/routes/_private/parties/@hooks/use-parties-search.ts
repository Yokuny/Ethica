import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch.js';
import type { PartyRecord } from '@/query/party.js';
import type { PartiesSearch } from '../@interface/parties.interface.js';

export function usePartiesSearch() {
  const search = useSearch({ strict: false }) as PartiesSearch;
  const navigate = useNavigate({ from: '/parties/' });

  function update(patch: Partial<PartiesSearch>) {
    navigate({ search: (prev: PartiesSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  const [searchInput, handleSearchInput] = useDebouncedSearch(search.q, (q: string) => update({ q, page: 1 }));

  function openParty(party: Pick<PartyRecord, 'id'>) {
    navigate({ to: '/parties/details', search: { id: party.id } });
  }

  return { search, update, searchInput, handleSearchInput, handlePaginationChange, openParty };
}
