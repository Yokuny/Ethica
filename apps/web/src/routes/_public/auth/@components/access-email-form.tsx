import type { AccessKeyRequest } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import type { UseFormReturn } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';

type AccessEmailFormProps = {
  form: UseFormReturn<AccessKeyRequest>;
  errorMessage?: string;
  onSubmit: (data: AccessKeyRequest) => Promise<void>;
};

export function AccessEmailForm({ form, errorMessage, onSubmit }: AccessEmailFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <DefaultFormLayout
          sections={[
            {
              title: t('email'),
              description: t('enter_email_to_access'),
              layout: 'vertical',
              fields: [
                <FormField
                  key="email"
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder={t('email')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />,
              ],
            },
          ]}
        />
        {errorMessage && <ItemDescription role="alert">{errorMessage}</ItemDescription>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {t('send_access_key')}
        </Button>
      </form>
    </Form>
  );
}
