import { type UpdateAvisoAgendamento, updateAvisoAgendamentoSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type AvisoAgendamento, updateAvisoAgendamentoMutation } from '../@query/office.js';

export function useAvisoAgendamentoForm(aviso: AvisoAgendamento) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updateAvisoAgendamentoMutation(queryClient));
  const form = useForm<UpdateAvisoAgendamento>({
    resolver: zodResolver(updateAvisoAgendamentoSchema),
    defaultValues: aviso,
  });

  function onSubmit(data: UpdateAvisoAgendamento) {
    mutation.mutate(data, {
      onSuccess: (salvo) => {
        form.reset(salvo);
        toast.success(t('saved_successfully'));
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending };
}
