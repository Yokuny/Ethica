import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { t } from '@/lib/helpers/translate.helper.js';
import { useProfileForm } from '../@hooks/use-profile-form.js';

export function AccountProfileForm({ name }: { name: string }) {
  const { form, onSubmit, isPending } = useProfileForm(name);
  return (
    <Form {...form}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col items-start gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder={t('name')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending || !form.formState.isDirty}>
          {t('save')}
        </Button>
      </form>
    </Form>
  );
}
