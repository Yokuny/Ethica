import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { COURT_TYPE_ITEMS, ROLE_ITEMS } from '@/components/case-labels.js';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, SelectField, TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { converterOportunidadeMutation, type OportunidadeRecord } from '../../@query/oportunidade.js';
import { type ConverterForm as ConverterValues, converterFormSchema } from '../@interface/oportunidades.interface.js';

const courtTypeOfCourt = (court: string): ConverterValues['courtType'] =>
  court.startsWith('trt') ? 'labor' : court.startsWith('trf') ? 'federal' : 'civil';

// Converter em perícia: número, tribunal e vara vêm da oportunidade.
export function ConverterForm({ oportunidade, onClose }: { oportunidade: OportunidadeRecord; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation(converterOportunidadeMutation(queryClient));
  const form = useForm<ConverterValues>({
    resolver: zodResolver(converterFormSchema),
    defaultValues: {
      courtType: courtTypeOfCourt(oportunidade.court),
      role: 'court_expert',
      subject: oportunidade.assuntos[0] ?? '',
    },
  });

  const onSubmit = form.handleSubmit((data) =>
    mutation.mutate(
      { id: oportunidade.id, data },
      { onSuccess: ({ caseId }) => navigate({ to: '/expert-cases/details', search: { id: caseId } }) },
    ),
  );

  return (
    <FormDialog title={t('convert_into_expert_case')} description={oportunidade.processNumber} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('expert_case'),
                fields: [
                  <div key="tipo" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={form.control}
                      name="courtType"
                      label={t('court_type')}
                      placeholder={t('select')}
                      items={COURT_TYPE_ITEMS}
                    />
                    <SelectField
                      control={form.control}
                      name="role"
                      label={t('role_in_case')}
                      placeholder={t('select')}
                      items={ROLE_ITEMS}
                    />
                  </div>,
                  <TextField
                    key="subject"
                    control={form.control}
                    name="subject"
                    label={t('object')}
                    placeholder={t('example_object')}
                  />,
                  <div key="datas" className="grid gap-4 sm:grid-cols-2">
                    <DateField
                      control={form.control}
                      name="nominationDate"
                      label={t('appointment_date')}
                      placeholder={t('choose_day')}
                    />
                    <DateField
                      control={form.control}
                      name="reportDeadline"
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
