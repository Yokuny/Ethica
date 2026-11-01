// Rota do dia (AD-131): funções puras, sem mapa nem rede.
export type Ponto = { lat: number; lng: number };

const RAIO_TERRA_KM = 6371;
const rad = (graus: number) => (graus * Math.PI) / 180;

// Distância em linha reta (Haversine), em km.
export const distanciaKm = (a: Ponto, b: Ponto): number => {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
};

// Vizinho mais próximo a partir da partida; quem não tem coordenada vai para o fim, na ordem dada.
export const ordenarPorProximidade = <T extends { coordenadas?: Ponto }>(partida: Ponto, itens: T[]): T[] => {
  const restantes = itens.filter((item) => item.coordenadas);
  const ordem: T[] = [];
  let atual = partida;
  while (restantes.length) {
    let melhor = 0;
    restantes.forEach((item, indice) => {
      if (distanciaKm(atual, item.coordenadas as Ponto) < distanciaKm(atual, restantes[melhor]?.coordenadas as Ponto)) {
        melhor = indice;
      }
    });
    const [proximo] = restantes.splice(melhor, 1);
    if (!proximo) break;
    ordem.push(proximo);
    atual = proximo.coordenadas as Ponto;
  }
  return [...ordem, ...itens.filter((item) => !item.coordenadas)];
};

// Parada marcada para antes da anterior na ordem da rota: conflito de horário.
export const paradasEmConflito = (inicios: string[]): Set<number> =>
  new Set(
    inicios.flatMap((inicio, indice) => (indice > 0 && inicio < (inicios[indice - 1] as string) ? [indice] : [])),
  );
