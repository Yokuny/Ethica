import { caseLabel } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { createFileRoute } from '@tanstack/react-router';
import { Crosshair } from 'lucide-react';
import { APPOINTMENT_TYPE_VARIANT } from '@/components/appointment-labels.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { Card, CardAction, CardContent, CardHeader } from '@/components/page-card.js';
import { formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { DayStrip } from '../@components/day-strip.js';
import { FieldConnection } from '../@components/field-connection.js';
import { FieldState } from '../@components/field-state.js';
import { LocateAddresses } from '../@components/locate-addresses.js';
import { MapLeaflet } from '../@components/map-leaflet.js';
import { RangePicker } from '../@components/range-picker.js';
import { useFieldRange } from '../@hooks/use-field-range.js';
import { type FieldSearch, fieldSearchSchema } from '../@interface/field.interface.js';
import type { Point } from '../@utils/itinerary.js';

// The map page draws no route: that is the route planning page (LOG-04).
const NO_ROUTE: Point[] = [];

// Map of the range (AD-239, LOG-03), with the days side by side above it (AD-242): the stops numbered in date and time order and, below, the list of what is on the
// map. It opens on `focus` ("Ver no mapa"), otherwise on the next scheduled stop, otherwise on the first one.
export function FieldMapPage() {
  const { from, to, focus, update, query, items: all } = useFieldRange();
  const items = all.filter((item) => item.appointment.status !== 'canceled');
  const withDate = from !== to;
  const pickRange = (range: { from: string; to: string }) => update({ ...range, focus: undefined });
  const stops = items.flatMap((item, index) =>
    item.appointment.coordinates
      ? [
          {
            id: item.appointment.id,
            number: index + 1,
            point: item.appointment.coordinates,
            title: item.appointment.title,
          },
        ]
      : [],
  );
  const now = new Date().toISOString();
  const center = (
    items.find((item) => item.appointment.id === focus && item.appointment.coordinates) ??
    items.find(
      (item) =>
        item.appointment.coordinates && item.appointment.status === 'scheduled' && item.appointment.start >= now,
    ) ??
    items.find((item) => item.appointment.coordinates)
  )?.appointment.coordinates;

  return (
    <Card asPage>
      <CardHeader title={t('map')}>
        <CardAction>
          <RangePicker from={from} to={to} onChange={pickRange} />
        </CardAction>
      </CardHeader>
      <CardContent className="gap-4">
        <DayStrip from={from} to={to} onChange={pickRange} />
        <FieldConnection ofDevice={query.data?.ofDevice} />
        <FieldState query={query}>
          <MapLeaflet stops={stops} row={NO_ROUTE} center={center}>
            <LocateAddresses items={items} />
          </MapLeaflet>
          {!items.length ? (
            <DefaultEmptyData title={t('nothing_scheduled_in_period')} />
          ) : (
            <ItemGroup variant="list">
              {items.map((item, index) => {
                const { appointment } = item;
                return (
                  <Item key={appointment.id} render={<li />} className="flex-wrap">
                    <ItemContent>
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemTitle className="tabular-nums">
                          {index + 1}. {(withDate ? formatDateTime : formatDisplayTime)(appointment.start)}
                        </ItemTitle>
                        <Badge variant={APPOINTMENT_TYPE_VARIANT[appointment.type]}>{t(appointment.type)}</Badge>
                        <Badge variant="secondary">{t(appointment.reason ?? appointment.status)}</Badge>
                        {!appointment.coordinates && <Badge variant="warning">{t('address_not_located')}</Badge>}
                      </div>
                      <ItemTitle>{appointment.title}</ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        {[item.legalCase && caseLabel(item.legalCase), appointment.location]
                          .filter(Boolean)
                          .join(' · ')}
                      </ItemDescription>
                    </ItemContent>
                    {appointment.coordinates && (
                      <ItemActions>
                        <Button
                          variant={appointment.id === focus ? 'secondary' : 'ghost'}
                          onClick={() => update({ focus: appointment.id })}
                        >
                          <Crosshair />
                          {t('show_on_map')}
                        </Button>
                      </ItemActions>
                    )}
                  </Item>
                );
              })}
            </ItemGroup>
          )}
        </FieldState>
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/map/')({
  component: FieldMapPage,
  staticData: { title: t('map') },
  validateSearch: (search: Record<string, unknown>): FieldSearch => fieldSearchSchema.parse(search),
});
