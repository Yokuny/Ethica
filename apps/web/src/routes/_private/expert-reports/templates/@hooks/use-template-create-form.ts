import { type CreateTemplate, createTemplateSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createTemplateMutation, type TemplateRecord } from '@/query/report.js';

// New blank template or cloning another one of the same type (LAU-01.1). `base` preselects the clone.
export function useTemplateCreateForm({
  base,
  onDone,
}: {
  base?: Pick<TemplateRecord, 'id' | 'name' | 'type'>;
  onDone: (template: TemplateRecord) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateTemplate>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: { name: base ? `${base.name} (cópia)` : '', type: base?.type ?? 'report', baseId: base?.id },
  });
  const mutation = useMutation(createTemplateMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: CreateTemplate) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(data, { onSuccess: onDone, onError: (error) => setErrorMessage(error.message) });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
