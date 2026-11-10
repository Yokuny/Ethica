import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { t } from '@/lib/helpers/translate.helper.js';
import type { Point } from '../@utils/itinerary.js';
import type { Place } from '../@utils/route-places.js';

// Attribution required by OpenStreetMap, with the link to the copyright.
const assignment = (): string => {
  const link = document.createElement('a');
  link.href = 'https://www.openstreetmap.org/copyright';
  link.textContent = 'OpenStreetMap';
  return `© ${link.outerHTML}`;
};

// Numbered marker without an image (the default Leaflet icon breaks with the bundler).
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

// Without a stop to center on: the office city (AD-194). The office has no city yet, so São Paulo.
const DEFAULT_CENTER: Point = { lat: -23.55, lng: -46.63 };

type MapLeafletProps = {
  stops: Array<{ id: string; number: number; point: Point; title: string }>;
  origin?: Point;
  row: Point[];
  // The next inspection; missing, the default place.
  center?: Point;
  // Places on the route (CDE-04), as small markers with the name.
  places?: Place[];
};

// Day map (AD-131): OpenStreetMap tiles, numbered stops and the route. Leaflet is imperative,
// so the map lives in an effect bound to the element; markers without an image (divIcon).
export function MapLeaflet({ stops, origin, row, center, places }: MapLeafletProps) {
  const element = useRef<HTMLElement>(null);
  const map = useRef<L.Map | null>(null);
  const camada = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!element.current || map.current) return;
    map.current = L.map(element.current, { zoomControl: true }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11);
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
    if (origin) {
      L.circleMarker([origin.lat, origin.lng], { radius: 7, color: '#1d1c20', fillOpacity: 1 })
        .bindTooltip(t('starting_point'))
        .addTo(group);
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
    }
    for (const place of places ?? []) {
      L.circleMarker([place.point.lat, place.point.lng], { radius: 6, color: '#ea580c', fillOpacity: 0.9 })
        .bindTooltip(place.name)
        .addTo(group);
    }
    if (row.length > 1)
      L.polyline(
        row.map((p) => [p.lat, p.lng]),
        { color: '#2563eb', weight: 4 },
      ).addTo(group);
    // Always open on the next inspection (AD-194); without one, on the default place.
    const focus = center ?? DEFAULT_CENTER;
    map.current.setView([focus.lat, focus.lng], center ? 15 : 11);
  }, [stops, origin, row, center, places]);

  return <section ref={element} className="h-[60dvh] min-h-80 w-full overflow-hidden" aria-label={t('day_map')} />;
}
