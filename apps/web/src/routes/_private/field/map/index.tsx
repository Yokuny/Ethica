import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, LocateFixed, Mail, MapPinned, Route as RouteIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { DefaultLoading } from '@/components/default-loading.js';
import { Card, CardContent, CardHeader } from '@/components/page-card.js';
import { formatDisplayDate, formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { geocodeMutation, inspectionDayQuery, sendNoticeMutation } from '@/query/inspection.js';
import { type FieldSearch, fieldSearchSchema } from '../@interface/field.interface.js';
import { MapLeaflet } from './@components/map-leaflet.js';
import { conflictingStops, type Point, sortByProximity } from './@utils/itinerary.js';

// Street route on the public OSRM (AD-131); without a route, the map joins the stops in a straight line.
const itineraryOsrm = async (points: Point[]): Promise<Point[]> => {
  const path = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`);
  if (!res.ok) throw new Error('osrm');
  const body = (await res.json()) as { routes?: Array<{ geometry: { coordinates: [number, number][] } }> };
  return body.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })) ?? points;
};

// Day map (CAM-08, CAM-09): suggested order, time conflict, route and notice to the parties.
export function MapPage() {
  const search = useSearch({ strict: false }) as FieldSearch;
  const queryClient = useQueryClient();
  const date = search.date ?? formatDisplayDate(new Date());
  const query = useQuery({ ...inspectionDayQuery(date), networkMode: 'always' });
  const geocode = useMutation(geocodeMutation(queryClient));
  const notice = useMutation(sendNoticeMutation(queryClient));
  const [origin, setOrigin] = useState<Point>();
  const [order, setOrder] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  const items = useMemo(
    () => (query.data?.items ?? []).filter((item) => item.appointment.status !== 'canceled'),
    [query.data],
  );
  const sorted = useMemo(() => {
    const position = new Map(order.map((id, index) => [id, index]));
    return [...items].sort((a, b) => (position.get(a.appointment.id) ?? 999) - (position.get(b.appointment.id) ?? 999));
  }, [items, order]);
  const conflicts = conflictingStops(sorted.map((item) => item.appointment.start));
  const withoutPoint = items.filter((item) => item.appointment.location && !item.appointment.coordinates);
  const points = [
    ...(origin ? [origin] : []),
    ...sorted.flatMap((item) => (item.appointment.coordinates ? [item.appointment.coordinates] : [])),
  ];
  const itinerary = useQuery({
    queryKey: ['itinerary-osrm', points],
    queryFn: () => itineraryOsrm(points),
    enabled: points.length > 1,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  async function locateAddresses() {
    for (const item of withoutPoint) {
      await geocode.mutateAsync({ id: item.appointment.id }).catch((error: Error) => toast.error(error.message));
    }
  }

  function applyMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        setOrigin(point);
        setOrder(
          sortByProximity(
            point,
            items.map((item) => ({ id: item.appointment.id, coordinates: item.appointment.coordinates })),
          ).map((item) => item.id),
        );
        setLocating(false);
      },
      () => {
        toast.error(t('location_unavailable'));
        setLocating(false);
      },
    );
  }

  function move(index: number, passo: -1 | 1) {
    const ids = sorted.map((item) => item.appointment.id);
    const destination = index + passo;
    if (destination < 0 || destination >= ids.length) return;
    [ids[index], ids[destination]] = [ids[destination] as string, ids[index] as string];
    setOrder(ids);
  }

  const stops = sorted.flatMap((item, index) =>
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

  return (
    <Card asPage>
      <CardHeader title={t('day_map')} />
      <CardContent className="gap-4">
        {query.isLoading ? (
          <DefaultLoading />
        ) : !items.length ? (
          <DefaultEmptyData title={t('nothing_scheduled_this_day')} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={locating} onClick={applyMyLocation}>
                <LocateFixed />
                {t('start_from_my_location')}
              </Button>
              {withoutPoint.length > 0 && (
                <Button variant="outline" disabled={geocode.isPending} onClick={() => void locateAddresses()}>
                  <MapPinned />
                  {t('locate_addresses')} ({withoutPoint.length})
                </Button>
              )}
            </div>
            <MapLeaflet stops={stops} origin={origin} row={itinerary.data ?? points} />
            {itinerary.isError && <ItemDescription>{t('route_unavailable_straight_lines')}</ItemDescription>}
            <ItemGroup variant="list">
              {sorted.map((item, index) => {
                const { appointment } = item;
                return (
                  <Item key={appointment.id} render={<li />} className="flex-wrap">
                    <ItemContent>
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemTitle className="tabular-nums">
                          {index + 1}. {formatDisplayTime(appointment.start)}
                        </ItemTitle>
                        {conflicts.has(index) && <Badge variant="error">{t('time_conflict')}</Badge>}
                        {!appointment.coordinates && <Badge variant="warning">{t('address_not_located')}</Badge>}
                        {(appointment.notices?.length ?? 0) > 0 && (
                          <Badge variant="success">{t('parties_notified')}</Badge>
                        )}
                      </div>
                      <ItemTitle>{appointment.title}</ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        {[item.legalCase?.processNumber, appointment.location].filter(Boolean).join(' · ')}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex-wrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('move_up')}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('move_down')}
                        disabled={index === sorted.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown />
                      </Button>
                      {appointment.caseId && (
                        <Button
                          variant="outline"
                          disabled={notice.isPending}
                          onClick={() =>
                            notice.mutate(
                              { id: appointment.id },
                              {
                                onSuccess: () => toast.success(t('notice_sent')),
                                onError: (error) => toast.error(error.message),
                              },
                            )
                          }
                        >
                          <Mail />
                          {t('notify_parties')}
                        </Button>
                      )}
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
            {points.length > 1 && (
              <ItemDescription>
                <RouteIcon className="mr-1 inline size-3.5" aria-hidden />
                {t('route_by_osrm')}
              </ItemDescription>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const Route = createFileRoute('/_private/field/map/')({
  component: MapPage,
  staticData: { title: t('day_map') },
  validateSearch: (search: Record<string, unknown>): FieldSearch => fieldSearchSchema.parse(search),
});
