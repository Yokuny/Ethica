import { Badge } from '@ethica/ui/components/badge';
import { createFileRoute } from '@tanstack/react-router';
import { BellRing } from 'lucide-react';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { RULE_ITEMS } from './@utils/rule-items.js';

// What each court movement brings (AD-268), reached from the "…" menu of the Automação page.
export function AutomationRulesPage() {
  return (
    <Card asPage>
      <CardHeader title={t('automation_rules')} description={t('automation_rules_description')} />
      <CardContent className="max-w-4xl">
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
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/automation/rules/')({
  component: AutomationRulesPage,
  staticData: { title: t('automation_rules') },
});
