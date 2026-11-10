---
feature: Custo de deslocamento
slug: custo-deslocamento
descricao: Custo de deslocamento da rota do Campo lançado como despesa numa OS ou dividido entre OS, e lugares no trajeto
data: 2026-11-09
status: concluido
areas: [apps/web, packages/ui]
decisoes: [AD-212, AD-213, AD-214]
spec: [.specs/features/custo-deslocamento]
branches: [main]
---

# Custo de deslocamento

**Status**: concluido · **Atualizado**: 2026-11-09 · **Áreas**: `apps/web`, `packages/ui`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='custo-deslocamento'`.

## O que foi feito

- **Custo de deslocamento** abaixo do mapa do Campo: quilometragem total (vem da rota do mapa, editável), média km/L, combustível (R$/L) e pedágios; mostra litros, combustível, pedágios, total e custo por km. "Incluir a volta ao ponto de partida" aparece depois de "Partir da minha localização".
- **Lançar como despesa** (quem lança no Financeiro): "Em uma OS" (escolhe o serviço) ou "Dividir entre OS" (partes iguais entre os serviços marcados da rota). Cada OS recebe uma despesa "Deslocamento" a pagar, vencendo hoje.
- **Duas colunas** abaixo do mapa: Custo de deslocamento à esquerda e **Apoio no trajeto** à direita (AD-214).
- **Apoio no trajeto**: etiquetas de restaurante, hotel, pousada, borracharia, oficina mecânica e posto de combustível, distância de 1, 2 ou 5 km da rota e "Buscar no trajeto"; os lugares saem no mapa e na lista com Google Maps e Waze. "Procurar também no Google Maps" abre a busca de cada tipo no meio do caminho ou perto do destino.

## Por que

Pedido da perita (2026-11-09). Ela escolheu os km da rota editáveis, a despesa numa OS ou dividida entre OS da mesma rota e os lugares no próprio mapa. Sem rota nova na API: a despesa usa o lançamento do Financeiro (AD-212); os lugares vêm do OpenStreetMap, sem custo nem chave (AD-213).

## Como

- `apps/web/src/routes/_private/field/@components/field-map.tsx` — distância do OSRM, volta ao ponto de partida, lugares e o bloco de custo.
- `apps/web/src/routes/_private/field/@components/travel-cost.tsx`, `@hooks/use-travel-cost.ts`, `@interface/travel-cost.interface.ts`, `@utils/travel-cost.ts` (cálculo e divisão).
- `apps/web/src/routes/_private/field/@components/route-places.tsx`, `@utils/route-places.ts` (Overpass), `map-leaflet.tsx` (`places`).
- `packages/ui/src/components/radio-group.tsx` — primitivo do shadcn.

## Como testar

```
pnpm vitest run --project unit apps/web/src/routes/_private/field
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: Campo → Mapa com vistorias localizadas → preencher km/L, combustível e pedágio → Lançar dividido entre duas OS → ver as duas despesas no Financeiro; escolher "Borracharia" em Lugares no trajeto.

## Pendências

- [ ] Confirmar a busca ao vivo do formato novo quando o servidor público do OpenStreetMap voltar a aceitar (AD-214).
- [ ] Guardar os dados do veículo no aparelho, se a perita pedir.

## Histórico

- 2026-11-09 — Custo à esquerda e Apoio no trajeto à direita, com tipos em etiquetas, posto de combustível, distância, busca no clique e links do Google Maps; consulta mais leve com espelho (AD-214).
- 2026-11-09 — Implementado CDE-01 a CDE-04 (AD-212, AD-213); conferido na tela local (km da rota, cálculo, lançamento numa OS, restaurantes no trajeto). Achado na conferência: a lista de lugares vazia recriada a cada desenho fazia o mapa recarregar sem parar; corrigido.
