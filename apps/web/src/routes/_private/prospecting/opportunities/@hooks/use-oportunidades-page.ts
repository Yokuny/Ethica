import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  deleteOportunidadeMutation,
  type OportunidadeRecord,
  updateOportunidadeMutation,
} from '../../@query/oportunidade.js';
import type { OportunidadesSearch } from '../@interface/oportunidades.interface.js';

export function useOportunidadesPage() {
  const search = useSearch({ strict: false }) as OportunidadesSearch;
  const navigate = useNavigate({ from: '/prospecting/opportunities/' });
  const queryClient = useQueryClient();
  const update = useMutation(updateOportunidadeMutation(queryClient));
  const remove = useMutation(deleteOportunidadeMutation(queryClient));
  const [converting, setConverting] = useState<OportunidadeRecord | null>(null);
  const onError = (error: Error) => toast.error(error.message);

  function updateSearch(patch: Partial<OportunidadesSearch>) {
    navigate({ search: (prev: OportunidadesSearch) => ({ ...prev, ...patch }), replace: true });
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
    setStatus: (oportunidade: OportunidadeRecord, status: 'new' | 'under_review' | 'discarded') =>
      update.mutate({ id: oportunidade.id, data: { status } }, { onError }),
    remove: (oportunidade: OportunidadeRecord) => remove.mutate({ id: oportunidade.id }, { onError }),
    openCase: (oportunidade: OportunidadeRecord) =>
      oportunidade.caseId && navigate({ to: '/expert-cases/details', search: { id: oportunidade.caseId } }),
  };
}
