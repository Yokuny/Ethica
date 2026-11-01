// Endereço → coordenadas pelo Nominatim do OpenStreetMap (AD-131). A política de uso pede no
// máximo uma requisição por segundo e um User-Agent que identifique a aplicação; as
// coordenadas ficam gravadas no compromisso, então cada endereço é consultado uma vez.
export type Coordenadas = { lat: number; lng: number };

export type Geocoder = { geocode: (endereco: string) => Promise<Coordenadas | null> };

const INTERVALO_MS = 1100;

export const createNominatimGeocoder = (config: { baseUrl: string; userAgent: string }): Geocoder => {
  let fila: Promise<unknown> = Promise.resolve();

  const consultar = async (endereco: string): Promise<Coordenadas | null> => {
    const url = new URL('/search', config.baseUrl);
    url.search = new URLSearchParams({ q: endereco, format: 'jsonv2', limit: '1', countrycodes: 'br' }).toString();
    const res = await fetch(url, {
      headers: { 'User-Agent': config.userAgent, 'Accept-Language': 'pt-BR' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    const [primeiro] = (await res.json()) as Array<{ lat: string; lon: string }>;
    return primeiro ? { lat: Number(primeiro.lat), lng: Number(primeiro.lon) } : null;
  };

  return {
    // Uma consulta por vez, com intervalo, mesmo com vários pedidos simultâneos.
    geocode: (endereco) => {
      const resultado = fila.then(() => consultar(endereco));
      fila = resultado.catch(() => undefined).then(() => new Promise((ok) => setTimeout(ok, INTERVALO_MS)));
      return resultado;
    },
  };
};
