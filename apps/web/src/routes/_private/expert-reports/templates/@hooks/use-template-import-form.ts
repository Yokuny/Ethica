import { createTemplateSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { t } from '@/lib/helpers/translate.helper.js';
import { importTemplateMutation, type TemplateRecord } from '@/query/report.js';

const importTemplateFormSchema = createTemplateSchema.pick({ name: true, type: true, area: true });
type ImportTemplateForm = z.infer<typeof importTemplateFormSchema>;

// BIB-04: PDF or Word file into the office library; the name starts as the file name.
export function useTemplateImportForm({ onDone }: { onDone: (template: TemplateRecord) => void }) {
  const queryClient = useQueryClient();
  const form = useForm<ImportTemplateForm>({
    resolver: zodResolver(importTemplateFormSchema),
    defaultValues: { name: '', type: 'report' },
  });
  const [file, setFile] = useState<File | null>(null);
  const mutation = useMutation(importTemplateMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function chooseFile(next: File | undefined) {
    if (!next) return;
    setFile(next);
    if (!form.getValues('name')) form.setValue('name', next.name.replace(/\.(pdf|docx)$/i, ''));
  }

  function onSubmit(data: ImportTemplateForm) {
    if (mutation.isPending) return;
    if (!file) {
      setErrorMessage(t('choose_file'));
      return;
    }
    setErrorMessage(null);
    mutation.mutate({ ...data, file }, { onSuccess: onDone, onError: (error) => setErrorMessage(error.message) });
  }

  return {
    form,
    file,
    chooseFile,
    onSubmit: form.handleSubmit(onSubmit),
    isPending: mutation.isPending,
    errorMessage,
  };
}
