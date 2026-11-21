import type { ContactMessage } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@ethica/ui/components/form';
import { Input } from '@ethica/ui/components/input';
import { ItemDescription } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { Textarea } from '@ethica/ui/components/textarea';
import { SendIcon } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { t } from '@/lib/helpers/translate.helper.js';
import { SUBJECT_ITEMS } from '../@consts/contact.js';

type ContactFormProps = {
  form: UseFormReturn<ContactMessage>;
  errorMessage?: string;
  onSubmit: (data: ContactMessage) => Promise<void>;
};

// Form of the shadcnblocks model (contact.html): three fields in a row, the message across, Enviar.
export function ContactForm({ form, errorMessage, onSubmit }: ContactFormProps) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder={t('your_name')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('email')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder={t('email_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('phone')}</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" placeholder="(11) 99999-0000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem className="sm:col-span-2 lg:col-span-3">
              <FormLabel>{t('subject')}</FormLabel>
              <Select items={SUBJECT_ITEMS} value={field.value} onValueChange={(next) => next && field.onChange(next)}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUBJECT_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="sm:col-span-2 lg:col-span-3">
              <FormLabel>{t('message')}</FormLabel>
              <FormControl>
                <Textarea rows={6} placeholder={t('contact_message_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {errorMessage && (
          <ItemDescription role="alert" className="line-clamp-none text-destructive sm:col-span-2 lg:col-span-3">
            {errorMessage}
          </ItemDescription>
        )}
        <Button type="submit" className="w-fit" disabled={form.formState.isSubmitting}>
          <SendIcon />
          {form.formState.isSubmitting ? t('sending') : t('send_message')}
        </Button>
      </form>
    </Form>
  );
}
