import type { PasswordAccess } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import type { UseFormReturn } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';

type AccessPasswordFormProps = {
  form: UseFormReturn<PasswordAccess>;
  errorMessage?: string;
  onSubmit: (data: PasswordAccess) => Promise<void>;
  onBack: () => void;
};

// AD-157: test sign-up while sending the e-mail key is blocked.
export function AccessPasswordForm({ form, errorMessage, onSubmit, onBack }: AccessPasswordFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <DefaultFormLayout
          sections={[
            {
              title: t('test_signup'),
              description: t('test_signup_description'),
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
                <FormField
                  key="password"
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('password')}</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" placeholder={t('password')} {...field} />
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
        <Button type="button" variant="ghost" onClick={onBack}>
          {t('send_access_key')}
        </Button>
      </form>
    </Form>
  );
}
