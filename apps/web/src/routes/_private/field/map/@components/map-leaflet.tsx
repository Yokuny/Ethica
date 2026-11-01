import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { Point } from '../@utils/itinerary.js';

// Atribuição exigida pelo OpenStreetMap, com o link para os direitos.
const assignment = (): string => {
  const link = document.createElement('a');
  link.href = 'https://www.openstreetmap.org/copyright';
  link.textContent = 'OpenStreetMap';
  return `© ${link.outerHTML}`;
};

// Marcador numerado sem imagem (o ícone padrão do Leaflet quebra com o bundler).
const stopNumber = (number: number): HTMLElement => {
  const marker = document.createElement('span');
  marker.textContent = String(number);
  Object.assign(marker.style, {
    display: 'grid',
    placeItems: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '999px',
    background: '#1d1c20',
    color: '#ffffff',
    font: '600 13px system-ui',
  });
  return marker;
};

type MapLeafletProps = {
  stops: Array<{ id: string; number: number; point: Point; title: string }>;
  origin?: Point;
  row: Point[];
};

// Mapa do dia (AD-131): tiles do OpenStreetMap, paradas numeradas e a rota. Leaflet é imperativo,
// então o mapa vive num efeito ligado ao elemento; marcadores sem imagem (divIcon).
export function MapLeaflet({ stops, origin, row }: MapLeafletProps) {
  const element = useRef<HTMLElement>(null);
  const map = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!element.current || map.current) return;
    map.current = L.map(element.current, { zoomControl: true }).setView([-23.55, -46.63], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: assignment() }).addTo(
      map.current,
    );
    camada.current = L.layerGroup().addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    const group = camada.current;
    if (!group || !map.current) return;
    group.clearLayers();
    const points: L.LatLngExpression[] = [];
    if (origin) {
      L.circleMarker([origin.lat, origin.lng], { radius: 7, color: '#1d1c20', fillOpacity: 1 })
        .bindTooltip(t('starting_point'))
        .addTo(group);
      points.push([origin.lat, origin.lng]);
    }
    for (const stop of stops) {
      L.marker([stop.point.lat, stop.point.lng], {
        icon: L.divIcon({
          className: '',
          html: stopNumber(stop.number),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
        title: stop.title,
      }).addTo(group);
      points.push([stop.point.lat, stop.point.lng]);
    }
    if (row.length > 1)
      L.polyline(
        row.map((p) => [p.lat, p.lng]),
        { color: '#2563eb', weight: 4 },
      ).addTo(group);
    if (points.length) map.current.fitBounds(L.latLngBounds(points), { padding: [32, 32], maxZoom: 15 });
  }, [stops, origin, row]);

  return <section ref={element} className="h-[60dvh] min-h-80 w-full overflow-hidden" aria-label={t('day_map')} />;
}
