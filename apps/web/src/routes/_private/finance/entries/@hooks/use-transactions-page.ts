import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { PaginationState, Updater } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import { type TransactionRecord, updateTransactionMutation } from '@/query/transaction.js';
import type { TransactionPanel, TransactionsSearch } from '../@interface/transactions.interface.js';

export function useTransactionsPage() {
  const search = useSearch({ strict: false }) as TransactionsSearch;
  const navigate = useNavigate({ from: '/finance/entries/' });
  const queryClient = useQueryClient();
  const updateMutation = useMutation(updateTransactionMutation(queryClient));
  const [panel, setPanel] = useState<TransactionPanel>(null);

  function update(patch: Partial<TransactionsSearch>) {
    navigate({ search: (prev: TransactionsSearch) => ({ ...prev, ...patch }), replace: true });
  }

  function handlePaginationChange(updater: Updater<PaginationState>) {
    const current: PaginationState = { pageIndex: search.page - 1, pageSize: search.limit };
    const next = typeof updater === 'function' ? updater(current) : updater;
    update({ page: next.pageIndex + 1, limit: next.pageSize });
  }

  // Quick row actions: settle (today) and cancel.
  function setStatus(transaction: TransactionRecord, status: 'settled' | 'canceled' | 'expected') {
    updateMutation.mutate(
      { id: transaction.id, data: { status } },
      { onError: (error: Error) => toast.error(error.message) },
    );
  }

  const activeFilters = [search.kind, search.state, search.caseId].filter(Boolean).length;

  return {
    search,
    update,
    panel,
    setPanel,
    handlePaginationChange,
    setStatus,
    activeFilters,
    clearFilters: () => update({ kind: undefined, state: undefined, caseId: undefined, page: 1 }),
  };
}
