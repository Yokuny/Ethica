import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import type { UseFormReturn } from 'react-hook-form';
import { DefaultFormLayout } from '@/components/default-form-layout.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { OfficeForm } from '../@interface/auth.interface.js';

type AccessOfficeFormProps = {
  form: UseFormReturn<OfficeForm>;
  email: string;
  errorMessage?: string;
  onSubmit: (data: OfficeForm) => Promise<void>;
};

// ACE-04: e-mail confirmed without an account creates its own office, with the person as admin.
export function AccessOfficeForm({ form, email, errorMessage, onSubmit }: AccessOfficeFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <DefaultFormLayout
          sections={[
            {
              title: t('create_office'),
              description: email ? `${email} · ${t('create_office_description')}` : t('create_office_description'),
              layout: 'vertical',
              fields: [
                <FormField
                  key="name"
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('your_name')}</FormLabel>
                      <FormControl>
                        <Input autoComplete="name" placeholder={t('your_name')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />,
                <FormField
                  key="officeName"
                  control={form.control}
                  name="officeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('office_name')}</FormLabel>
                      <FormControl>
                        <Input autoComplete="organization" placeholder={t('office_name')} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />,
                <FormField
                  key="document"
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('cnpj')}</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" placeholder={t('cnpj')} {...field} />
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
          {t('create_office')}
        </Button>
      </form>
    </Form>
  );
}
