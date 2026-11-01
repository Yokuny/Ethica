import { type UpdateScheduleNotice, updateScheduleNoticeSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type ScheduleNotice, updateScheduleNoticeMutation } from '../@query/office.js';

export function useScheduleNoticeForm(notice: ScheduleNotice) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updateScheduleNoticeMutation(queryClient));
  const form = useForm<UpdateScheduleNotice>({
    resolver: zodResolver(updateScheduleNoticeSchema),
    defaultValues: notice,
  });

  function onSubmit(data: UpdateScheduleNotice) {
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
