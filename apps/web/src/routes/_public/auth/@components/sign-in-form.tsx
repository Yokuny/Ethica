import type { SignIn } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import type { UseFormReturn } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';

type SignInFormProps = {
  form: UseFormReturn<SignIn>;
  errorMessage?: string;
  onSubmit: (data: SignIn) => Promise<void>;
};

export function SignInForm({ form, errorMessage, onSubmit }: SignInFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <DefaultFormLayout
          sections={[
            {
              title: t('credentials'),
              description: t('enter_email_and_password'),
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
      </form>
    </Form>
  );
}
