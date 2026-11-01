import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { APPOINTMENT_TYPE_ITEMS } from '@/components/appointment-labels.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, NumberField, SelectField, TextareaField, TextField, TimeField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { AppointmentRecord } from '@/query/appointment.js';
import { useAppointmentForm } from '../@hooks/use-appointment-form.js';

type AppointmentFormProps = {
  appointment?: AppointmentRecord;
  date?: string;
  caseId?: string;
  onClose: () => void;
};

export function AppointmentForm({ appointment, date, caseId, onClose }: AppointmentFormProps) {
  const { form, onSubmit, isPending, errorMessage, caseItems } = useAppointmentForm({
    appointment,
    date,
    caseId,
    onDone: onClose,
  });
  const { control } = form;

  return (
    <FormDialog title={t(appointment ? 'edit_commitment' : 'new_commitment')} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('commitment'),
                fields: [
                  <div key="type" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={control}
                      name="type"
                      label={t('type')}
                      placeholder={t('select')}
                      items={APPOINTMENT_TYPE_ITEMS}
                    />
                    <TextField
                      control={control}
                      name="title"
                      label={t('title')}
                      placeholder={t('example_commitment_title')}
                    />
                  </div>,
                  <div key="quando" className="grid gap-4 sm:grid-cols-3">
                    <DateField control={control} name="date" label={t('date')} placeholder={t('choose_day')} />
                    <TimeField control={control} name="time" label={t('time')} placeholder="09:00" />
                    <NumberField
                      control={control}
                      name="durationMinutes"
                      label={t('duration_minutes')}
                      placeholder="60"
                      min={15}
                      step={15}
                    />
                  </div>,
                  <SelectField
                    key="legalCase"
                    control={control}
                    name="caseId"
                    label={t('expert_case')}
                    placeholder={t('no_linked_expert_case')}
                    items={caseItems}
                  />,
                  <TextField
                    key="local"
                    control={control}
                    name="location"
                    label={t('location')}
                    placeholder={t('example_location')}
                  />,
                  <TextareaField
                    key="obs"
                    control={control}
                    name="notes"
                    label={t('notes')}
                    placeholder={t('notes_placeholder')}
                  />,
                ],
              },
            ]}
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
