import { Button } from '@ethica/ui/components/button';
import { createFileRoute, Link } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { FaqList } from '../@components/faq-list.js';
import { PublicDocument } from '../@components/public-document.js';
import { BILLING_FAQ, USE_FAQ } from '../@consts/faq.js';

export function SupportPage() {
  return (
    <PublicDocument
      title={t('support')}
      description={t('support_description')}
      sections={[
        { title: t('support_use_title'), children: <FaqList items={USE_FAQ} /> },
        { title: t('support_billing_title'), children: <FaqList items={BILLING_FAQ} /> },
        {
          title: t('support_talk_title'),
          text: t('support_talk_text'),
          children: (
            <Button className="w-fit" render={<Link to="/contact" />}>
              {t('send_message')}
            </Button>
          ),
        },
      ]}
    />
  );
}

export const Route = createFileRoute('/_public/support/')({
  component: SupportPage,
  staticData: { title: t('support') },
});
