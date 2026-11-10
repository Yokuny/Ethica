import { caseLabel } from '@ethica/contracts';
import { Badge } from '@ethica/ui/components/badge';
import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, LocateFixed, Mail, MapPinned, Route as RouteIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Checkbox } from '@/components/checkbox.js';
import { DefaultEmptyData } from '@/components/default-empty-data.js';
import { formatDisplayTime } from '@/lib/helpers/displayTime.helper.js';
import { formatDateTime } from '@/lib/helpers/formatDate.helper.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { type DayInspection, geocodeMutation, sendNoticeMutation } from '@/query/inspection.js';
import { conflictingStops, type Point, sortByProximity } from '../@utils/itinerary.js';
import { findPlaces, type PlaceKind } from '../@utils/route-places.js';
import { MapLeaflet } from './map-leaflet.js';
import { RoutePlaces } from './route-places.js';
import { TravelCost } from './travel-cost.js';

// Street route on the public OSRM (AD-131) and its length in km (CDE-01); without a route, the map joins the
// stops in a straight line.
const itineraryOsrm = async (points: Point[]): Promise<{ path: Point[]; km?: number }> => {
  const path = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`);
  if (!res.ok) throw new Error('osrm');
  const body = (await res.json()) as {
    routes?: Array<{ distance: number; geometry: { coordinates: [number, number][] } }>;
  };
  const route = body.routes?.[0];
  return route
    ? {
        path: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
        km: Math.round(route.distance / 100) / 10,
      }
    : { path: points };
};

// "Mapa" view of the field (CAM-08, CAM-09, AD-194): suggested order, time conflict, route and notice to the
// parties. The map is always open, on the next inspection of the day or, without one, on the default place.
// `withDate` (week, month, year, CPE-01): each stop shows its day besides the time.
export function FieldMap({
  data,
  withDate,
  emptyTitle,
}: {
  data: DayInspection[];
  withDate: boolean;
  emptyTitle: string;
}) {
  const queryClient = useQueryClient();
  const geocode = useMutation(geocodeMutation(queryClient));
  const notice = useMutation(sendNoticeMutation(queryClient));
  const [origin, setOrigin] = useState<Point>();
  const [order, setOrder] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  const items = useMemo(() => data.filter((item) => item.appointment.status !== 'canceled'), [data]);
  const sorted = useMemo(() => {
    const position = new Map(order.map((id, index) => [id, index]));
    return [...items].sort((a, b) => (position.get(a.appointment.id) ?? 999) - (position.get(b.appointment.id) ?? 999));
  }, [items, order]);
  const conflicts = conflictingStops(sorted.map((item) => item.appointment.start));
  const withoutPoint = items.filter((item) => item.appointment.location && !item.appointment.coordinates);
  const [returnTrip, setReturnTrip] = useState(false);
  const [placeKind, setPlaceKind] = useState<PlaceKind>();
  const points = [
    ...(origin ? [origin] : []),
    ...sorted.flatMap((item) => (item.appointment.coordinates ? [item.appointment.coordinates] : [])),
    // Back to the starting point (CDE-01).
    ...(origin && returnTrip ? [origin] : []),
  ];
  const itinerary = useQuery({
    queryKey: ['itinerary-osrm', points],
    queryFn: () => itineraryOsrm(points),
    enabled: points.length > 1,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const path = itinerary.data?.path ?? points;
  const places = useQuery({
    queryKey: ['route-places', placeKind, path],
    queryFn: () => findPlaces(placeKind as PlaceKind, path),
    enabled: Boolean(placeKind) && path.length > 0,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  // The service orders of the route, for the travel expense (CDE-03).
  const routeCases = [
    ...new Map(
      sorted.flatMap((item) =>
        item.legalCase ? [[item.legalCase.id, { id: item.legalCase.id, label: caseLabel(item.legalCase) }]] : [],
      ),
    ).values(),
  ];

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

  // Next inspection: the first still scheduled from now on; otherwise the first stop of the day.
  const now = new Date().toISOString();
  const center = (
    sorted.find(
      (item) =>
        item.appointment.coordinates && item.appointment.status === 'scheduled' && item.appointment.start >= now,
    ) ?? sorted.find((item) => item.appointment.coordinates)
  )?.appointment.coordinates;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={locating || !items.length} onClick={applyMyLocation}>
          <LocateFixed />
          {t('start_from_my_location')}
        </Button>
        {withoutPoint.length > 0 && (
          <Button variant="outline" disabled={geocode.isPending} onClick={() => void locateAddresses()}>
            <MapPinned />
            {t('locate_addresses')} ({withoutPoint.length})
          </Button>
        )}
        {origin && (
          <Checkbox
            checked={returnTrip}
            onCheckedChange={(checked) => setReturnTrip(Boolean(checked))}
            label={t('include_return_trip')}
            labelClassName="normal-case tracking-normal"
          />
        )}
      </div>
      <MapLeaflet stops={stops} origin={origin} row={path} center={center} places={places.data} />
      {itinerary.isError && <ItemDescription>{t('route_unavailable_straight_lines')}</ItemDescription>}
      {items.length > 0 && (
        <RoutePlaces
          kind={placeKind}
          onKind={setPlaceKind}
          places={places.data}
          isLoading={places.isLoading}
          isError={places.isError}
        />
      )}
      {!items.length && <DefaultEmptyData title={emptyTitle} />}
      <ItemGroup variant="list">
        {sorted.map((item, index) => {
          const { appointment } = item;
          return (
            <Item key={appointment.id} render={<li />} className="flex-wrap">
              <ItemContent>
                <div className="flex flex-wrap items-center gap-2">
                  <ItemTitle className="tabular-nums">
                    {index + 1}. {(withDate ? formatDateTime : formatDisplayTime)(appointment.start)}
                  </ItemTitle>
                  {conflicts.has(index) && <Badge variant="error">{t('time_conflict')}</Badge>}
                  {!appointment.coordinates && <Badge variant="warning">{t('address_not_located')}</Badge>}
                  {(appointment.notices?.length ?? 0) > 0 && <Badge variant="success">{t('parties_notified')}</Badge>}
                </div>
                <ItemTitle>{appointment.title}</ItemTitle>
                <ItemDescription className="line-clamp-none">
                  {[item.legalCase && caseLabel(item.legalCase), appointment.location].filter(Boolean).join(' · ')}
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
      {items.length > 0 && <TravelCost routeKm={itinerary.data?.km} cases={routeCases} />}
    </>
  );
}
