import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, SelectField, TextField } from '@/components/form-fields.js';
import { JUSTICA_ITEMS, PAPEL_ITEMS } from '@/components/pericia-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { converterOportunidadeMutation, type OportunidadeRecord } from '../../@query/oportunidade.js';
import { type ConverterForm as ConverterValues, converterFormSchema } from '../@interface/oportunidades.interface.js';

const justicaDoTribunal = (tribunal: string): ConverterValues['justica'] =>
  tribunal.startsWith('trt') ? 'trabalhista' : tribunal.startsWith('trf') ? 'federal' : 'civel';

// Converter em perícia: número, tribunal e vara vêm da oportunidade.
export function ConverterForm({ oportunidade, onClose }: { oportunidade: OportunidadeRecord; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation(converterOportunidadeMutation(queryClient));
  const form = useForm<ConverterValues>({
    resolver: zodResolver(converterFormSchema),
    defaultValues: {
      justica: justicaDoTribunal(oportunidade.tribunal),
      papel: 'perito',
      objeto: oportunidade.assuntos[0] ?? '',
    },
  });

  const onSubmit = form.handleSubmit((data) =>
    mutation.mutate(
      { id: oportunidade.id, data },
      { onSuccess: ({ periciaId }) => navigate({ to: '/pericias/details', search: { id: periciaId } }) },
    ),
  );

  return (
    <FormDialog title={t('convert_into_pericia')} description={oportunidade.numeroProcesso} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('pericia'),
                fields: [
                  <div key="tipo" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={form.control}
                      name="justica"
                      label={t('court_type')}
                      placeholder={t('select')}
                      items={JUSTICA_ITEMS}
                    />
                    <SelectField
                      control={form.control}
                      name="papel"
                      label={t('role_in_case')}
                      placeholder={t('select')}
                      items={PAPEL_ITEMS}
                    />
                  </div>,
                  <TextField
                    key="objeto"
                    control={form.control}
                    name="objeto"
                    label={t('object')}
                    placeholder={t('example_object')}
                  />,
                  <div key="datas" className="grid gap-4 sm:grid-cols-2">
                    <DateField
                      control={form.control}
                      name="dataNomeacao"
                      label={t('appointment_date')}
                      placeholder={t('choose_day')}
                    />
                    <DateField
                      control={form.control}
                      name="prazoLaudo"
                      label={t('report_deadline')}
                      placeholder={t('choose_day')}
                    />
                  </div>,
                ],
              },
            ]}
          />
          {mutation.error && (
            <ItemDescription role="alert" className="text-destructive line-clamp-none">
              {mutation.error.message}
            </ItemDescription>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {t('convert')}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
