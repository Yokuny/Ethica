import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { ContactChannels } from '../@components/contact-channels.js';
import { PublicDocument } from '../@components/public-document.js';

export function ContactPage() {
  return (
    <PublicDocument
      title={t('contact')}
      description={t('contact_description')}
      sections={[{ title: t('contact_channels'), children: <ContactChannels /> }]}
    />
  );
}

export const Route = createFileRoute('/_public/contact/')({
  component: ContactPage,
  staticData: { title: t('contact') },
});
