import { type CreateTemplate, createTemplateSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createTemplateMutation, type TemplateRecord } from '@/query/report.js';

// Modelo novo em branco ou clonando outro do mesmo tipo (LAU-01.1). `base` pré-escolhe o clone.
export function useTemplateCreateForm({
  base,
  onDone,
}: {
  base?: Pick<TemplateRecord, 'id' | 'nome' | 'tipo'>;
  onDone: (template: TemplateRecord) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<CreateTemplate>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: { nome: base ? `${base.nome} (cópia)` : '', tipo: base?.tipo ?? 'report', baseId: base?.id },
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
