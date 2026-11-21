import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { CircleCheckIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PublicNav } from '../@components/public-nav.js';
import { ContactForm } from './@components/contact-form.js';
import { useContactForm } from './@hooks/use-contact-form.js';

// Contact page in the shadcnblocks model (AD-249): the title on the left, the form on the right. The
// address, phone and e-mail block of the model waits for the Ethica channels (PUB-05).
export function ContactPage() {
  const { form, sent, errorMessage, onSubmit, sendAnother } = useContactForm();
  return (
    <Card>
      <CardContent className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <PublicNav />
        <div className="flex flex-col justify-between gap-12 lg:mt-12 lg:flex-row lg:gap-10">
          <div className="flex w-full max-w-xs flex-col gap-5 lg:gap-12">
            <ItemTitle // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
              render={<h1 />}
              className="text-5xl font-semibold tracking-tight lg:text-6xl"
            >
              {t('contact_title')}
            </ItemTitle>
            <ItemDescription className="line-clamp-none text-sm uppercase">{t('contact_lead')}</ItemDescription>
          </div>
          <div className="w-full lg:pl-10">
            {sent ? (
              <div role="status" className="flex flex-col items-start gap-4 rounded-lg border p-8">
                <CircleCheckIcon className="size-8 text-status-success-indicator" aria-hidden />
                <ItemTitle className="text-2xl font-semibold">{t('contact_sent_title')}</ItemTitle>
                <ItemDescription className="line-clamp-none text-base">{t('contact_sent_text')}</ItemDescription>
                <Button variant="outline" onClick={sendAnother}>
                  {t('contact_send_another')}
                </Button>
              </div>
            ) : (
              <ContactForm form={form} errorMessage={errorMessage} onSubmit={onSubmit} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_public/contact/')({
  component: ContactPage,
  staticData: { title: t('contact') },
});
