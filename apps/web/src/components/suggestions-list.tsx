import { Button } from '@ethica/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@ethica/ui/components/tooltip';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { SuggestionReceiptDialog } from '@/components/suggestion-receipt-dialog.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { decideSuggestionMutation, type NotificationRecord } from '@/query/notification.js';
import { can, sessionQuery } from '@/query/session.js';

// "Rejeitar" and "Aprovar" of a pending suggestion (AD-268): nothing changes before it, and only whoever changes
// the module of the suggestion sees them (D5). The receipt asks the income and the amount first (AD-269). In a table
// (`icons`) they are icons with the action in the tooltip.
export function SuggestionActions({ suggestion, icons = false }: { suggestion: NotificationRecord; icons?: boolean }) {
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

  const approve = () =>
    suggestion.proposal?.target === 'transaction_installment' ? setReceipt(true) : decide('accept');

  return (
    <div className="flex flex-wrap justify-end gap-2">
      {icons ? (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('reject')}
                  disabled={mutation.isPending}
                  onClick={() => decide('reject')}
                />
              }
            >
              <X />
            </TooltipTrigger>
            <TooltipContent>{t('reject')}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('approve')}
                  disabled={mutation.isPending}
                  onClick={approve}
                />
              }
            >
              <Check />
            </TooltipTrigger>
            <TooltipContent>{t('approve')}</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <Button variant="outline" size="sm" disabled={mutation.isPending} onClick={() => decide('reject')}>
            {t('reject')}
          </Button>
          <Button size="sm" disabled={mutation.isPending} onClick={approve}>
            {t('approve')}
          </Button>
        </>
      )}
      {receipt && <SuggestionReceiptDialog suggestion={suggestion} onClose={() => setReceipt(false)} />}
    </div>
  );
}
