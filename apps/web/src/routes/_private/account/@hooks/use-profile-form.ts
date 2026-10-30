import { type UpdateProfile, updateProfileSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { updateProfileMutation } from '../@query/account.js';

export function useProfileForm(name: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updateProfileMutation(queryClient));
  const form = useForm<UpdateProfile>({ resolver: zodResolver(updateProfileSchema), defaultValues: { name } });

  function onSubmit(data: UpdateProfile) {
    if (mutation.isPending) return;
    mutation.mutate(data, {
      onSuccess: (account) => {
        form.reset({ name: account.name });
        toast.success(t('changes_saved'));
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending };
}
