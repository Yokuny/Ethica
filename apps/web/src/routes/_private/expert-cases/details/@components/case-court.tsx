import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Gavel } from 'lucide-react';
import { AutomationOffer } from '@/components/automation-offer.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Panel } from '@/components/panel.js';
import { SuggestionsList } from '@/components/suggestions-list.js';
import { trackedCaseDescription, trackedCaseLabel, trackedCaseState } from '@/components/tracked-case-labels.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { courtProcessQuery, trackedCasesQuery } from '@/query/automation.js';
import { hasAutomationSession, sessionQuery } from '@/query/session.js';

// Shown movements: the newest, enough to read the recent history.
const SHOWN = 30;

// "No tribunal" (ADT-02): the process in court as the Datajud tells it, newest first. Without the module, the
// offer (AD-276). Before the first movements, the same situation as the Automação page (PAC-02). Only read:
// nothing here changes the case (AD-268).
export function CaseCourt({ caseId }: { caseId: string }) {
  const session = useQuery(sessionQuery).data;
  const active = Boolean(session && hasAutomationSession(session));
  const query = useQuery({ ...courtProcessQuery(caseId), enabled: active });
  const courtProcess = query.data;
  const tracked = useQuery({ ...trackedCasesQuery, enabled: active && query.isSuccess && !courtProcess }).data?.find(
    (item) => item.caseId === caseId,
  );
  // A case not (or not yet) in the list reads as waiting, as before.
  const state = tracked ? trackedCaseState(tracked) : 'waiting';

  return (
    <Panel
      collapsible
      icon={<Gavel />}
      size="sm"
      title={t('court_process')}
      description={
        courtProcess
          ? [
              courtProcess.court,
              courtProcess.className,
              courtProcess.sourceUpdatedAt &&
                `${t('court_updated_at')} ${formatDate(new Date(courtProcess.sourceUpdatedAt))}`,
            ]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
    >
      {active && <SuggestionsList caseId={caseId} />}
      {!active ? (
        <AutomationOffer />
      ) : query.isLoading ? (
        <DefaultLoading />
      ) : !courtProcess ? (
        <DefaultEmptyData title={trackedCaseLabel(state)} description={trackedCaseDescription(tracked ?? {}, state)} />
      ) : (
        <ItemGroup>
          {courtProcess.movements.slice(0, SHOWN).map((movement) => (
            <Item key={movement.key} render={<li />}>
              <ItemMedia variant="icon">
                <Gavel />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{movement.name}</ItemTitle>
                <ItemDescription>
                  {[
                    formatDate(new Date(movement.at)),
                    ...movement.complements.map((item) => item.name).filter(Boolean),
                  ].join(' · ')}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      )}
    </Panel>
  );
}
