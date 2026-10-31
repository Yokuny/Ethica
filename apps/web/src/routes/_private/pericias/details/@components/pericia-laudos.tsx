import { laudoTipoDoPapel } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FileSignature } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LAUDO_STATUS_VARIANT, laudoStatusLabel } from '@/components/laudo-labels.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { formatDate } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { laudosQuery } from '@/query/laudo.js';
import type { PericiaRecord } from '@/query/pericia.js';

// Laudos (ou pareceres, LAU-06) da perícia, com atalho para iniciar um novo.
export function PericiaLaudos({ pericia }: { pericia: PericiaRecord }) {
  const query = useQuery(laudosQuery({ periciaId: pericia.id, limit: 20 }));
  const tipo = laudoTipoDoPapel(pericia.papel);

  return (
    <Panel
      size="sm"
      title={t(tipo === 'technical_opinion' ? 'technical_opinions' : 'expert_reports')}
      actions={
        <Button
          variant="outline"
          nativeButton={false}
          render={
            <Link to="/laudos/add" search={{ periciaId: pericia.id }}>
              {t(tipo === 'technical_opinion' ? 'start_technical_opinion' : 'start_report')}
            </Link>
          }
        />
      }
    >
      {query.isLoading ? (
        <DefaultLoading />
      ) : !query.data?.items.length ? (
        <DefaultEmptyData title={t('no_reports_yet')} />
      ) : (
        <LinkList>
          {query.data.items.map((laudo) => (
            <LinkListItem
              key={laudo.id}
              icon={FileSignature}
              render={<Link to="/laudos/details" search={{ id: laudo.id }} />}
              title={laudo.modeloNome}
              badges={<Badge variant={LAUDO_STATUS_VARIANT[laudo.status]}>{laudoStatusLabel(laudo.status)}</Badge>}
              description={`${t('updated_on')} ${formatDate(laudo.updatedAt)}`}
            />
          ))}
        </LinkList>
      )}
    </Panel>
  );
}
