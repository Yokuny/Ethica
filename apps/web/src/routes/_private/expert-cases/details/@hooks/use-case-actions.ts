import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { type CaseRecord, deleteCaseMutation } from '@/query/case.js';

export function useCaseActions(legalCase: CaseRecord | undefined) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation(deleteCaseMutation(queryClient));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  function handleDelete() {
    if (deleteMutation.isPending || !legalCase) return;
    deleteMutation.mutate(
      { id: legalCase.id },
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
