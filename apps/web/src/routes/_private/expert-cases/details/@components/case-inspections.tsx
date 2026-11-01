import { Badge } from '@ethica/ui/components/badge';
import { ItemDescription } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { LinkList, LinkListItem } from '@/components/link-list.js';
import { Panel } from '@/components/panel.js';
import { apiUrl } from '@/lib/api/client.api.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseInspectionsQuery } from '@/query/vistoria.js';

// Registros de vistoria da perícia (CAM-02.3) e a galeria das fotos (CAM-03.3).
export function CaseInspections({ caseId }: { caseId: string }) {
  const query = useQuery(caseInspectionsQuery(caseId));
  const registros = query.data ?? [];
  const fotos = registros.flatMap(({ compromisso, vistoria }) =>
    vistoria.midias
      .filter((midia) => midia.tipo === 'photo')
      .map((midia) => ({ compromissoId: compromisso.id, midia })),
  );

  return (
    <Panel size="sm" title={t('inspections')} description={t('inspections_panel_description')}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !registros.length ? (
        <DefaultEmptyData title={t('no_inspection_records_yet')} />
      ) : (
        <>
          <LinkList>
            {registros.map(({ compromisso, vistoria }) => (
              <LinkListItem
                key={compromisso.id}
                icon={ClipboardList}
                render={<Link to="/field/inspection" search={{ id: compromisso.id }} />}
                title={compromisso.titulo}
                badges={<Badge variant="secondary">{t(compromisso.status)}</Badge>}
                description={[
                  formatDateTime(compromisso.inicio),
                  `${vistoria.dados.presentes.length} ${t('attendees').toLowerCase()}`,
                  `${vistoria.midias.filter((midia) => midia.tipo === 'photo').length} ${t('photos').toLowerCase()}`,
                ].join(' · ')}
              />
            ))}
          </LinkList>
          {fotos.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t('photos')}>
              {fotos.map(({ compromissoId, midia }) => (
                <li key={midia.id} className="grid gap-1">
                  <img
                    src={apiUrl(`/inspections/${compromissoId}/media/${midia.id}`)}
                    alt={midia.legenda ?? ''}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-md object-cover"
                  />
                  {midia.legenda && <ItemDescription>{midia.legenda}</ItemDescription>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
