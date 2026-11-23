import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { notificationText } from '@/components/notification-labels.js';
import { SuggestionReceiptDialog } from '@/components/suggestion-receipt-dialog.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { decideSuggestionMutation, type NotificationRecord, notificationsQuery } from '@/query/notification.js';
import { can, sessionQuery } from '@/query/session.js';

// "Rejeitar" and "Aprovar" of a pending suggestion (AD-268): nothing changes before it, and only whoever changes
// the module of the suggestion sees them (D5). The receipt asks the income and the amount first (AD-269).
export function SuggestionActions({ suggestion }: { suggestion: NotificationRecord }) {
  const queryClient = useQueryClient();
  const session = useQuery(sessionQuery).data;
  const [receipt, setReceipt] = useState(false);
  const mutation = useMutation(decideSuggestionMutation(queryClient));
  if (!session || !can(session, suggestion.module, 'update')) return null;

  const decide = (decision: 'accept' | 'reject') =>
    mutation.mutate(
      { id: suggestion.id, decision },
      {
        onSuccess: (result) =>
          toast.success(
            t(
              result.status === 'superseded'
                ? 'suggestion_already_applied'
                : decision === 'accept'
                  ? 'suggestion_applied'
                  : 'suggestion_rejected',
            ),
          ),
        onError: (error: Error) => toast.error(error.message),
      },
    );

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => decide('reject')}>
        {t('reject')}
      </Button>
      <Button
        size="sm"
        disabled={mutation.isPending}
        onClick={() =>
          suggestion.proposal?.target === 'transaction_installment' ? setReceipt(true) : decide('accept')
        }
      >
        {t('approve')}
      </Button>
      {receipt && <SuggestionReceiptDialog suggestion={suggestion} onClose={() => setReceipt(false)} />}
    </div>
  );
}

// The pending suggestions of a case (its "No tribunal"), in the order of the court.
export function SuggestionsList({ caseId }: { caseId: string }) {
  const query = useQuery(notificationsQuery({ caseId, kind: ['suggestion'], state: 'open', limit: 100 }));
  const items = query.data?.items ?? [];
  if (!items.length) return null;

  return (
    <div className="grid gap-2">
      {items.map((suggestion) => {
        const text = notificationText(suggestion);
        return (
          <Item key={suggestion.id} variant="muted">
            <ItemContent>
              <ItemTitle className="gap-2">
                <Badge variant="warning">{t('suggestions_to_approve')}</Badge>
                {text.title}
              </ItemTitle>
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
    </div>
  );
}
