import { suggestNonPrescribedPeriod } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription } from '@ethica/ui/components/item';
import { useFormContext, useWatch } from 'react-hook-form';
import { DateField, TextField } from '@/components/form-fields.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseFormValues } from '../@interface/cases.interface.js';

const day = (value: string) => formatDate(new Date(`${value}T12:00:00`));

// Labor report auxiliary data (IMP-04). The non-prescribed period is suggested by the
// contract dates (AD-115); at registration the API saves the suggestion if the period is left empty.
export function LaborCaseFields() {
  const { control, setValue } = useFormContext<CaseFormValues>();
  const [docketingDate, hireDate, terminationDate, start, end] = useWatch({
    control,
    name: ['docketingDate', 'hireDate', 'terminationDate', 'nonPrescribedPeriodStart', 'nonPrescribedPeriodEnd'],
  });
  const suggested = suggestNonPrescribedPeriod({
    docketingDate: docketingDate || undefined,
    hireDate: hireDate || undefined,
    terminationDate: terminationDate || undefined,
  });
  const canSuggest = suggested && (suggested.start !== start || suggested.end !== end);

  function aplicarSugestao() {
    if (!suggested) return;
    setValue('nonPrescribedPeriodStart', suggested.start, { shouldDirty: true });
    setValue('nonPrescribedPeriodEnd', suggested.end, { shouldDirty: true });
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <DateField
          control={control}
          name="docketingDate"
          label={t('lawsuit_filing_date')}
          placeholder={t('choose_day')}
        />
        <DateField control={control} name="hireDate" label={t('hiring_date')} placeholder={t('choose_day')} />
        <DateField
          control={control}
          name="terminationDate"
          label={t('termination_date')}
          placeholder={t('choose_day')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          control={control}
          name="nonPrescribedPeriodStart"
          label={t('non_prescribed_period_start')}
          placeholder={t('choose_day')}
        />
        <DateField
          control={control}
          name="nonPrescribedPeriodEnd"
          label={t('non_prescribed_period_end')}
          placeholder={t('choose_day')}
        />
      </div>
      {canSuggest && (
        <div className="flex flex-wrap items-center gap-3">
          <ItemDescription className="line-clamp-none">
            {`${t('suggested_period')}: ${day(suggested.start)} – ${day(suggested.end)}`}
          </ItemDescription>
          <Button type="button" variant="outline" onClick={aplicarSugestao}>
            {t('use_suggested_period')}
          </Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={control}
          name="claimantJob"
          label={t('claimant_job')}
          placeholder={t('example_claimant_job')}
        />
        <TextField
          control={control}
          name="location"
          label={t('inspection_address')}
          placeholder={t('example_address')}
        />
      </div>
    </div>
  );
}
