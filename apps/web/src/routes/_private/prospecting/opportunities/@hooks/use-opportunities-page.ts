import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  deleteOpportunityMutation,
  type OpportunityRecord,
  updateOpportunityMutation,
} from '../../@query/opportunity.js';
import type { OpportunitiesSearch } from '../@interface/opportunities.interface.js';

export function useOpportunitiesPage() {
  const search = useSearch({ strict: false }) as OpportunitiesSearch;
  const navigate = useNavigate({ from: '/prospecting/opportunities/' });
  const queryClient = useQueryClient();
  const update = useMutation(updateOpportunityMutation(queryClient));
  const remove = useMutation(deleteOpportunityMutation(queryClient));
  const [converting, setConverting] = useState<OpportunityRecord | null>(null);
  const onError = (error: Error) => toast.error(error.message);

  function updateSearch(patch: Partial<OpportunitiesSearch>) {
    navigate({ search: (prev: OpportunitiesSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    updateSearch({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  return {
    search,
    updateSearch,
    handlePaginationChange,
    converting,
    setConverting,
    setStatus: (opportunity: OpportunityRecord, status: 'new' | 'under_review' | 'discarded') =>
      update.mutate({ id: opportunity.id, data: { status } }, { onError }),
    remove: (opportunity: OpportunityRecord) => remove.mutate({ id: opportunity.id }, { onError }),
    openCase: (opportunity: OpportunityRecord) =>
      opportunity.caseId && navigate({ to: '/expert-cases/details', search: { id: opportunity.caseId } }),
  };
}
