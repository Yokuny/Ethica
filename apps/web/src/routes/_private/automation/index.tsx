import { DropdownMenuItem } from '@ethica/ui/components/dropdown-menu';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowUpRight, Sparkles } from 'lucide-react';
import { AutomationOffer } from '@/components/automation-offer.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { PageMenu } from '@/components/page-menu.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { notificationsQuery } from '@/query/notification.js';
import { hasAutomationSession, sessionQuery } from '@/query/session.js';
import { TrackedCases } from './@components/tracked-cases.js';

// Automação Datajud: the processes of the office followed in court, what waits for approval and what each
// movement brings (AD-268), the rules on their own page behind the "…" menu. Without the module, the offer (AD-276).
export function AutomationPage() {
  const session = useQuery(sessionQuery).data;
  const active = Boolean(session && hasAutomationSession(session));
  const suggestions = useQuery({ ...notificationsQuery({ kind: ['suggestion'], limit: 1 }), enabled: active });
  const pending = suggestions.data?.total ?? 0;
  const navigate = useNavigate();

  return (
    <Card asPage>
      <CardHeader title={t('automation_offer_title')} description={t('automation_page_description')}>
        {active && (
          <CardAction>
            <PageMenu>
              <DropdownMenuItem onClick={() => navigate({ to: '/automation/rules' })}>
                {t('automation_rules')}
              </DropdownMenuItem>
            </PageMenu>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="gap-8">
        {!active ? (
          <AutomationOffer />
        ) : (
          <>
            <section className="flex w-full min-w-0 flex-col gap-4">
              <ItemTitle role="heading" aria-level={2} className="text-xs uppercase">
                {t('suggestions_to_approve')}
              </ItemTitle>
              <Item render={<Link to="/notifications" />}>
                <ItemMedia variant="icon">
                  <Sparkles />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="tabular-nums">{pending}</ItemTitle>
                  <ItemDescription>{t(pending === 1 ? 'pending_suggestion' : 'pending_suggestions')}</ItemDescription>
                </ItemContent>
                <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </Item>
            </section>
            <section className="flex w-full min-w-0 flex-col gap-4">
              <div className="grid gap-1">
                <ItemTitle role="heading" aria-level={2} className="text-xs uppercase">
                  {t('tracked_cases')}
                </ItemTitle>
                <ItemDescription>{t('tracked_cases_description')}</ItemDescription>
              </div>
              <TrackedCases />
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/automation/')({
  component: AutomationPage,
  staticData: { title: t('automation_offer_title') },
});
