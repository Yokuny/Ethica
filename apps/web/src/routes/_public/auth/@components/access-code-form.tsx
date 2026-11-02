import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import type { UseFormReturn } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { AccessCodeForm as AccessCodeValues } from '../@interface/auth.interface.js';

type AccessCodeFormProps = {
  form: UseFormReturn<AccessCodeValues>;
  email: string;
  errorMessage?: string;
  onSubmit: (data: AccessCodeValues) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeEmail: () => void;
};

export function AccessCodeForm({ form, email, errorMessage, onSubmit, onResend, onChangeEmail }: AccessCodeFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <DefaultFormLayout
          sections={[
            {
              title: t('access_key_sent'),
              description: `${email} · ${t('access_code_description')}`,
              layout: 'vertical',
              fields: [
                <FormField
                  key="code"
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('access_code')}</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="000000"
                          {...field}
                        />
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
          {t('sign_in')}
        </Button>
        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="ghost" onClick={() => void onResend()}>
            {t('resend_code')}
          </Button>
          <Button type="button" variant="ghost" onClick={onChangeEmail}>
            {t('use_another_email')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
