import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { Ponto } from '../@utils/rota.js';

// Atribuição exigida pelo OpenStreetMap, com o link para os direitos.
const atribuicao = (): string => {
  const link = document.createElement('a');
  link.href = 'https://www.openstreetmap.org/copyright';
  link.textContent = 'OpenStreetMap';
  return `© ${link.outerHTML}`;
};

// Marcador numerado sem imagem (o ícone padrão do Leaflet quebra com o bundler).
const numeroDaParada = (numero: number): HTMLElement => {
  const marcador = document.createElement('span');
  marcador.textContent = String(numero);
  Object.assign(marcador.style, {
    display: 'grid',
    placeItems: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    background: '#1d1c20',
    color: '#ffffff',
    font: '600 13px system-ui',
  });
  return marcador;
};

type MapaLeafletProps = {
  paradas: Array<{ id: string; numero: number; ponto: Ponto; titulo: string }>;
  partida?: Ponto;
  linha: Ponto[];
};

// Mapa do dia (AD-131): tiles do OpenStreetMap, paradas numeradas e a rota. Leaflet é imperativo,
// então o mapa vive num efeito ligado ao elemento; marcadores sem imagem (divIcon).
export function MapaLeaflet({ paradas, partida, linha }: MapaLeafletProps) {
  const elemento = useRef<HTMLElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elemento.current || mapa.current) return;
    mapa.current = L.map(elemento.current, { zoomControl: true }).setView([-23.55, -46.63], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: atribuicao() }).addTo(
      mapa.current,
    );
    camada.current = L.layerGroup().addTo(mapa.current);
    return () => {
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const grupo = camada.current;
    if (!grupo || !mapa.current) return;
    grupo.clearLayers();
    const pontos: L.LatLngExpression[] = [];
    if (partida) {
      L.circleMarker([partida.lat, partida.lng], { radius: 7, color: '#1d1c20', fillOpacity: 1 })
        .bindTooltip(t('starting_point'))
        .addTo(grupo);
      pontos.push([partida.lat, partida.lng]);
    }
    for (const parada of paradas) {
      L.marker([parada.ponto.lat, parada.ponto.lng], {
        icon: L.divIcon({
          className: '',
          html: numeroDaParada(parada.numero),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        title: parada.titulo,
      }).addTo(grupo);
      pontos.push([parada.ponto.lat, parada.ponto.lng]);
    }
    if (linha.length > 1)
      L.polyline(
        linha.map((p) => [p.lat, p.lng]),
        { color: '#2563eb', weight: 4 },
      ).addTo(grupo);
    if (pontos.length) mapa.current.fitBounds(L.latLngBounds(pontos), { padding: [32, 32], maxZoom: 15 });
  }, [paradas, partida, linha]);

  return <section ref={elemento} className="h-[60dvh] min-h-80 w-full overflow-hidden" aria-label={t('day_map')} />;
}
