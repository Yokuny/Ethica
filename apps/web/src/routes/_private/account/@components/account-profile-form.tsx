import { Button } from '@ethica/ui/components/button';
import { Form } from '@ethica/ui/components/form';
import { TextField } from '@/components/form-fields.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { useProfileForm } from '../@hooks/use-profile-form.js';
import type { AccountView } from '../@query/account.js';

export function AccountProfileForm({ profile }: { profile: AccountView }) {
  const { form, onSubmit, isPending } = useProfileForm(profile);
  const { control } = form;
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField control={control} name="name" label={t('name')} placeholder={t('name')} />
          </div>
          <TextField control={control} name="cpf" label={t('cpf')} placeholder={t('cpf_placeholder')} />
          <TextField
            control={control}
            name="registroProfissional"
            label={t('professional_registration')}
            placeholder={t('professional_registration_placeholder')}
          />
          <div className="sm:col-span-2">
            <TextField
              control={control}
              name="formacao"
              label={t('education')}
              placeholder={t('education_placeholder')}
            />
          </div>
        </div>
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}
