import type { CompromissoStatus } from '@ethica/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { type CompromissoRecord, deleteCompromissoMutation, updateCompromissoMutation } from '@/query/compromisso.js';

export function useCompromissoActions(compromisso: CompromissoRecord, onDone: () => void) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation(updateCompromissoMutation(queryClient));
  const deleteMutation = useMutation(deleteCompromissoMutation(queryClient));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const onError = (error: Error) => toast.error(error.message);

  return {
    isPending: updateMutation.isPending || deleteMutation.isPending,
    setStatus: (status: CompromissoStatus) =>
      updateMutation.mutate({ id: compromisso.id, data: { status } }, { onSuccess: onDone, onError }),
    isConfirmingDelete,
    askDelete: () => setIsConfirmingDelete(true),
    cancelDelete: () => setIsConfirmingDelete(false),
    handleDelete: () => deleteMutation.mutate({ id: compromisso.id }, { onSuccess: onDone, onError }),
  };
}
