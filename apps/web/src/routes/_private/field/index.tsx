import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@ethica/ui/components/item';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, CalendarCheck, Map as MapIcon, Route as RouteIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';

// Logistics hub (AD-239, AD-295): one row per intention — see the map, plan the route, follow the scheduled services.
const DESTINATIONS = [
  { to: '/field/map', icon: MapIcon, title: 'map', meta: ['date_range', 'stops_on_map'] },
  { to: '/field/route', icon: RouteIcon, title: 'route_planning', meta: ['travel_cost', 'support_on_route'] },
  {
    to: '/field/inspections',
    icon: CalendarCheck,
    title: 'scheduled_services',
    meta: ['show_on_map', 'perform_inspection'],
  },
] as const;

export function FieldPage() {
  return (
    <Card asPage>
      <CardHeader title={t('logistics')} description={t('field_page_description')} />
      <CardContent>
        <ItemGroup>
          {DESTINATIONS.map(({ to, icon: Icon, title, meta }) => (
            <li key={to}>
              <Item render={<Link to={to} />}>
                <ItemMedia variant="icon">
                  <Icon />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{t(title)}</ItemTitle>
                  <ItemDescription>{meta.map((key) => t(key)).join(' · ')}</ItemDescription>
                </ItemContent>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </Item>
            </li>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/')({
  component: FieldPage,
  staticData: { title: t('logistics') },
});
