import { createFileRoute, Link } from '@tanstack/react-router';
import { Building2, Database, Download, FileText, Hash, Mail, UserPen } from 'lucide-react';
import { HubIllustration } from '@/components/hub-illustration.js';
import { LinkCard, LinkCardList } from '@/components/link-card.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PageIntro } from '@/components/page-intro.js';
import { t } from '@/lib/helpers/translate.helper.js';

// DOC-01 and DOC-04 hub (admin only): one page per office setting.
export function OfficePage() {
  return (
    <Card asPage>
      <CardHeader title={t('office')} />
      <CardContent className="max-w-4xl gap-8">
        <PageIntro
          title={t('office')}
          description={t('office_page_description')}
          illustration={<HubIllustration icon={Building2} />}
          heading={t('your_office_in_every_document')}
          text={t('office_hub_text')}
          features={[
            { icon: FileText, label: t('pdf_and_word') },
            { icon: Hash, label: t('service_order_control') },
            { icon: Download, label: t('export_data') },
          ]}
        />
        <LinkCardList>
          <LinkCard
            icon={FileText}
            title={t('document_identity')}
            meta={[t('logo'), t('header_and_footer')]}
            render={<Link to="/office/documents" />}
          />
          <LinkCard
            icon={Hash}
            title={t('service_order_control')}
            meta={[t('variable_service_order')]}
            render={<Link to="/office/service-order" />}
          />
          <LinkCard
            icon={UserPen}
            title={t('technical_responsibles')}
            meta={[t('logo'), t('header_and_footer')]}
            render={<Link to="/office/signatories" />}
          />
          <LinkCard
            icon={Mail}
            title={t('scheduling_notice')}
            meta={[t('subject'), t('message')]}
            render={<Link to="/office/scheduling-notice" />}
          />
          <LinkCard
            icon={Database}
            title={t('office_data')}
            meta={[t('storage'), t('export_data')]}
            render={<Link to="/office/data" />}
          />
        </LinkCardList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/_admin/office/')({
  component: OfficePage,
  staticData: { title: t('office') },
});
