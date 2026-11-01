import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { setAvatarMutation } from '../@query/account.js';
import { resizeAvatar } from '../@utils/resize-avatar.js';

export function useAvatarUpload() {
  const queryClient = useQueryClient();
  const mutation = useMutation(setAvatarMutation(queryClient));

  function save(image: string | null) {
    mutation.mutate(image, {
      onSuccess: () => toast.success(image ? t('photo_updated') : t('photo_removed')),
      onError: (error) => toast.error(error.message),
    });
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clears the input: picking the same file again still fires the change.
    event.target.value = '';
    if (!file || mutation.isPending) return;
    const image = await resizeAvatar(file).catch(() => null);
    if (!image) {
      toast.error(t('invalid_image'));
      return;
    }
    save(image);
  }

  return { handleFile, remove: () => save(null), isPending: mutation.isPending };
}
