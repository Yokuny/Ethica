import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { ClipboardList, MapPin } from 'lucide-react';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { DayInspection } from '@/query/inspection.js';

type FieldCardProps = {
  item: DayInspection;
  onStatus: (status: 'done' | 'canceled', reason?: 'postponed' | 'absent') => void;
};

const mapsUrl = (location: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
const wazeUrl = (location: string) => `https://waze.com/ul?q=${encodeURIComponent(location)}&navigate=yes`;

// Um compromisso do dia no celular (CAM-01): chegar, marcar o resultado e abrir o registro.
export function FieldCard({ item, onStatus }: FieldCardProps) {
  const { appointment, legalCase, inspection } = item;
  const status = appointment.reason ?? appointment.status;
  const recorded = inspection.version > 0 || inspection.media.length > 0;

  return (
    <Item render={<li />} className="gap-3">
      <div className="flex basis-full items-start gap-3">
        <ItemContent>
          <div className="flex flex-wrap items-center gap-2">
            <ItemTitle className="tabular-nums">{formatDisplayTime(appointment.start)}</ItemTitle>
            <Badge variant={APPOINTMENT_TYPE_VARIANT[appointment.type]}>{t(appointment.type)}</Badge>
            <Badge variant="secondary">{t(status)}</Badge>
            {recorded && <Badge variant="success">{t('record_started')}</Badge>}
          </div>
          <ItemTitle>{appointment.title}</ItemTitle>
          {legalCase && (
            <ItemDescription className="line-clamp-none">
              {[legalCase.processNumber, [legalCase.plaintiff, legalCase.defendant].filter(Boolean).join(' × ')]
                .filter(Boolean)
                .join(' · ')}
            </ItemDescription>
          )}
          {appointment.location && (
            <ItemDescription className="line-clamp-none">
              <MapPin className="mr-1 inline size-3.5" aria-hidden />
              {appointment.location}
            </ItemDescription>
          )}
        </ItemContent>
      </div>
      <ItemFooter className="flex-wrap gap-2">
        <ItemActions className="flex-wrap">
          {appointment.location && (
            <>
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href={mapsUrl(appointment.location)} target="_blank" rel="noreferrer">
                    Google Maps
                  </a>
                }
              />
              <Button
                variant="outline"
                nativeButton={false}
                render={
                  <a href={wazeUrl(appointment.location)} target="_blank" rel="noreferrer">
                    Waze
                  </a>
                }
              />
            </>
          )}
        </ItemActions>
        <ItemActions className="ml-auto flex-wrap">
          <Button variant="outline" onClick={() => onStatus('done')} disabled={appointment.status === 'done'}>
            {t('done')}
          </Button>
          <Button variant="outline" onClick={() => onStatus('canceled', 'postponed')}>
            {t('postponed')}
          </Button>
          <Button variant="outline" onClick={() => onStatus('canceled', 'absent')}>
            {t('absent')}
          </Button>
          <Button nativeButton={false} render={<Link to="/field/inspection" search={{ id: appointment.id }} />}>
            <ClipboardList />
            {t('inspection_record')}
          </Button>
        </ItemActions>
      </ItemFooter>
    </Item>
  );
}
