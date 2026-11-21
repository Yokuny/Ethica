import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/lib/helpers/translate.helper.js';
import { PublicDocument } from '../@components/public-document.js';

// How the Ethica protects the data, only what the system does today (passkey, office isolation, roles,
// private files, payments in Asaas).
export function SecurityPage() {
  return (
    <PublicDocument
      title={t('security')}
      description={t('security_description')}
      sections={[
        { title: t('security_access_title'), text: t('security_access_text') },
        { title: t('security_office_title'), text: t('security_office_text') },
        { title: t('security_roles_title'), text: t('security_roles_text') },
        { title: t('security_files_title'), text: t('security_files_text') },
        { title: t('security_payment_title'), text: t('security_payment_text') },
        { title: t('security_report_title'), text: t('security_report_text') },
      ]}
    />
  );
}

export const Route = createFileRoute('/_public/security/')({
  component: SecurityPage,
  staticData: { title: t('security') },
});
