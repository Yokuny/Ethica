import { type Control, useWatch } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { DateField, MoneyField, SelectField, TextareaField, TextField } from '@/components/form-fields.js';
import { JUSTICA_ITEMS, PAPEL_ITEMS, PERICIA_STATUS_ITEMS } from '@/components/pericia-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PericiaFormValues } from '../@interface/pericias.interface.js';
import { PericiaPartesFields } from './pericia-partes-fields.js';
import { PericiaTrabalhistaFields } from './pericia-trabalhista-fields.js';

// Campos da perícia compartilhados por `add` e `details` (edição). Na edição
// entram também a etapa e o honorário fixado pelo juízo; o prazo do laudo só no
// cadastro (depois os prazos são editados no painel de prazos do detalhe).
export function PericiaFormFields({
  control,
  editing = false,
}: {
  control: Control<PericiaFormValues>;
  editing?: boolean;
}) {
  const justica = useWatch({ control, name: 'justica' });
  return (
    <DefaultFormLayout
      sections={[
        {
          title: t('process'),
          description: t('process_identification_data'),
          fields: [
            <div key="processo" className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="numeroProcesso"
                label={t('process_number')}
                placeholder="0000000-00.0000.0.00.0000"
              />
              <TextField control={control} name="tribunal" label={t('tribunal')} placeholder={t('example_tribunal')} />
              <SelectField
                control={control}
                name="justica"
                label={t('court_type')}
                placeholder={t('select')}
                items={JUSTICA_ITEMS}
              />
              <SelectField
                control={control}
                name="papel"
                label={t('role_in_case')}
                placeholder={t('select')}
                items={PAPEL_ITEMS}
              />
              <TextField
                control={control}
                name="vara"
                label={t('court_division')}
                placeholder={t('example_court_division')}
              />
              <TextField
                control={control}
                name="comarca"
                label={t('judicial_district')}
                placeholder={t('example_judicial_district')}
              />
            </div>,
          ],
        },
        {
          title: t('expert_case'),
          description: t('object_and_deadlines'),
          fields: [
            <TextField
              key="objeto"
              control={control}
              name="objeto"
              label={t('object')}
              placeholder={t('example_object')}
            />,
            <div key="datas" className="grid gap-4 sm:grid-cols-2">
              <DateField
                control={control}
                name="dataNomeacao"
                label={t('appointment_date')}
                placeholder={t('choose_day')}
              />
              {!editing && (
                <DateField
                  control={control}
                  name="prazoLaudo"
                  label={t('report_deadline')}
                  placeholder={t('choose_day')}
                />
              )}
              {editing && (
                <SelectField
                  control={control}
                  name="status"
                  label={t('stage')}
                  placeholder={t('select')}
                  items={PERICIA_STATUS_ITEMS}
                />
              )}
            </div>,
          ],
        },
        {
          title: t('parties'),
          description: t('parties_and_lawyers_description'),
          fields: [<PericiaPartesFields key="partes" />],
        },
        ...(justica === 'labor'
          ? [
              {
                title: t('labor_report_data'),
                description: t('labor_report_data_description'),
                fields: [<PericiaTrabalhistaFields key="trabalhista" />],
              },
            ]
          : []),
        {
          title: t('fees'),
          description: t('proposed_and_fixed_fees'),
          fields: [
            <div key="honorarios" className="grid gap-4 sm:grid-cols-2">
              <MoneyField
                control={control}
                name="honorariosPropostosCents"
                label={t('proposed_fees')}
                placeholder={t('example_money')}
              />
              {editing && (
                <MoneyField
                  control={control}
                  name="honorariosFixadosCents"
                  label={t('fixed_fees')}
                  placeholder={t('example_money')}
                />
              )}
            </div>,
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
  );
}
