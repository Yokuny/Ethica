import { Field, FieldLabel } from '@ethica/ui/components/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { DateField, MoneyField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

type PaymentState = 'yes' | 'no' | 'partial';
const PAYMENT_ITEMS: { value: PaymentState; label: string }[] = [
  { value: 'no', label: t('no') },
  { value: 'yes', label: t('yes') },
  { value: 'partial', label: t('partial') },
];

// Payment at registration of the office's own type (AD-176): "Sim" repeats the contracted fee as the
// amount received; "Parcial" asks for it. It becomes a receipt of the fee in finance.
export function CasePaymentFields() {
  const { control, setValue } = useFormContext<CaseFormValues>();
  const fee = useWatch({ control, name: 'fixedFeesCents' });
  const [state, setState] = useState<PaymentState>('no');

  useEffect(() => {
    if (state === 'yes') setValue('payment.amountCents', fee ?? 0);
  }, [state, fee, setValue]);

  const choose = (chosen: PaymentState) => {
    setState(chosen);
    if (chosen === 'no') setValue('payment', undefined);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field>
        <FieldLabel>{t('payment_received')}</FieldLabel>
        <Select items={PAYMENT_ITEMS} value={state} onValueChange={(chosen) => chosen && choose(chosen)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {state !== 'no' && (
        <>
          <MoneyField
            control={control}
            name="payment.amountCents"
            label={t('received_amount')}
            placeholder={t('example_money')}
            disabled={state === 'yes'}
            required
          />
          <DateField
            control={control}
            name="payment.date"
            label={t('payoff_date')}
            placeholder={t('choose_day')}
            required
          />
        </>
      )}
    </div>
  );
}
