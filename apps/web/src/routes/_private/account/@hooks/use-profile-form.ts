import { type UpdateProfile, updateProfileSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type AccountView, updateProfileMutation } from '../@query/account.js';

// Campo profissional vazio vai como '' e a API o apaga (DOC-01).
const toValues = (profile: AccountView): UpdateProfile => ({
  name: profile.name,
  cpf: profile.cpf ?? '',
  professionalRegistration: profile.professionalRegistration ?? '',
  education: profile.education ?? '',
});

export function useProfileForm(profile: AccountView) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updateProfileMutation(queryClient));
  const form = useForm<UpdateProfile>({ resolver: zodResolver(updateProfileSchema), defaultValues: toValues(profile) });

  function onSubmit(data: UpdateProfile) {
    if (mutation.isPending) return;
    mutation.mutate(data, {
      onSuccess: (account) => {
        form.reset(toValues(account));
        toast.success(t('changes_saved'));
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending };
}
