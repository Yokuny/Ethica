import { Button } from '@ethica/ui/components/button';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowUpRight, FileSignature, ListTree } from 'lucide-react';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { can, sessionQuery } from '@/query/session.js';

// Module hub: drafted reports and opinions and the office templates, one row per destination (AD-295).
const DESTINATIONS = [
  {
    to: '/expert-reports/list',
    icon: FileSignature,
    title: 'reports_and_opinions',
    meta: ['draft', 'completed_report'],
  },
  {
    to: '/expert-reports/templates',
    icon: ListTree,
    title: 'report_templates',
    meta: ['standard_library', 'office_library'],
  },
] as const;

export function ReportsIndexPage() {
  const session = useQuery(sessionQuery).data;
  return (
    <Card asPage>
      <CardHeader title={t('reports_and_opinions')} description={t('reports_page_hub_description')}>
        {session && can(session, 'expert_reports', 'create') && (
          <CardAction>
            <Button nativeButton={false} role="link" render={<Link to="/expert-reports/add">{t('new_report')}</Link>} />
          </CardAction>
        )}
      </CardHeader>
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

export const Route = createFileRoute('/_private/expert-reports/')({
  component: ReportsIndexPage,
  staticData: { title: t('reports_and_opinions') },
});
