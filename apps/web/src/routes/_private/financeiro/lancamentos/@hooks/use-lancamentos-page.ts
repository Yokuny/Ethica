import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import { type LancamentoRecord, updateLancamentoMutation } from '@/query/lancamento.js';
import type { LancamentoPanel, LancamentosSearch } from '../@interface/lancamentos.interface.js';

export function useLancamentosPage() {
  const search = useSearch({ strict: false }) as LancamentosSearch;
  const navigate = useNavigate({ from: '/financeiro/lancamentos/' });
  const queryClient = useQueryClient();
  const updateMutation = useMutation(updateLancamentoMutation(queryClient));
  const [panel, setPanel] = useState<LancamentoPanel>(null);

  function update(patch: Partial<LancamentosSearch>) {
    navigate({ search: (prev: LancamentosSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  // Ações rápidas da linha: liquidar (hoje) e cancelar.
  function setStatus(lancamento: LancamentoRecord, status: 'settled' | 'canceled' | 'expected') {
    updateMutation.mutate(
      { id: lancamento.id, data: { status } },
      { onError: (error: Error) => toast.error(error.message) },
    );
  }

  const activeFilters = [search.natureza, search.situacao, search.periciaId].filter(Boolean).length;

  return {
    search,
    update,
    panel,
    setPanel,
    handlePaginationChange,
    setStatus,
    activeFilters,
    clearFilters: () => update({ natureza: undefined, situacao: undefined, periciaId: undefined, page: 1 }),
  };
}
