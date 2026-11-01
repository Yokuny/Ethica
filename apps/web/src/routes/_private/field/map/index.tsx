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
import { conflictingStops, type Ponto, sortByProximity } from './@utils/itinerary.js';

// Rota pelas ruas no OSRM público (AD-131); sem rota, o mapa liga as paradas em linha reta.
const itineraryOsrm = async (pontos: Ponto[]): Promise<Ponto[]> => {
  const caminho = pontos.map((p) => `${p.lng},${p.lat}`).join(';');
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${caminho}?overview=full&geometries=geojson`,
  );
  if (!res.ok) throw new Error('osrm');
  const corpo = (await res.json()) as { routes?: Array<{ geometry: { coordinates: [number, number][] } }> };
  return corpo.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })) ?? pontos;
};

// Mapa do dia (CAM-08, CAM-09): ordem sugerida, conflito de horário, rota e aviso às partes.
export function MapPage() {
  const search = useSearch({ strict: false }) as FieldSearch;
  const queryClient = useQueryClient();
  const date = search.date ?? formatDisplayDate(new Date());
  const query = useQuery({ ...inspectionDayQuery(date), networkMode: 'always' });
  const geocode = useMutation(geocodeMutation(queryClient));
  const notice = useMutation(sendNoticeMutation(queryClient));
  const [partida, setPartida] = useState<Ponto>();
  const [ordem, setOrdem] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);

  const itens = useMemo(
    () => (query.data?.itens ?? []).filter((item) => item.appointment.status !== 'canceled'),
    [query.data],
  );
  const ordenados = useMemo(() => {
    const posicao = new Map(ordem.map((id, indice) => [id, indice]));
    return [...itens].sort((a, b) => (posicao.get(a.appointment.id) ?? 999) - (posicao.get(b.appointment.id) ?? 999));
  }, [itens, ordem]);
  const conflicts = conflictingStops(ordenados.map((item) => item.appointment.inicio));
  const semPonto = itens.filter((item) => item.appointment.local && !item.appointment.coordinates);
  const pontos = [
    ...(partida ? [partida] : []),
    ...ordenados.flatMap((item) => (item.appointment.coordinates ? [item.appointment.coordinates] : [])),
  ];
  const itinerary = useQuery({
    queryKey: ['itinerary-osrm', pontos],
    queryFn: () => itineraryOsrm(pontos),
    enabled: pontos.length > 1,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  async function locateAddresses() {
    for (const item of semPonto) {
      await geocode.mutateAsync({ id: item.appointment.id }).catch((error: Error) => toast.error(error.message));
    }
  }

  function applyMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const ponto = { lat: posicao.coords.latitude, lng: posicao.coords.longitude };
        setPartida(ponto);
        setOrdem(
          sortByProximity(
            ponto,
            itens.map((item) => ({ id: item.appointment.id, coordinates: item.appointment.coordinates })),
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

  function mover(indice: number, passo: -1 | 1) {
    const ids = ordenados.map((item) => item.appointment.id);
    const destino = indice + passo;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino] as string, ids[indice] as string];
    setOrdem(ids);
  }

  const stops = ordenados.flatMap((item, indice) =>
    item.appointment.coordinates
      ? [
          {
            id: item.appointment.id,
            numero: indice + 1,
            ponto: item.appointment.coordinates,
            titulo: item.appointment.titulo,
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
        ) : !itens.length ? (
          <DefaultEmptyData title={t('nothing_scheduled_this_day')} />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={locating} onClick={applyMyLocation}>
                <LocateFixed />
                {t('start_from_my_location')}
              </Button>
              {semPonto.length > 0 && (
                <Button variant="outline" disabled={geocode.isPending} onClick={() => void locateAddresses()}>
                  <MapPinned />
                  {t('locate_addresses')} ({semPonto.length})
                </Button>
              )}
            </div>
            <MapLeaflet stops={stops} partida={partida} row={itinerary.data ?? pontos} />
            {itinerary.isError && <ItemDescription>{t('route_unavailable_straight_lines')}</ItemDescription>}
            <ItemGroup variant="list">
              {ordenados.map((item, indice) => {
                const { appointment } = item;
                return (
                  <Item key={appointment.id} render={<li />} className="flex-wrap">
                    <ItemContent>
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemTitle className="tabular-nums">
                          {indice + 1}. {formatDisplayTime(appointment.inicio)}
                        </ItemTitle>
                        {conflicts.has(indice) && <Badge variant="error">{t('time_conflict')}</Badge>}
                        {!appointment.coordinates && <Badge variant="warning">{t('address_not_located')}</Badge>}
                        {(appointment.notices?.length ?? 0) > 0 && (
                          <Badge variant="success">{t('parties_notified')}</Badge>
                        )}
                      </div>
                      <ItemTitle>{appointment.titulo}</ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        {[item.legalCase?.processNumber, appointment.local].filter(Boolean).join(' · ')}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions className="flex-wrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('move_up')}
                        disabled={indice === 0}
                        onClick={() => mover(indice, -1)}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('move_down')}
                        disabled={indice === ordenados.length - 1}
                        onClick={() => mover(indice, 1)}
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
            {pontos.length > 1 && (
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
