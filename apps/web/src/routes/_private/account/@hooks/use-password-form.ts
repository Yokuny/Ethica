import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type PasswordForm, passwordFormSchema } from '../@interface/password-form.interface.js';
import { changePasswordMutation } from '../@query/account.js';

const DEFAULT_VALUES: PasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function usePasswordForm() {
  const mutation = useMutation(changePasswordMutation());
  const form = useForm<PasswordForm>({ resolver: zodResolver(passwordFormSchema), defaultValues: DEFAULT_VALUES });

  // A confirmação fica no formulário: a API recusa chave desconhecida.
  function onSubmit({ currentPassword, newPassword }: PasswordForm) {
    if (mutation.isPending) return;
    mutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          form.reset(DEFAULT_VALUES);
          toast.success(t('password_changed'));
        },
        onError: (error) => form.setError('currentPassword', { message: error.message }),
      },
    );
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending };
}
