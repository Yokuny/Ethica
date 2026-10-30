import { createFileRoute, Link } from '@tanstack/react-router';
import { Bookmark, Building2, Radar, Search, Sparkles } from 'lucide-react';
import { HubIllustration } from '@/components/hub-illustration.js';
import { LinkCard, LinkCardList } from '@/components/link-card.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PageIntro } from '@/components/page-intro.js';
import { t } from '@/lib/helpers/translate.helper.js';

export function ProspeccaoIndexPage() {
  return (
    <Card asPage>
      <CardHeader title={t('prospeccao')} />
      <CardContent className="max-w-4xl gap-8">
        <PageIntro
          title={t('prospeccao')}
          description={t('find_possible_appointments_in_datajud')}
          illustration={<HubIllustration icon={Radar} />}
          heading={t('new_services_before_appointment')}
          text={t('prospection_hub_text')}
          features={[
            { icon: Building2, label: t('labor_civil_federal_courts') },
            { icon: Search, label: t('search_by_movement') },
            { icon: Sparkles, label: t('convert_into_pericia') },
          ]}
        />
        <LinkCardList>
          <LinkCard
            icon={Search}
            title={t('datajud_search')}
            meta={[t('public_api_cnj')]}
            render={<Link to="/prospeccao/busca" />}
          />
          <LinkCard
            icon={Bookmark}
            title={t('opportunities')}
            meta={[t('saved_processes')]}
            render={<Link to="/prospeccao/oportunidades" />}
          />
        </LinkCardList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/prospeccao/')({
  component: ProspeccaoIndexPage,
  staticData: { title: t('prospeccao') },
});
