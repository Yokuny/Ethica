import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { deletePericiaMutation, type PericiaRecord } from '@/query/pericia.js';

export function usePericiaActions(pericia: PericiaRecord | undefined) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation(deletePericiaMutation(queryClient));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  function handleDelete() {
    if (deleteMutation.isPending || !pericia) return;
    deleteMutation.mutate(
      { id: pericia.id },
      { onSuccess: () => navigate({ to: '/expert-cases' }), onError: (error: Error) => toast.error(error.message) },
    );
  }

  return {
    handleDelete,
    isDeleting: deleteMutation.isPending,
    isConfirmingDelete,
    askDelete: () => setIsConfirmingDelete(true),
    cancelDelete: () => setIsConfirmingDelete(false),
  };
}
