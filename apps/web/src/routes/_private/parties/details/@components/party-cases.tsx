import { caseLabel } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { CASE_STATUS_VARIANT, casePhaseLabel } from '@/components/case-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Panel } from '@/components/panel.js';
import { sideLabel } from '@/components/party-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partyProcessesQuery } from '@/query/party.js';

// Cases the party appears in (IMP-03.3), with its side and role in each one.
export function PartyCases({ partyId }: { partyId: string }) {
  const query = useQuery(partyProcessesQuery(partyId));
  return (
    <Panel size="sm" title={t('expert_cases')}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.length ? (
        <DefaultEmptyData title={t('no_expert_cases_for_party')} />
      ) : (
        <ItemGroup>
          {query.data.map((legalCase) => {
            const link = legalCase.parties.find((party) => party.partyId === partyId);
            return (
              <li key={legalCase.id}>
                <Item render={<Link to="/expert-cases/details" search={{ id: legalCase.id }} />}>
                  <ItemContent>
                    <ItemTitle>{caseLabel(legalCase)}</ItemTitle>
                    <ItemDescription>
                      {[link && sideLabel(link.side, legalCase.courtType), legalCase.subject]
                        .filter(Boolean)
                        .join(' · ')}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant={CASE_STATUS_VARIANT[legalCase.status]}>
                      {casePhaseLabel(legalCase.phase, legalCase.phaseName)}
                    </Badge>
                  </ItemActions>
                </Item>
              </li>
            );
          })}
        </ItemGroup>
      )}
    </Panel>
  );
}
