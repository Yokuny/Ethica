import { formatServiceOrder, type ServiceOrderSettings, serviceOrderSettingsSchema } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { DefaultLoading } from '@/components/default-loading.js';
import { NumberField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { serviceOrderQuery, setServiceOrderMutation } from '../@query/office.js';

const thisYear = (): number => new Date().getFullYear();

// NLA-01: "O escritório já tem número de controle de OS?" Yes → prefix, year and the last number used;
// no → creates the sequence starting at 001. The next service registered gets the following number.
export function OfficeServiceOrder() {
  const query = useQuery(serviceOrderQuery);
  if (query.isLoading) return <DefaultLoading />;
  return <ServiceOrderForm current={query.data ?? null} />;
}

function ServiceOrderForm({ current }: { current: ServiceOrderSettings | null }) {
  const queryClient = useQueryClient();
  const mutation = useMutation(setServiceOrderMutation(queryClient));
  // Without a sequence, the screen first asks whether the office already has one.
  const [hasControl, setHasControl] = useState<boolean | null>(current ? true : null);
  const form = useForm<ServiceOrderSettings>({
    resolver: zodResolver(serviceOrderSettingsSchema),
    defaultValues: current ?? { prefix: '', year: thisYear(), last: 0 },
  });
  const { control } = form;
  const values = useWatch({ control });
  const next =
    values.prefix && values.year
      ? formatServiceOrder({
          prefix: values.prefix.toUpperCase(),
          year: values.year,
          last: values.year === thisYear() ? (values.last ?? 0) + 1 : 1,
        })
      : undefined;

  function onSubmit(data: ServiceOrderSettings) {
    mutation.mutate(data, {
      onSuccess: (saved) => {
        form.reset(saved);
        toast.success(t('changes_saved'));
      },
      onError: (error) => toast.error(error.message),
    });
  }

  if (hasControl === null) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ItemTitle>{t('office_has_service_order_question')}</ItemTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setHasControl(true)}>
            {t('yes_i_have_service_order')}
          </Button>
          <Button variant="outline" onClick={() => setHasControl(false)}>
            {t('create_service_order_sequence')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col items-start gap-4">
        <div className="grid w-full gap-4 sm:grid-cols-3">
          <TextField control={control} name="prefix" label={t('service_order_prefix')} placeholder="ETH" />
          <NumberField control={control} name="year" label={t('year')} placeholder={String(thisYear())} min={2000} />
          {hasControl && (
            <NumberField control={control} name="last" label={t('last_service_order_number')} placeholder="0" min={0} />
          )}
        </div>
        {next && (
          <ItemDescription className="line-clamp-none">
            {t('next_service_order')}: <strong>{next}</strong>
          </ItemDescription>
        )}
        <Button type="submit" disabled={mutation.isPending || (Boolean(current) && !form.formState.isDirty)}>
          {t(current ? 'save' : 'create_service_order_sequence')}
        </Button>
      </form>
    </Form>
  );
}
