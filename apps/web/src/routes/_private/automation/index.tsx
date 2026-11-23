import { Badge } from '@ethica/ui/components/badge';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BellRing, Sparkles } from 'lucide-react';
import { AutomationOffer } from '@/components/automation-offer.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { notificationsQuery } from '@/query/notification.js';
import { hasAutomationSession, sessionQuery } from '@/query/session.js';
import { TrackedCases } from './@components/tracked-cases.js';
import { RULE_ITEMS } from './@utils/rule-items.js';

// Automação Datajud: the processes of the office followed in court, what waits for approval and what each
// movement brings (AD-268). Without the module, the offer (AD-276).
export function AutomationPage() {
  const session = useQuery(sessionQuery).data;
  const active = Boolean(session && hasAutomationSession(session));
  const suggestions = useQuery({ ...notificationsQuery({ kind: ['suggestion'], limit: 1 }), enabled: active });
  const pending = suggestions.data?.total ?? 0;

  return (
    <Card asPage>
      <CardHeader title={t('automation_offer_title')} description={t('automation_page_description')} />
      <CardContent className="max-w-4xl gap-8">
        {!active ? (
          <AutomationOffer />
        ) : (
          <>
            <Panel title={t('suggestions_to_approve')}>
              <LinkList>
                <LinkListItem
                  icon={Sparkles}
                  title={pending}
                  description={t(pending === 1 ? 'pending_suggestion' : 'pending_suggestions')}
                  render={<Link to="/notifications" />}
                />
              </LinkList>
            </Panel>
            <Panel title={t('tracked_cases')} description={t('tracked_cases_description')}>
              <TrackedCases />
            </Panel>
            <Panel title={t('automation_rules')} description={t('automation_rules_description')}>
              <LinkList>
                {RULE_ITEMS.map((item) => (
                  <LinkListItem
                    key={item.key}
                    icon={BellRing}
                    title={item.title}
                    badges={
                      <Badge variant={item.kind === 'suggestion' ? 'warning' : 'secondary'}>
                        {t(item.kind === 'suggestion' ? 'suggestion' : 'notice')}
                      </Badge>
                    }
                    description={item.description}
                  />
                ))}
              </LinkList>
            </Panel>
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
