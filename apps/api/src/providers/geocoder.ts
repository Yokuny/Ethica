// Endereço → coordenadas pelo Nominatim do OpenStreetMap (AD-131). A política de uso pede no
// máximo uma requisição por segundo e um User-Agent que identifique a aplicação; as
// coordenadas ficam gravadas no compromisso, então cada endereço é consultado uma vez.
export type Coordinates = { lat: number; lng: number };

export type Geocoder = { geocode: (address: string) => Promise<Coordinates | null> };

const INTERVALO_MS = 1100;

export const createNominatimGeocoder = (config: { baseUrl: string; userAgent: string }): Geocoder => {
  let queue: Promise<unknown> = Promise.resolve();

  const lookup = async (address: string): Promise<Coordinates | null> => {
    const url = new URL('/search', config.baseUrl);
    url.search = new URLSearchParams({ q: address, format: 'jsonv2', limit: '1', countrycodes: 'br' }).toString();
    const res = await fetch(url, {
      headers: { 'User-Agent': config.userAgent, 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const [first] = (await res.json()) as Array<{ lat: string; lon: string }>;
    return first ? { lat: Number(first.lat), lng: Number(first.lon) } : null;
  };

  return {
    // Uma consulta por vez, com intervalo, mesmo com vários pedidos simultâneos.
    geocode: (address) => {
      const result = queue.then(() => lookup(address));
      queue = result.catch(() => undefined).then(() => new Promise((ok) => setTimeout(ok, INTERVALO_MS)));
      return result;
    },
  };
};
