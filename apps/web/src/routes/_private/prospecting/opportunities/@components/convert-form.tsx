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
import { convertOpportunityMutation, type OpportunityRecord } from '../../@query/opportunity.js';
import { type ConvertForm as ConvertValues, convertFormSchema } from '../@interface/opportunities.interface.js';

const courtTypeOfCourt = (court: string): ConvertValues['courtType'] =>
  court.startsWith('trt') ? 'labor' : court.startsWith('trf') ? 'federal' : 'civil';

// Convert into a case: number, court and division come from the opportunity.
export function ConvertForm({ opportunity, onClose }: { opportunity: OpportunityRecord; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation(convertOpportunityMutation(queryClient));
  const form = useForm<ConvertValues>({
    resolver: zodResolver(convertFormSchema),
    defaultValues: {
      courtType: courtTypeOfCourt(opportunity.court),
      role: 'court_expert',
      subject: opportunity.subjects[0] ?? '',
    },
  });

  const onSubmit = form.handleSubmit((data) =>
    mutation.mutate(
      { id: opportunity.id, data },
      { onSuccess: ({ caseId }) => navigate({ to: '/expert-cases/details', search: { id: caseId } }) },
    ),
  );

  return (
    <FormDialog title={t('convert_into_expert_case')} description={opportunity.processNumber} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('expert_case'),
                fields: [
                  <div key="type" className="grid gap-4 sm:grid-cols-2">
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
                  <div key="dates" className="grid gap-4 sm:grid-cols-2">
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
