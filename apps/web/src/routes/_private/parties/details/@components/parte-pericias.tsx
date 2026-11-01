import { Badge } from '@ethica/ui/components/badge';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Gavel } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { PERICIA_STATUS_VARIANT } from '@/components/pericia-labels.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { parteProcessosQuery } from '@/query/parte.js';

// Perícias em que a parte aparece (IMP-03.3), com o polo e o papel dela em cada uma.
export function PartePericias({ parteId }: { parteId: string }) {
  const query = useQuery(parteProcessosQuery(parteId));
  return (
    <Panel size="sm" title={t('expert_cases')}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.length ? (
        <DefaultEmptyData title={t('no_expert_cases_for_party')} />
      ) : (
        <LinkList>
          {query.data.map((pericia) => {
            const vinculo = pericia.partes.find((parte) => parte.parteId === parteId);
            return (
              <LinkListItem
                key={pericia.id}
                icon={Gavel}
                render={<Link to="/expert-cases/details" search={{ id: pericia.id }} />}
                title={pericia.numeroProcesso}
                badges={<Badge variant={PERICIA_STATUS_VARIANT[pericia.status]}>{t(pericia.status)}</Badge>}
                description={[vinculo && t(vinculo.polo), pericia.objeto].filter(Boolean).join(' · ')}
              />
            );
          })}
        </LinkList>
      )}
    </Panel>
  );
}
