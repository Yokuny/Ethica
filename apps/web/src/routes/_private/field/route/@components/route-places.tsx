import { Button } from '@ethica/ui/components/button';
import { Card, CardContent } from '@ethica/ui/components/card';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { BedDouble, Fuel, Hotel, LifeBuoy, type LucideIcon, Search, Signpost, Utensils, Wrench } from 'lucide-react';
import { useState } from 'react';
import { DefaultLoading } from '@/components/default-loading.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { cn } from '@/lib/utils.js';
import type { Point } from '../@utils/itinerary.js';
import {
  googleMapsSearch,
  PLACE_KIND_LIST,
  PLACE_RADII,
  type Place,
  type PlaceKind,
  routeMarks,
} from '../@utils/route-places.js';
import { GoogleMapsIcon, WazeIcon } from './navigation-icons.js';

const KIND_ICON: Record<PlaceKind, LucideIcon> = {
  restaurant: Utensils,
  hotel: Hotel,
  guest_house: BedDouble,
  tire_shop: LifeBuoy,
  car_repair: Wrench,
  fuel_station: Fuel,
};
const RADIUS_ITEMS = PLACE_RADII.map((value) => ({ value: String(value), label: `${value} km` }));

export type PlaceSearch = { kinds: PlaceKind[]; radiusKm: number };

type RoutePlacesProps = {
  path: Point[];
  onSearch: (search: PlaceSearch) => void;
  places?: Place[];
  searched: boolean;
  isLoading: boolean;
  isError: boolean;
};

// "Apoio no trajeto" (CDE-04, AD-214): the kinds of support, the distance from the route and the search; the places
// found (also marked on the map) and, for each kind, the Google Maps search halfway and near the destination.
export function RoutePlaces({ path, onSearch, places, searched, isLoading, isError }: RoutePlacesProps) {
  const [kinds, setKinds] = useState<PlaceKind[]>(['restaurant', 'hotel', 'guest_house', 'tire_shop', 'car_repair']);
  const [radiusKm, setRadiusKm] = useState<number>(2);
  const { halfway, destination } = routeMarks(path);
  const toggle = (kind: PlaceKind) =>
    setKinds((now) => (now.includes(kind) ? now.filter((item) => item !== kind) : [...now, kind]));

  return (
    <Card className="gap-0 p-0">
      <CardContent className="grid gap-5 p-6">
        <ItemTitle
          // biome-ignore lint/a11y/useHeadingContent: the title arrives as the ItemTitle children
          render={<h2 />}
          className="gap-2 font-semibold text-base"
        >
          <Signpost className="size-4" aria-hidden />
          {t('support_on_route')}
        </ItemTitle>
        <div className="flex flex-wrap gap-2">
          {PLACE_KIND_LIST.map((kind) => {
            const Icon = KIND_ICON[kind];
            const on = kinds.includes(kind);
            return (
              <Button
                key={kind}
                variant="outline"
                size="sm"
                aria-pressed={on}
                className={cn('rounded-full', on ? 'border-primary text-foreground' : 'text-muted-foreground')}
                onClick={() => toggle(kind)}
              >
                <Icon />
                {t(kind)}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ItemDescription>{t('up_to')}</ItemDescription>
            <Select
              items={RADIUS_ITEMS}
              value={String(radiusKm)}
              onValueChange={(value) => value && setRadiusKm(Number(value))}
            >
              <SelectTrigger size="compact" className="w-24" aria-label={t('distance_from_route')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ItemDescription>{t('from_the_route')}</ItemDescription>
          </div>
          <Button disabled={!kinds.length || !path.length || isLoading} onClick={() => onSearch({ kinds, radiusKm })}>
            <Search />
            {t('search_on_route')}
          </Button>
        </div>
        {searched &&
          (isLoading ? (
            <DefaultLoading />
          ) : isError ? (
            <ItemDescription role="alert" className="text-destructive">
              {t('places_unavailable')}
            </ItemDescription>
          ) : !places?.length ? (
            <ItemDescription>{t('no_places_found')}</ItemDescription>
          ) : (
            <ItemGroup variant="list" className="max-h-96 overflow-y-auto">
              {places.map((place) => {
                const Icon = KIND_ICON[place.kind];
                const point = `${place.point.lat},${place.point.lng}`;
                return (
                  <Item key={place.id} render={<li />} className="flex-wrap">
                    <ItemContent>
                      <ItemTitle className="gap-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        {place.name}
                      </ItemTitle>
                      <ItemDescription className="line-clamp-none">
                        {[t(place.kind), place.address].filter(Boolean).join(' · ')}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${point}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Google Maps — ${place.name}`}
                          >
                            <GoogleMapsIcon />
                          </a>
                        }
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                          <a
                            href={`https://waze.com/ul?ll=${point}&navigate=yes`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Waze — ${place.name}`}
                          >
                            <WazeIcon />
                          </a>
                        }
                      />
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
          ))}
        {halfway && destination && (
          <div className="grid gap-2 border-t pt-5">
            <ItemTitle>{t('also_search_google_maps')}</ItemTitle>
            {PLACE_KIND_LIST.map((kind) => {
              const Icon = KIND_ICON[kind];
              return (
                <div key={kind} className="flex items-center justify-between gap-3">
                  <ItemDescription className="flex items-center gap-2 text-foreground">
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {t(kind)}
                  </ItemDescription>
                  <div className="flex gap-3">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      nativeButton={false}
                      render={
                        <a href={googleMapsSearch(t(kind), halfway)} target="_blank" rel="noreferrer">
                          {t('halfway')}
                        </a>
                      }
                    />
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      nativeButton={false}
                      render={
                        <a href={googleMapsSearch(t(kind), destination)} target="_blank" rel="noreferrer">
                          {t('near_destination')}
                        </a>
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
