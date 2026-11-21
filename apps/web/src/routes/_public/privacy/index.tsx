import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { PublicDocument } from '../@components/public-document.js';

// Structure only, in the order the LGPD asks: the final text comes from the lawyer (roadmap).
export function PrivacyPage() {
  return (
    <PublicDocument
      title={t('privacy_policy')}
      description={t('privacy_description')}
      draft
      sections={[
        { title: t('privacy_controller') },
        { title: t('privacy_collected_data') },
        { title: t('privacy_purposes') },
        { title: t('privacy_sharing') },
        { title: t('privacy_cookies') },
        { title: t('privacy_retention') },
        { title: t('privacy_rights') },
        { title: t('privacy_security') },
        { title: t('privacy_dpo') },
        { title: t('privacy_changes') },
      ]}
    />
  );
}

export const Route = createFileRoute('/_public/privacy/')({
  component: PrivacyPage,
  staticData: { title: t('privacy_policy') },
});
