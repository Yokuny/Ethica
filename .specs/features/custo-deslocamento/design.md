# Custo de deslocamento — Design

Decisões: AD-212 (cálculo e lançamento), AD-213 (lugares no trajeto).

- Tudo no web, sem rota nova na API: a despesa usa `POST /finance/entries` (categoria `travel`), uma por OS; a divisão é feita na tela (`@utils/travel-cost.ts`, com teste).
- `field-map.tsx`: a consulta do OSRM passa a devolver também a distância (`routes[0].distance`); com "Incluir a volta" e ponto de partida, a rota termina no ponto de partida. A distância vai para `TravelCost` como valor inicial dos km.
- `@components/travel-cost.tsx` + `@hooks/use-travel-cost.ts`: formulário (react-hook-form + Zod em `@interface/travel-cost.interface.ts`), resultado em linhas e o lançamento com `RadioGroup` (primitivo novo do shadcn em `packages/ui`) para "Uma OS" / "Dividir entre OS".
- `@components/route-places.tsx`: tipo do lugar, consulta à Overpass API pública (`around` de 2 km em pontos amostrados da rota) e lista; `MapLeaflet` ganha `places` (marcadores menores com o nome).
