import { type CreateNotification, createNotificationSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  createNotificationMutation,
  type NotificationRecord,
  updateNotificationMutation,
} from '@/query/notification.js';

// Same form to create and edit a deadline or alert: with `deadline` it edits, without it it creates on the case.
export function useNotificationForm({
  caseId,
  deadline,
  onDone,
}: {
  caseId: string;
  deadline?: NotificationRecord;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateNotification>({
    resolver: zodResolver(createNotificationSchema),
    defaultValues: {
      caseId,
      kind: deadline?.kind ?? 'deadline',
      title: deadline?.title ?? '',
      dueDate: deadline?.dueDate ?? '',
      notes: deadline?.notes ?? '',
    },
  });
  const createMutation = useMutation(createNotificationMutation(queryClient));
  const updateMutation = useMutation(updateNotificationMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: CreateNotification) {
    if (isPending) return;
    setErrorMessage(null);
    const options = { onSuccess: onDone, onError: (error: Error) => setErrorMessage(error.message) };
    // The kind is chosen only at creation (AD-189).
    const { kind: _, caseId: __, ...fields } = data;
    if (deadline) updateMutation.mutate({ id: deadline.id, data: fields }, options);
    else createMutation.mutate({ ...data, caseId }, options);
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending, errorMessage };
}
