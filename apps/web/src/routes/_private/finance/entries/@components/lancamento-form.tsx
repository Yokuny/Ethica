import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { FormDialog } from '@/components/form-dialog.js';
import { DateField, MoneyField, SelectField, TextField } from '@/components/form-fields.js';
import { categoriaItems, NATUREZA_ITEMS } from '@/components/lancamento-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { LancamentoRecord } from '@/query/lancamento.js';
import { useLancamentoForm } from '../@hooks/use-lancamento-form.js';
import { ParcelasList } from './parcelas-list.js';

export function LancamentoForm({ lancamento, onClose }: { lancamento?: LancamentoRecord; onClose: () => void }) {
  const { form, natureza, onSubmit, handleNaturezaChange, isPending, errorMessage, caseItems } = useLancamentoForm({
    lancamento,
    onDone: onClose,
  });
  const { control } = form;

  return (
    <FormDialog title={t(lancamento ? 'edit_entry' : 'new_entry')} onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-6">
          <DefaultFormLayout
            layout="vertical"
            sections={[
              {
                title: t('entry'),
                fields: [
                  <div key="tipo" className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      control={control}
                      name="natureza"
                      label={t('nature')}
                      placeholder={t('select')}
                      items={NATUREZA_ITEMS}
                      onValueChange={handleNaturezaChange}
                      // A natureza não muda depois de lançada (regras de status diferentes, AD-111).
                      disabled={Boolean(lancamento)}
                    />
                    <SelectField
                      control={control}
                      name="categoria"
                      label={t('category')}
                      placeholder={t('select')}
                      items={categoriaItems(natureza)}
                    />
                  </div>,
                  <TextField
                    key="descricao"
                    control={control}
                    name="descricao"
                    label={t('description')}
                    placeholder={t('example_entry_description')}
                  />,
                  <div key="valor" className="grid gap-4 sm:grid-cols-2">
                    <MoneyField
                      control={control}
                      name="valorCents"
                      label={t('amount')}
                      placeholder={t('example_money')}
                    />
                    <DateField
                      control={control}
                      name="vencimento"
                      label={t('due_date')}
                      placeholder={t('choose_day')}
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
                ],
              },
            ]}
          />
          {lancamento?.natureza === 'income' && <ParcelasList lancamento={lancamento} onChanged={onClose} />}
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
