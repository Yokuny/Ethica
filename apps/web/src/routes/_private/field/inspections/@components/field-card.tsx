import { caseLabel } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { ItemDescription, ItemTitle } from '@ethica/ui/components/item';
import { Link } from '@tanstack/react-router';
import { ClipboardList, Crosshair, MapPin } from 'lucide-react';
import { AppLink } from '@/components/app-link.js';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { formatDisplayDate, formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import type { DayInspection } from '@/query/inspection.js';
import { GoogleMapsIcon, WazeIcon } from '../../@components/navigation-icons.js';

type FieldCardProps = {
  item: DayInspection;
  // Week, month or year (CPE-01): the day goes with the time.
  withDate?: boolean;
  onStatus: (status: 'done' | 'canceled', reason?: 'postponed' | 'absent') => void;
};

const mapsUrl = (location: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
const wazeUrl = (location: string) => `https://waze.com/ul?q=${encodeURIComponent(location)}&navigate=yes`;

// One scheduled appointment on the phone (CAM-01, LOG-05), as a row split by a rule (AD-195): get there, see it on
// the map, open the service, mark the result and perform the inspection (the record).
export function FieldCard({ item, withDate, onStatus }: FieldCardProps) {
  const { appointment, legalCase, inspection } = item;
  const status = appointment.reason ?? appointment.status;
  const recorded = inspection.version > 0 || inspection.media.length > 0;
  const day = formatDisplayDate(appointment.start);
  const parties = legalCase && [legalCase.plaintiff, legalCase.defendant].filter(Boolean).join(' × ');

  return (
    <li className="flex flex-col gap-6 border-b py-8 first:pt-0 last:border-b-0 lg:py-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 flex-col gap-2 lg:w-2/3">
          {legalCase && (
            <AppLink to="/expert-cases/details" search={{ id: legalCase.id }}>
              {caseLabel(legalCase)}
            </AppLink>
          )}
          <ItemTitle
            // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
            render={<h3 />}
            className="text-2xl tracking-tight lg:text-3xl"
          >
            {appointment.title}
          </ItemTitle>
          {parties && <ItemDescription className="line-clamp-none text-base">{parties}</ItemDescription>}
          {appointment.location && (
            <ItemDescription className="line-clamp-none text-base">
              <MapPin className="mr-1 inline size-4" aria-hidden />
              {appointment.location}
            </ItemDescription>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant={APPOINTMENT_TYPE_VARIANT[appointment.type]}>{t(appointment.type)}</Badge>
            <Badge variant="secondary">{t(status)}</Badge>
            {recorded && <Badge variant="success">{t('record_started')}</Badge>}
          </div>
        </div>
        <ItemTitle className="order-first w-fit shrink-0 rounded-full md:order-last bg-muted px-4 py-1 font-medium text-base tabular-nums tracking-tight">
          {(withDate ? formatDateTime : formatDisplayTime)(appointment.start)}
        </ItemTitle>
      </div>
      <div className="flex flex-wrap gap-2">
        {appointment.location && (
          <>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href={mapsUrl(appointment.location)} target="_blank" rel="noreferrer">
                  <GoogleMapsIcon />
                  Google Maps
                </a>
              }
            />
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <a href={wazeUrl(appointment.location)} target="_blank" rel="noreferrer">
                  <WazeIcon />
                  Waze
                </a>
              }
            />
          </>
        )}
        {appointment.coordinates && (
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link to="/field/map" search={{ from: day, to: day, focus: appointment.id }}>
                <Crosshair />
                {t('show_on_map')}
              </Link>
            }
          />
        )}
        <div className="flex flex-wrap gap-2 md:ml-auto">
          <Button variant="outline" onClick={() => onStatus('done')} disabled={appointment.status === 'done'}>
            {t('done')}
          </Button>
          <Button variant="outline" onClick={() => onStatus('canceled', 'postponed')}>
            {t('postponed')}
          </Button>
          <Button variant="outline" onClick={() => onStatus('canceled', 'absent')}>
            {t('absent')}
          </Button>
          <Button
            nativeButton={false}
            render={<Link to="/field/inspections/details" search={{ id: appointment.id }} />}
          >
            <ClipboardList />
            {t('perform_inspection')}
          </Button>
        </div>
      </div>
    </li>
  );
}
