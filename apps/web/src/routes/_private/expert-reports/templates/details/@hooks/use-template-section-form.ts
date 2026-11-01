import { type TemplateSection, templateSectionSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { saveTemplateSectionMutation, type TemplateSectionRecord } from '@/query/report.js';

// Criar ou editar uma seção do modelo (LAU-01.2): com `secao` edita, sem ela acrescenta no fim.
export function useTemplateSectionForm({
  templateId,
  section,
  onDone,
}: {
  templateId: string;
  section?: TemplateSectionRecord;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<TemplateSection>({
    resolver: zodResolver(templateSectionSchema),
    defaultValues: {
      title: section?.title ?? '',
      level: section?.level ?? 1,
      titleOnly: section?.titleOnly ?? false,
      pageBreak: section?.pageBreak ?? false,
      yesText: section?.yesText ?? '',
      noText: section?.noText ?? '',
    },
  });
  const mutation = useMutation(saveTemplateSectionMutation(queryClient));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function onSubmit(data: TemplateSection) {
    if (mutation.isPending) return;
    setErrorMessage(null);
    mutation.mutate(
      { id: templateId, sectionId: section?.id, data },
      { onSuccess: onDone, onError: (error) => setErrorMessage(error.message) },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending, errorMessage };
}
