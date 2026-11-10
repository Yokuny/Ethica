import { Button } from '@ethica/ui/components/button';
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from '@ethica/ui/components/item';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ethica/ui/components/select';
import { DefaultLoading } from '@/components/default-loading.js';
import { t } from '@/lib/helpers/translate.helper.js';
import { PLACE_KINDS, type Place, type PlaceKind } from '../@utils/route-places.js';
import { GoogleMapsIcon, WazeIcon } from './navigation-icons.js';

const KIND_ITEMS = (Object.keys(PLACE_KINDS) as PlaceKind[]).map((value) => ({ value, label: t(value) }));

type RoutePlacesProps = {
  kind?: PlaceKind;
  onKind: (kind: PlaceKind) => void;
  places?: Place[];
  isLoading: boolean;
  isError: boolean;
};

// "Lugares no trajeto" (CDE-04): the kind, and the places found near the route with the way to get there.
export function RoutePlaces({ kind, onKind, places, isLoading, isError }: RoutePlacesProps) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Select items={KIND_ITEMS} value={kind ?? null} onValueChange={(value) => value && onKind(value as PlaceKind)}>
          <SelectTrigger className="w-56" aria-label={t('places_on_route')}>
            <SelectValue placeholder={t('places_on_route')} />
          </SelectTrigger>
          <SelectContent>
            {KIND_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ItemDescription>{t('places_on_route_description')}</ItemDescription>
      </div>
      {kind &&
        (isLoading ? (
          <DefaultLoading />
        ) : isError ? (
          <ItemDescription role="alert" className="text-destructive">
            {t('places_unavailable')}
          </ItemDescription>
        ) : !places?.length ? (
          <ItemDescription>{t('no_places_found')}</ItemDescription>
        ) : (
          <ItemGroup variant="list">
            {places.map((place) => {
              const destination = `${place.point.lat},${place.point.lng}`;
              return (
                <Item key={place.id} render={<li />} className="flex-wrap">
                  <ItemContent>
                    <ItemTitle>{place.name}</ItemTitle>
                    {place.address && <ItemDescription className="line-clamp-none">{place.address}</ItemDescription>}
                  </ItemContent>
                  <ItemActions>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <GoogleMapsIcon />
                          Google Maps
                        </a>
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={
                        <a href={`https://waze.com/ul?ll=${destination}&navigate=yes`} target="_blank" rel="noreferrer">
                          <WazeIcon />
                          Waze
                        </a>
                      }
                    />
                  </ItemActions>
                </Item>
              );
            })}
          </ItemGroup>
        ))}
    </div>
  );
}
