import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AppLink } from '@/components/app-link.js';
import { casePhaseLabel } from '@/components/case-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { decideSuggestionMutation, type SuggestionRecord, suggestionsQuery } from '@/query/notification.js';
import { can, sessionQuery } from '@/query/session.js';

const proposalText = ({ proposal }: SuggestionRecord): string =>
  proposal.target === 'case_status'
    ? `${t('proposed_status')} ${t(proposal.value)}`
    : `${t('proposed_phase')} ${casePhaseLabel(proposal.value)}`;

// Pending suggestions of the automation (AD-268), in the order of the court: the movement that justifies it
// and the proposed change. Nothing changes before "Aprovar", which only shows to whoever changes cases (D5).
export function SuggestionsList({ caseId }: { caseId?: string }) {
  const queryClient = useQueryClient();
  const session = useQuery(sessionQuery).data;
  const canDecide = Boolean(session && can(session, 'expert_cases', 'update'));
  const query = useQuery(suggestionsQuery(caseId));
  const mutation = useMutation(decideSuggestionMutation(queryClient));

  const decide = (id: string, decision: 'accept' | 'reject') =>
    mutation.mutate(
      { id, decision },
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

  if (query.isLoading) return <DefaultLoading />;
  const items = query.data ?? [];
  if (!items.length) return caseId ? null : <DefaultEmptyData title={t('no_suggestions')} />;

  return (
    <div className="grid gap-2">
      {items.map((suggestion) => {
        const { movement, court } = suggestion.evidence;
        return (
          <Item key={suggestion.id} variant="muted">
            <ItemContent>
              <ItemTitle className="gap-2">
                <Badge variant="warning">{t('suggestions_to_approve')}</Badge>
                {proposalText(suggestion)}
              </ItemTitle>
              <ItemDescription className="line-clamp-none">
                {`${t('court_movement_label')} (${court}): ${movement.name} · ${formatDate(new Date(movement.at))}`}
              </ItemDescription>
              {!caseId && (
                <AppLink to="/expert-cases/details" search={{ id: suggestion.caseId }} as="description">
                  {suggestion.caseNumber ?? t('open_case')}
                </AppLink>
              )}
            </ItemContent>
            {canDecide && (
              <ItemActions>
                <Button variant="outline" disabled={mutation.isPending} onClick={() => decide(suggestion.id, 'reject')}>
                  {t('reject')}
                </Button>
                <Button disabled={mutation.isPending} onClick={() => decide(suggestion.id, 'accept')}>
                  {t('approve')}
                </Button>
              </ItemActions>
            )}
          </Item>
        );
      })}
    </div>
  );
}
