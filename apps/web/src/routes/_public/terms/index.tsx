import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { PublicDocument } from '../@components/public-document.js';

// Structure only: the final text comes from the lawyer (roadmap).
export function TermsPage() {
  return (
    <PublicDocument
      title={t('terms_of_use')}
      description={t('terms_description')}
      draft
      sections={[
        { title: t('terms_acceptance') },
        { title: t('terms_service') },
        { title: t('terms_account') },
        { title: t('terms_plans_payment') },
        { title: t('terms_allowed_use') },
        { title: t('terms_case_data') },
        { title: t('terms_availability') },
        { title: t('terms_changes') },
        { title: t('terms_jurisdiction') },
      ]}
    />
  );
}

export const Route = createFileRoute('/_public/terms/')({
  component: TermsPage,
  staticData: { title: t('terms_of_use') },
});
