import { type CreateDeadline, createDeadlineSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createDeadlineMutation, type DeadlineRecord, updateDeadlineMutation } from '@/query/deadline.js';

// Same form to create and edit the deadline: with `deadline` it edits, without it it creates on the case.
export function useDeadlineForm({
  caseId,
  deadline,
  onDone,
}: {
  caseId: string;
  deadline?: DeadlineRecord;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateDeadline>({
    resolver: zodResolver(createDeadlineSchema),
    defaultValues: {
      title: deadline?.title ?? '',
      dueDate: deadline?.dueDate ?? '',
      notes: deadline?.notes ?? '',
    },
  });
  const createMutation = useMutation(createDeadlineMutation(queryClient));
  const updateMutation = useMutation(updateDeadlineMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CreateDeadline) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    if (deadline) updateMutation.mutate({ id: deadline.id, data }, options);
    else createMutation.mutate({ caseId, data }, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
