import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { ItemDescription } from '@ethica/ui/components/item';
import { useWatch } from 'react-hook-form';
import { FormDialog } from '@/components/form-dialog.js';
import { SelectField, TextField } from '@/components/form-fields.js';
import { PARTY_TYPE_ITEMS } from '@/components/party-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { PartyRecord } from '@/query/party.js';
import { usePartyForm } from '../@hooks/use-party-form.js';

type PartyFormProps = { party?: PartyRecord; onClose: () => void; onSaved?: (saved: PartyRecord) => void };

export function PartyForm({ party, onClose, onSaved }: PartyFormProps) {
  const { form, onSubmit, isPending, errorMessage } = usePartyForm({
    party,
    onDone: (saved) => {
      onSaved?.(saved);
      onClose();
    },
  });
  const { control } = form;
  const type = useWatch({ control, name: 'type' });

  return (
    <FormDialog title={t(party ? 'edit_party' : 'new_party')} size="sm" onClose={onClose}>
      <Form {...form}>
        <form noValidate onSubmit={onSubmit} className="grid gap-4">
          <SelectField
            control={control}
            name="type"
            label={t('type')}
            placeholder={t('select')}
            items={PARTY_TYPE_ITEMS}
            disabled={Boolean(party)}
          />
          <TextField control={control} name="name" label={t('name')} placeholder={t('example_name')} />
          {type === 'lawyer' ? (
            <TextField control={control} name="oab" label="OAB" placeholder={t('example_oab')} />
          ) : (
            <TextField control={control} name="document" label={t('cpf_cnpj')} placeholder="000.000.000-00" />
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField control={control} name="email" label={t('email')} placeholder={t('example_email')} />
            <TextField control={control} name="phone" label={t('phone')} placeholder="(11) 90000-0000" />
          </div>
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
