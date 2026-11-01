import { Badge } from '@ethica/ui/components/badge';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Gavel } from 'lucide-react';
import { CASE_STATUS_VARIANT } from '@/components/case-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { partyProcessesQuery } from '@/query/party.js';

// Perícias em que a parte aparece (IMP-03.3), com o polo e o papel dela em cada uma.
export function PartyCases({ partyId }: { partyId: string }) {
  const query = useQuery(partyProcessesQuery(partyId));
  return (
    <Panel size="sm" title={t('expert_cases')}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.length ? (
        <DefaultEmptyData title={t('no_expert_cases_for_party')} />
      ) : (
        <LinkList>
          {query.data.map((legalCase) => {
            const link = legalCase.parties.find((party) => party.partyId === partyId);
            return (
              <LinkListItem
                key={legalCase.id}
                icon={Gavel}
                render={<Link to="/expert-cases/details" search={{ id: legalCase.id }} />}
                title={legalCase.processNumber}
                badges={<Badge variant={CASE_STATUS_VARIANT[legalCase.status]}>{t(legalCase.status)}</Badge>}
                description={[link && t(link.side), legalCase.subject].filter(Boolean).join(' · ')}
              />
            );
          })}
        </LinkList>
      )}
    </Panel>
  );
}
