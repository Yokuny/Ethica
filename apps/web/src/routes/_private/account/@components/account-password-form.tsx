import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { t } from '@/lib/helpers/translate.helper.js';
import { usePasswordForm } from '../@hooks/use-password-form.js';

const FIELDS = [
  { name: 'currentPassword', label: 'current_password', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'new_password', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'confirm_new_password', autoComplete: 'new-password' },
] as const;

export function AccountPasswordForm() {
  const { form, onSubmit, isPending } = usePasswordForm();
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        {FIELDS.map((item) => (
          <FormField
            key={item.name}
            control={form.control}
            name={item.name}
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel>{t(item.label)}</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete={item.autoComplete} placeholder={t(item.label)} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
        <Button type="submit" disabled={isPending}>
          {t('change_password')}
        </Button>
      </form>
    </Form>
  );
}
