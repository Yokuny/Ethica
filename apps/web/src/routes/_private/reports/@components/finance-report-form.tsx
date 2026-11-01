import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { DateField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useFinanceReportForm } from '../@hooks/use-finance-report-form.js';

export function FinanceReportForm() {
  const { form, onSubmit, isPending } = useFinanceReportForm();
  const { control } = form;
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <DateField control={control} name="from" label={t('from_date')} placeholder={t('choose_day')} />
        <DateField control={control} name="to" label={t('to_date')} placeholder={t('choose_day')} />
        <Button type="submit" size="field" disabled={isPending}>
          {t('generate_pdf')}
        </Button>
      </form>
    </Form>
  );
}
