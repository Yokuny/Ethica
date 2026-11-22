import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { hasAutomationSession, isAdminSession, sessionQuery } from '@/query/session.js';

// Offer of the Automação Datajud (AD-275) for the office without the module; only the admin pays, so only the
// admin gets the way to the plans.
export function AutomationOffer() {
  const session = useQuery(sessionQuery).data;
  if (!session || hasAutomationSession(session)) return null;
  return (
    <Item variant="muted">
      <Sparkles aria-hidden="true" className="size-4" />
      <ItemContent>
        <ItemTitle>{t('automation_offer_title')}</ItemTitle>
        <ItemDescription className="line-clamp-none">{t('automation_offer_description')}</ItemDescription>
      </ItemContent>
      {isAdminSession(session) && (
        <ItemActions>
          <AppLink to="/billing" search={{ upgrade: true }}>
            {t('see_plans')}
          </AppLink>
        </ItemActions>
      )}
    </Item>
  );
}
