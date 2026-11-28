import { type CaseProposal, proposalFits } from '@ethica/contracts';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { Popover, PopoverContent, PopoverTrigger } from '@ethica/ui/components/popover';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { notificationText } from '@/components/notification-labels.js';
import { SuggestionActions } from '@/components/suggestions-list.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { CaseRecord } from '@/query/case.js';
import { type NotificationRecord, notificationsQuery } from '@/query/notification.js';
import { can, hasAutomationSession, sessionQuery } from '@/query/session.js';

type Target = CaseProposal['target'];

// The pending suggestions of a case that the person may decide (D5) and that still fit the case as it is now
// (SGD-01.6): a suggestion only closes when someone decides it, so one already done by hand is not shown. Without
// the case loaded (the entry page), only the fit check is skipped: a receipt always fits.
export function useCaseSuggestions(caseId?: string, legalCase?: CaseRecord): NotificationRecord[] {
  const session = useQuery(sessionQuery).data;
  const active = Boolean(session && caseId && hasAutomationSession(session));
  const query = useQuery({
    ...notificationsQuery({ caseId: caseId ?? '', kind: ['suggestion'], state: 'open', limit: 100 }),
    enabled: active,
  });
  if (!session || !active) return [];
  return (query.data?.items ?? []).filter(
    (item) =>
      item.proposal &&
      can(session, item.module, 'update') &&
      (!legalCase || proposalFits(legalCase, item.proposal) === 'apply'),
  );
}

export const suggestionsFor = (items: NotificationRecord[], ...targets: Target[]): NotificationRecord[] =>
  items.filter((item) => item.proposal && targets.includes(item.proposal.target));

// The button of the automation's intelligence (SGD-01): beside the data a suggestion changes, and in the page
// header with how many there are. The border turns in purple and pink; still for whoever asks for less motion.
// It opens what changes, where it came from and Approve/Reject.
export function SuggestionButton({
  suggestions,
  count = false,
}: {
  suggestions: NotificationRecord[];
  count?: boolean;
}) {
  if (!suggestions.length) return null;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="suggestion-glow">
            <Sparkles />
            {count
              ? `${suggestions.length} ${t(suggestions.length > 1 ? 'suggestions' : 'suggestion')}`
              : t('suggestion')}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)]">
        <ItemGroup>
          {suggestions.map((suggestion) => {
            const text = notificationText(suggestion);
            return (
              <Item key={suggestion.id} variant="muted" className="flex-col items-stretch">
                <ItemContent>
                  <ItemTitle className="line-clamp-none">{text.title}</ItemTitle>
                  <ItemDescription className="line-clamp-none">
                    {`${text.description} · ${formatDate(new Date(`${suggestion.date}T12:00:00`))}`}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  <SuggestionActions suggestion={suggestion} />
                </ItemActions>
              </Item>
            );
          })}
        </ItemGroup>
      </PopoverContent>
    </Popover>
  );
}
