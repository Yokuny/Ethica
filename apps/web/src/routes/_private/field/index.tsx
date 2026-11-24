import { createFileRoute, Link } from '@tanstack/react-router';
import { CalendarCheck, ClipboardList, Map as MapIcon, Route as RouteIcon, Truck } from 'lucide-react';
import { HubIllustration } from '@/components/hub-illustration.js';
import { LinkCard, LinkCardList } from '@/components/link-card.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { PageIntro } from '@/components/page-intro.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Logistics hub (AD-239): one page per intention — see the map, plan the route, follow the scheduled services.
export function FieldPage() {
  return (
    <Card asPage>
      <CardHeader title={t('logistics')} />
      <CardContent className="max-w-4xl gap-8">
        <PageIntro
          title={t('logistics')}
          description={t('field_page_description')}
          illustration={<HubIllustration icon={Truck} />}
          heading={t('logistics_hub_heading')}
          text={t('logistics_hub_text')}
          features={[
            { icon: MapIcon, label: t('map') },
            { icon: RouteIcon, label: t('route_planning') },
            { icon: ClipboardList, label: t('inspection_record') },
          ]}
        />
        <LinkCardList>
          <LinkCard
            icon={MapIcon}
            title={t('map')}
            meta={[t('date_range'), t('stops_on_map')]}
            render={<Link to="/field/map" />}
          />
          <LinkCard
            icon={RouteIcon}
            title={t('route_planning')}
            meta={[t('travel_cost'), t('support_on_route')]}
            render={<Link to="/field/route" />}
          />
          <LinkCard
            icon={CalendarCheck}
            title={t('scheduled_services')}
            meta={[t('show_on_map'), t('perform_inspection')]}
            render={<Link to="/field/inspections" />}
          />
        </LinkCardList>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/')({
  component: FieldPage,
  staticData: { title: t('logistics') },
});
