import type { AcceptInvite } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import type { UseFormReturn } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';

type InviteFormProps = {
  form: UseFormReturn<AcceptInvite>;
  tenantName: string;
  email: string;
  submitError?: string;
  onSubmit: (data: AcceptInvite) => Promise<void>;
};

export function InviteForm({ form, tenantName, email, submitError, onSubmit }: InviteFormProps) {
  return (
    <>
      <ItemDescription>
        {t('invite_to')}: {tenantName}
      </ItemDescription>
      <ItemDescription>{email}</ItemDescription>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="mt-4 flex flex-col gap-4">
          <DefaultFormLayout
            sections={[
              {
                title: t('your_data'),
                description: t('set_name_and_password'),
                layout: 'vertical',
                fields: [
                  <FormField
                    key="name"
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('name')}</FormLabel>
                        <FormControl>
                          <Input autoComplete="name" placeholder={t('name')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />,
                  <FormField
                    key="password"
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('password')}</FormLabel>
                        <FormControl>
                          <Input type="password" autoComplete="new-password" placeholder={t('password')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />,
                ],
              },
            ]}
          />
          {submitError && <ItemDescription role="alert">{submitError}</ItemDescription>}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('create_account')}
          </Button>
        </form>
      </Form>
    </>
  );
}
