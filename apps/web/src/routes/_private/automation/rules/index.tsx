import { Badge } from '@ethica/ui/components/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { RULE_ITEMS } from './@utils/rule-items.js';

// What each court movement brings (AD-268), reached from the "…" menu of the Automação page.
export function AutomationRulesPage() {
  return (
    <Card asPage>
      <CardHeader title={t('automation_rules')} description={t('automation_rules_description')} />
      <CardContent>
        <ItemGroup variant="list">
          {RULE_ITEMS.map((item) => (
            <Item key={item.key} render={<li />}>
              <ItemContent>
                <ItemTitle>{item.title}</ItemTitle>
                <ItemDescription className="line-clamp-none">{item.description}</ItemDescription>
              </ItemContent>
              <ItemActions>
                <Badge variant={item.kind === 'suggestion' ? 'warning' : 'secondary'}>
                  {t(item.kind === 'suggestion' ? 'suggestion' : 'notice')}
                </Badge>
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/automation/rules/')({
  component: AutomationRulesPage,
  staticData: { title: t('automation_rules') },
});
