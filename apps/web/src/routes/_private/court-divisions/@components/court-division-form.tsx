import { BRAZILIAN_STATES } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { COURT_TYPE_ITEMS } from '@/components/case-labels.js';
import { FormDialog } from '@/components/form-dialog.js';
import { SelectField, TextareaField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CourtDivisionRecord } from '@/query/court-division.js';
import { useCourtDivisionForm } from '../@hooks/use-court-division-form.js';

const STATE_ITEMS = BRAZILIAN_STATES.map((value) => ({ value, label: value }));

export function CourtDivisionForm({ division, onClose }: { division?: CourtDivisionRecord; onClose: () => void }) {
  const { form, onSubmit, isPending, errorMessage } = useCourtDivisionForm({ division, onDone: onClose });
  const { control } = form;

  return (
    <FormDialog title={t(division ? 'edit_court_division' : 'new_court_division')} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              control={control}
              name="courtType"
              label={t('court_type')}
              placeholder={t('select')}
              items={COURT_TYPE_ITEMS}
            />
            <TextField control={control} name="court" label={t('court')} placeholder={t('example_court')} />
          </div>
          <TextField
            control={control}
            name="name"
            label={t('court_division')}
            placeholder={t('example_court_division_full')}
          />
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <SelectField
              control={control}
              name="state"
              label={t('state')}
              placeholder={t('select')}
              items={STATE_ITEMS}
            />
            <TextField control={control} name="city" label={t('city')} placeholder={t('example_judicial_district')} />
          </div>
          <TextField control={control} name="address" label={t('address')} placeholder={t('example_address')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={control} name="phones" label={t('phones')} placeholder="(11) 3000-0000" />
            <TextField control={control} name="email" label={t('email')} placeholder={t('example_email')} />
          </div>
          <TextField control={control} name="virtualDesk" label={t('virtual_desk_link')} placeholder="https://" />
          <TextareaField
            control={control}
            name="notes"
            label={t('notes')}
            placeholder={t('court_division_notes_placeholder')}
          />
          {errorMessage && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {errorMessage}
            </ItemDescription>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
