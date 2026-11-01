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
import { caseInspectionsQuery } from '@/query/inspection.js';

// Registros de vistoria da perícia (CAM-02.3) e a galeria das fotos (CAM-03.3).
export function CaseInspections({ caseId }: { caseId: string }) {
  const query = useQuery(caseInspectionsQuery(caseId));
  const records = query.data ?? [];
  const photos = records.flatMap(({ appointment, inspection }) =>
    inspection.media
      .filter((media) => media.tipo === 'photo')
      .map((media) => ({ appointmentId: appointment.id, media })),
  );

  return (
    <Panel size="sm" title={t('inspections')} description={t('inspections_panel_description')}>
      {query.isLoading ? (
        <DefaultLoading />
      ) : !records.length ? (
        <DefaultEmptyData title={t('no_inspection_records_yet')} />
      ) : (
        <>
          <LinkList>
            {records.map(({ appointment, inspection }) => (
              <LinkListItem
                key={appointment.id}
                icon={ClipboardList}
                render={<Link to="/field/inspection" search={{ id: appointment.id }} />}
                title={appointment.titulo}
                badges={<Badge variant="secondary">{t(appointment.status)}</Badge>}
                description={[
                  formatDateTime(appointment.inicio),
                  `${inspection.dados.attendees.length} ${t('attendees').toLowerCase()}`,
                  `${inspection.media.filter((media) => media.tipo === 'photo').length} ${t('photos').toLowerCase()}`,
                ].join(' · ')}
              />
            ))}
          </LinkList>
          {photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t('photos')}>
              {photos.map(({ appointmentId, media }) => (
                <li key={media.id} className="grid gap-1">
                  <img
                    src={apiUrl(`/inspections/${appointmentId}/media/${media.id}`)}
                    alt={media.caption ?? ''}
                    loading="lazy"
                    className="aspect-4/3 w-full rounded-md object-cover"
                  />
                  {media.caption && <ItemDescription>{media.caption}</ItemDescription>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}
