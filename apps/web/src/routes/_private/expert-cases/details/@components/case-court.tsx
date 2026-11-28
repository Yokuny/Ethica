import { Badge } from '@ethica/ui/components/badge';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Gavel } from 'lucide-react';
import { AutomationOffer } from '@/components/automation-offer.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Panel } from '@/components/panel.js';
import { trackedCaseDescription, trackedCaseLabel } from '@/components/tracked-case-labels.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { courtProcessQuery, trackedCasesQuery } from '@/query/automation.js';
import { hasAutomationSession, sessionQuery } from '@/query/session.js';
import { courtMovementRows } from '../@utils/court-movement-rows.js';

// Shown lines: the newest, enough to read the recent history (counted after the noise is taken out, SGD-08).
const SHOWN = 30;

// "No tribunal" (ADT-02): the process in court as the Datajud tells it, newest first. Without the module, the
// offer (AD-276). Before the first movements, the same situation as the Automação page (PAC-02). Only read:
// nothing here changes the case (AD-268).
export function CaseCourt({ caseId, processNumber }: { caseId: string; processNumber: string }) {
  const session = useQuery(sessionQuery).data;
  const active = Boolean(session && hasAutomationSession(session));
  const query = useQuery({ ...courtProcessQuery(caseId), enabled: active });
  const courtProcess = query.data;
  // The situation of this case, searched by its number in the list of the Automação page.
  const tracked = useQuery({
    ...trackedCasesQuery({ q: processNumber, limit: 5 }),
    enabled: active && query.isSuccess && !courtProcess,
  }).data?.items.find((item) => item.caseId === caseId);
  // A case not (or not yet) in the list reads as waiting, as before.
  const situation = tracked ?? { status: 'waiting' as const };

  return (
    <Panel
      icon={<Gavel />}
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
      {!active ? (
        <AutomationOffer />
      ) : query.isLoading ? (
        <DefaultLoading />
      ) : !courtProcess ? (
        <DefaultEmptyData title={trackedCaseLabel(situation.status)} description={trackedCaseDescription(situation)} />
      ) : (
        <ItemGroup>
          {courtMovementRows(courtProcess.movements)
            .slice(0, SHOWN)
            .map((row) => (
              <Item key={row.key} render={<li />}>
                <ItemMedia variant="icon">
                  <Gavel />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>{row.count > 1 ? `${row.name} ×${row.count}` : row.name}</ItemTitle>
                  <ItemDescription>{[formatDate(new Date(row.at)), ...row.complements].join(' · ')}</ItemDescription>
                </ItemContent>
                {row.rule && (
                  <ItemActions>
                    <Badge variant="info">{t('court_rule_movement')}</Badge>
                  </ItemActions>
                )}
              </Item>
            ))}
        </ItemGroup>
      )}
    </Panel>
  );
}
