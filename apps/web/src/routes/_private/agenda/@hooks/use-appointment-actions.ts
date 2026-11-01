import type { AppointmentStatus } from '@ethica/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { type AppointmentRecord, deleteAppointmentMutation, updateAppointmentMutation } from '@/query/appointment.js';

export function useAppointmentActions(appointment: AppointmentRecord, onDone: () => void) {
  const queryClient = useQueryClient();
  const updateMutation = useMutation(updateAppointmentMutation(queryClient));
  const deleteMutation = useMutation(deleteAppointmentMutation(queryClient));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const onError = (error: Error) => toast.error(error.message);

  return {
    isPending: updateMutation.isPending || deleteMutation.isPending,
    setStatus: (status: AppointmentStatus) =>
      updateMutation.mutate({ id: appointment.id, data: { status } }, { onSuccess: onDone, onError }),
    isConfirmingDelete,
    askDelete: () => setIsConfirmingDelete(true),
    cancelDelete: () => setIsConfirmingDelete(false),
    handleDelete: () => deleteMutation.mutate({ id: appointment.id }, { onSuccess: onDone, onError }),
  };
}
