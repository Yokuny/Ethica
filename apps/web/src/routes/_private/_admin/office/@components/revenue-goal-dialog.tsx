import { type UpdateRevenueGoal, updateRevenueGoalSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { MoneyField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type OfficeView, updateRevenueGoalMutation } from '../@query/office.js';

// Years offered: five back and five ahead of the current one, besides any year already saved.
const yearsAround = (current: number, saved: number[]) =>
  [...new Set([...Array.from({ length: 11 }, (_, index) => current + 5 - index), ...saved])]
    .sort((a, b) => b - a)
    .map((year) => ({ value: String(year), label: String(year) }));

type RevenueGoalDialogProps = {
  office: OfficeView;
  // The goal being edited; missing = a new one, starting on the first year without a goal from the current on.
  goal?: UpdateRevenueGoal;
  onClose: () => void;
};

// Create or edit the revenue goal of a year (MRA-01, AD-259). Saving a year that already has a goal replaces it.
export function RevenueGoalDialog({ office, goal, onClose }: RevenueGoalDialogProps) {
  const queryClient = useQueryClient();
  const save = useMutation(updateRevenueGoalMutation(queryClient));
  const saved = office.revenueGoals.map((item) => item.year);
  let freeYear = office.currentYear;
  while (saved.includes(freeYear)) freeYear += 1;
  const form = useForm<UpdateRevenueGoal>({
    resolver: zodResolver(updateRevenueGoalSchema),
    defaultValues: goal ?? { year: freeYear, amountCents: 0 },
  });
  const items = yearsAround(office.currentYear, saved);

  function onSubmit(data: UpdateRevenueGoal) {
    save.mutate(data, {
      onSuccess: () => {
        toast.success(t('changes_saved'));
        onClose();
      },
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <FormDialog title={t(goal ? 'edit_revenue_goal' : 'new_revenue_goal')} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('revenue_goal'),
                fields: [
                  <FormField
                    key="year"
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>{t('year')}</FormLabel>
                        <Select
                          items={items}
                          value={String(field.value)}
                          disabled={Boolean(goal)}
                          onValueChange={(value) => value && field.onChange(Number(value))}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('year')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {items.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />,
                  <MoneyField
                    key="amount"
                    control={form.control}
                    name="amountCents"
                    label={t('amount')}
                    placeholder={t('amount')}
                    required
                  />,
                ],
              },
            ]}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
