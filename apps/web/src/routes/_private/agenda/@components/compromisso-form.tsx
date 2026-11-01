import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { COMPROMISSO_TIPO_ITEMS } from '@/components/compromisso-labels.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, NumberField, SelectField, TextareaField, TextField, TimeField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CompromissoRecord } from '@/query/compromisso.js';
import { useCompromissoForm } from '../@hooks/use-compromisso-form.js';

type CompromissoFormProps = {
  compromisso?: CompromissoRecord;
  date?: string;
  caseId?: string;
  onClose: () => void;
};

export function CompromissoForm({ compromisso, date, caseId, onClose }: CompromissoFormProps) {
  const { form, onSubmit, isPending, errorMessage, caseItems } = useCompromissoForm({
    compromisso,
    date,
    caseId,
    onDone: onClose,
  });
  const { control } = form;

  return (
    <FormDialog title={t(compromisso ? 'edit_commitment' : 'new_commitment')} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('commitment'),
                fields: [
                  <div key="tipo" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={control}
                      name="tipo"
                      label={t('type')}
                      placeholder={t('select')}
                      items={COMPROMISSO_TIPO_ITEMS}
                    />
                    <TextField
                      control={control}
                      name="titulo"
                      label={t('title')}
                      placeholder={t('example_commitment_title')}
                    />
                  </div>,
                  <div key="quando" className="grid gap-4 sm:grid-cols-3">
                    <DateField control={control} name="date" label={t('date')} placeholder={t('choose_day')} />
                    <TimeField control={control} name="time" label={t('time')} placeholder="09:00" />
                    <NumberField
                      control={control}
                      name="duracaoMinutos"
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
                    name="local"
                    label={t('location')}
                    placeholder={t('example_location')}
                  />,
                  <TextareaField
                    key="obs"
                    control={control}
                    name="observacoes"
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
