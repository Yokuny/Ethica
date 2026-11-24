import { Badge } from '@ethica/ui/components/badge';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ClipboardList } from 'lucide-react';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Panel } from '@/components/panel.js';
import { apiUrl } from '@/lib/api/client.api.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { caseInspectionsQuery } from '@/query/inspection.js';

// Inspection records of the case (CAM-02.3) and the photo gallery (CAM-03.3).
export function CaseInspections({ caseId }: { caseId: string }) {
  const query = useQuery(caseInspectionsQuery(caseId));
  const records = query.data ?? [];
  const photos = records.flatMap(({ appointment, inspection }) =>
    inspection.media
      .filter((media) => media.type === 'photo')
      .map((media) => ({ appointmentId: appointment.id, media })),
  );

  return (
    <Panel
      collapsible
      icon={<ClipboardList />}
      size="sm"
      title={t('inspections')}
      empty={query.isSuccess && !records.length}
      description={t('inspections_panel_description')}
    >
      {query.isLoading ? (
        <DefaultLoading />
      ) : !records.length ? (
        <DefaultEmptyData title={t('no_inspection_records_yet')} />
      ) : (
        <>
          <ItemGroup variant="list">
            {records.map(({ appointment, inspection }) => (
              <li key={appointment.id}>
                <Item render={<Link to="/field/inspections/details" search={{ id: appointment.id }} />}>
                  <ItemContent>
                    <ItemTitle>{appointment.title}</ItemTitle>
                    <ItemDescription>
                      {[
                        formatDateTime(appointment.start),
                        `${inspection.data.attendees.length} ${t('attendees').toLowerCase()}`,
                        `${inspection.media.filter((media) => media.type === 'photo').length} ${t('photos').toLowerCase()}`,
                      ].join(' · ')}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions>
                    <Badge variant="secondary">{t(appointment.status)}</Badge>
                  </ItemActions>
                </Item>
              </li>
            ))}
          </ItemGroup>
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
