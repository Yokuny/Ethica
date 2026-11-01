import { createFileRoute, Link } from '@tanstack/react-router';
import { FileSignature, Files, ListTree, Variable } from 'lucide-react';
import { HubIllustration } from '@/components/hub-illustration.js';
import { LinkCard, LinkCardList } from '@/components/link-card.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PageIntro } from '@/components/page-intro.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Hub do módulo: laudos e pareceres redigidos e os modelos do escritório.
export function LaudosIndexPage() {
  return (
    <Card asPage>
      <CardHeader title={t('reports_and_opinions')} />
      <CardContent className="max-w-4xl gap-8">
        <PageIntro
          title={t('reports_and_opinions')}
          description={t('reports_page_hub_description')}
          illustration={<HubIllustration icon={FileSignature} />}
          heading={t('write_the_report_without_retyping')}
          text={t('reports_hub_text')}
          features={[
            { icon: ListTree, label: t('sections_yes_no') },
            { icon: Variable, label: t('case_variables') },
            { icon: Files, label: t('pdf_and_word') },
          ]}
        />
        <LinkCardList>
          <LinkCard
            icon={FileSignature}
            title={t('reports_and_opinions')}
            meta={[t('draft'), t('completed_report')]}
            render={<Link to="/expert-reports/list" />}
          />
          <LinkCard
            icon={ListTree}
            title={t('report_templates')}
            meta={[t('standard_library'), t('office_templates')]}
            render={<Link to="/expert-reports/templates" />}
          />
        </LinkCardList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/expert-reports/')({
  component: LaudosIndexPage,
  staticData: { title: t('reports_and_opinions') },
});
