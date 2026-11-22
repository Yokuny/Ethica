import { type UpdateRevenueGoal, updateRevenueGoalSchema } from '@ethica/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { t } from '@/lib/helpers/translate.helper.js';
import { type OfficeView, updateRevenueGoalMutation } from '../@query/office.js';

export function useRevenueGoalForm(goal: OfficeView['revenueGoal']) {
  const queryClient = useQueryClient();
  const mutation = useMutation(updateRevenueGoalMutation(queryClient));
  const form = useForm<UpdateRevenueGoal>({
    resolver: zodResolver(updateRevenueGoalSchema),
    defaultValues: { amountCents: goal.amountCents ?? 0 },
  });

  function onSubmit(data: UpdateRevenueGoal) {
    mutation.mutate(data, {
      onSuccess: (saved) => {
        form.reset({ amountCents: saved.revenueGoal.amountCents ?? 0 });
        toast.success(t('saved_successfully'));
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isPending: mutation.isPending };
}
