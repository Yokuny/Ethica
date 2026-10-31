import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { setLogoMutation } from '../@query/office.js';
import { resizeLogo } from '../@utils/resize-logo.js';

export function useLogoUpload() {
  const queryClient = useQueryClient();
  const mutation = useMutation(setLogoMutation(queryClient));

  function save(png: Blob | null) {
    mutation.mutate(png, {
      onSuccess: () => toast.success(png ? t('logo_updated') : t('logo_removed')),
      onError: (error) => toast.error(error.message),
    });
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Limpa o input: escolher o mesmo arquivo de novo ainda dispara o change.
    event.target.value = '';
    if (!file || mutation.isPending) return;
    const png = await resizeLogo(file).catch(() => null);
    if (!png) {
      toast.error(t('invalid_image'));
      return;
    }
    save(png);
  }

  return { handleFile, remove: () => save(null), isPending: mutation.isPending };
}
