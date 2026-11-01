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
import { enviarAvisoMutation, geocodificarMutation, vistoriaDiaQuery } from '@/query/vistoria.js';
import { type CampoSearch, campoSearchSchema } from '../@interface/campo.interface.js';
import { MapaLeaflet } from './@components/mapa-leaflet.js';
import { ordenarPorProximidade, type Ponto, paradasEmConflito } from './@utils/rota.js';

// Rota pelas ruas no OSRM público (AD-131); sem rota, o mapa liga as paradas em linha reta.
const rotaOsrm = async (pontos: Ponto[]): Promise<Ponto[]> => {
  const caminho = pontos.map((p) => `${p.lng},${p.lat}`).join(';');
  const res = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${caminho}?overview=full&geometries=geojson`,
  );
  if (!res.ok) throw new Error('osrm');
  const corpo = (await res.json()) as { routes?: Array<{ geometry: { coordinates: [number, number][] } }> };
  return corpo.routes?.[0]?.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })) ?? pontos;
};

// Mapa do dia (CAM-08, CAM-09): ordem sugerida, conflito de horário, rota e aviso às partes.
export function MapaPage() {
  const search = useSearch({ strict: false }) as CampoSearch;
  const queryClient = useQueryClient();
  const date = search.date ?? formatDisplayDate(new Date());
  const query = useQuery({ ...vistoriaDiaQuery(date), networkMode: 'always' });
  const geocode = useMutation(geocodificarMutation(queryClient));
  const aviso = useMutation(enviarAvisoMutation(queryClient));
  const [partida, setPartida] = useState<Ponto>();
  const [ordem, setOrdem] = useState<string[]>([]);
  const [localizando, setLocalizando] = useState(false);

  const itens = useMemo(
    () => (query.data?.itens ?? []).filter((item) => item.compromisso.status !== 'canceled'),
    [query.data],
  );
  const ordenados = useMemo(() => {
    const posicao = new Map(ordem.map((id, indice) => [id, indice]));
    return [...itens].sort((a, b) => (posicao.get(a.compromisso.id) ?? 999) - (posicao.get(b.compromisso.id) ?? 999));
  }, [itens, ordem]);
  const conflitos = paradasEmConflito(ordenados.map((item) => item.compromisso.inicio));
  const semPonto = itens.filter((item) => item.compromisso.local && !item.compromisso.coordenadas);
  const pontos = [
    ...(partida ? [partida] : []),
    ...ordenados.flatMap((item) => (item.compromisso.coordenadas ? [item.compromisso.coordenadas] : [])),
  ];
  const rota = useQuery({
    queryKey: ['rota-osrm', pontos],
    queryFn: () => rotaOsrm(pontos),
    enabled: pontos.length > 1,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

  async function localizarEnderecos() {
    for (const item of semPonto) {
      await geocode.mutateAsync({ id: item.compromisso.id }).catch((error: Error) => toast.error(error.message));
    }
  }

  function usarMinhaLocalizacao() {
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const ponto = { lat: posicao.coords.latitude, lng: posicao.coords.longitude };
        setPartida(ponto);
        setOrdem(
          ordenarPorProximidade(
            ponto,
            itens.map((item) => ({ id: item.compromisso.id, coordenadas: item.compromisso.coordenadas })),
          ).map((item) => item.id),
        );
        setLocalizando(false);
      },
      () => {
        toast.error(t('location_unavailable'));
        setLocalizando(false);
      },
    );
  }

  function mover(indice: number, passo: -1 | 1) {
    const ids = ordenados.map((item) => item.compromisso.id);
    const destino = indice + passo;
    if (destino < 0 || destino >= ids.length) return;
    [ids[indice], ids[destino]] = [ids[destino] as string, ids[indice] as string];
    setOrdem(ids);
  }

  const paradas = ordenados.flatMap((item, indice) =>
    item.compromisso.coordenadas
      ? [
          {
            id: item.compromisso.id,
            numero: indice + 1,
            ponto: item.compromisso.coordenadas,
            titulo: item.compromisso.titulo,
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
              <Button variant="outline" disabled={localizando} onClick={usarMinhaLocalizacao}>
                <LocateFixed />
                {t('start_from_my_location')}
              </Button>
              {semPonto.length > 0 && (
                <Button variant="outline" disabled={geocode.isPending} onClick={() => void localizarEnderecos()}>
                  <MapPinned />
                  {t('locate_addresses')} ({semPonto.length})
                </Button>
              )}
            </div>
            <MapaLeaflet paradas={paradas} partida={partida} linha={rota.data ?? pontos} />
            {rota.isError && <ItemDescription>{t('route_unavailable_straight_lines')}</ItemDescription>}
            <ItemGroup variant="list">
              {ordenados.map((item, indice) => {
                const { compromisso } = item;
                return (
                  <Item key={compromisso.id} render={<li />} className="flex-wrap">
                    <ItemContent>
                      <div className="flex flex-wrap items-center gap-2">
                        <ItemTitle className="tabular-nums">
                          {indice + 1}. {formatDisplayTime(compromisso.inicio)}
                        </ItemTitle>
                        {conflitos.has(indice) && <Badge variant="error">{t('time_conflict')}</Badge>}
                        {!compromisso.coordenadas && <Badge variant="warning">{t('address_not_located')}</Badge>}
                        {(compromisso.avisos?.length ?? 0) > 0 && (
                          <Badge variant="success">{t('parties_notified')}</Badge>
                        )}
                      </div>
                      <ItemTitle>{compromisso.titulo}</ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        {[item.pericia?.numeroProcesso, compromisso.local].filter(Boolean).join(' · ')}
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
                      {compromisso.periciaId && (
                        <Button
                          variant="outline"
                          disabled={aviso.isPending}
                          onClick={() =>
                            aviso.mutate(
                              { id: compromisso.id },
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

export const Route = createFileRoute('/_private/campo/mapa/')({
  component: MapaPage,
  staticData: { title: t('day_map') },
  validateSearch: (search: Record<string, unknown>): CampoSearch => campoSearchSchema.parse(search),
});
