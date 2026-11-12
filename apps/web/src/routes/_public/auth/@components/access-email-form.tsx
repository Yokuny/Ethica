import type { AccessKeyRequest } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { Fingerprint } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';

type AccessEmailFormProps = {
  form: UseFormReturn<AccessKeyRequest>;
  errorMessage?: string;
  onSubmit: (data: AccessKeyRequest) => Promise<void>;
  onSigninWithDevice: () => Promise<void>;
};

// APA-02: a device with passkey signs in right away; otherwise the e-mail key.
export function AccessEmailForm({ form, errorMessage, onSubmit, onSigninWithDevice }: AccessEmailFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <Button type="button" size="field" onClick={() => void onSigninWithDevice()}>
          <Fingerprint />
          {t('sign_in_with_device')}
        </Button>
        <ItemDescription className="text-center">{t('or_by_email')}</ItemDescription>
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
                        <Input type="email" autoComplete="username webauthn" placeholder={t('email')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />,
              ],
            },
          ]}
        />
        {errorMessage && (
          <ItemDescription role="alert" className="line-clamp-none text-destructive">
            {errorMessage}
          </ItemDescription>
        )}
        <Button type="submit" variant="outline" size="field" disabled={form.formState.isSubmitting}>
          {t('send_access_key')}
        </Button>
      </form>
    </Form>
  );
}
