---
feature: Logística em páginas por intenção e termo de vistoria assinado
slug: logistica-paginas
descricao: Logística em hub com Mapa, Planejamento de rota e Serviços agendados, intervalo de datas, e termo da vistoria em PDF com as assinaturas
data: 2026-11-20
status: parcial
areas: [apps/api, apps/web]
decisoes: [AD-239, AD-242, AD-243]
spec: [.specs/features/logistica-paginas]
branches: [main]
---

# Logística em páginas por intenção e termo de vistoria assinado

**Status**: parcial · **Atualizado**: 2026-11-20 · **Áreas**: `apps/api`, `apps/web`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da verdade.
> Correlação com o git: `git log --oneline -i --grep='logistica-paginas'`.

## O que foi feito

- **Hub** `/field` (Logística) com três destinos.
- **Mapa** (`/field/map`): faixa de dias na horizontal sobre o mapa (um clique escolhe o dia, o seguinte fecha o intervalo); paradas do intervalo numeradas e, abaixo, a lista do que está no mapa; "Ver no mapa" centra numa parada (`focus` na URL); "Localizar endereços" flutua sobre o mapa.
- **Planejamento de rota** (`/field/route`): a mesma faixa de dias e o mesmo "Localizar endereços" flutuando sobre o mapa do Mapa; partir da localização, ordem, conflito, rota pelas ruas, volta, aviso às partes, custo de deslocamento e apoio no trajeto.
- **Serviços agendados** (`/field/inspections`): cartões com Google Maps/Waze e "Ver no mapa" agrupados (abre o mapa no dia com a parada em foco), link para o serviço, resultado com um toque e "Realizar vistoria".
- **Registro da vistoria** em `/field/inspections/details?id=` (antes `/field/inspection`).
- **Intervalo de datas** nas três páginas: faixa de 21 dias (mês, dia e dia da semana, fim de semana sombreado); um clique escolhe o dia, o seguinte fecha o intervalo (até 366 dias); as setas andam os dias visíveis; no cabeçalho, calendário com mês e ano em listas e os atalhos Semana e Mês (AD-243); mostra todos os compromissos.
- **Aba Observações**: assinatura de cada presente (sai da aba Presentes) e **termo da vistoria em PDF** com pré-visualização e download; o botão espera a conexão e o envio do que está no aparelho.

## Por que

Pedido do usuário (2026-11-20): cada parte da Logística com sua intenção, intervalo de datas e assinatura de todos com PDF. O PDF não leva as observações internas, que o registro promete nunca sair do escritório (AD-239).

## Como

### `apps/web`

- `apps/web/src/routes/_private/field/index.tsx` (hub), `map/`, `route/` (`@components/field-route.tsx`, `travel-cost`, `route-places`), `inspections/` (`@components/field-card.tsx`, `@hooks/use-quick-status.ts`, `details/`).
- `formatShortMonth` e `formatShortWeekday` em `apps/web/src/lib/helpers/formatDate.helper.ts`.
- Compartilhado em `field/`: `@components/{day-strip,range-picker,field-state,locate-addresses,map-leaflet,field-connection,navigation-icons}.tsx`, `@hooks/use-field-range.ts`, `@utils/range.ts`, `@interface/field.interface.ts`.
- `inspections/details/@components/signatures-panel.tsx` (assinaturas e termo); `attendees-fields.tsx` sem a coleta.
- Saíram `@utils/period.ts`, a visualização Mapa/Lista e o período Dia/Semana/Mês/Ano.

### `apps/api`

- `GET /documents/inspections/:appointmentId` (`agenda:view`): `apps/api/src/modules/documents/{documents.router,documents.controller,documents.service}.ts`, `inspectionHtml` em `documents.templates.ts`, estilos de fotos e assinaturas em `document.layout.ts`.

## Como testar

```
pnpm vitest run --project unit apps/web/src/routes/_private/field
pnpm vitest run --project e2e apps/api/src/modules/agenda/inspection.router.e2e.test.ts
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: Logística → Serviços agendados → escolher um intervalo → "Ver no mapa" → voltar → "Realizar vistoria" → Presentes (adicionar) → Observações → Colher assinatura → Visualizar PDF.

## Pendências

- [ ] Conferência visual no navegador (não feita nesta entrega).
- [ ] Confirmar com a perita as escolhas da spec: intervalo com todos os compromissos (na AD-208 ela escolheu só vistorias fora do dia; voltar é o filtro `type` em `field/@hooks/use-field-range.ts`) e observações internas fora do PDF.

## Histórico

- 2026-11-20 — Seletor de intervalo no cabeçalho das três páginas, com mês e ano em listas e atalhos Semana e Mês; a faixa de dias pula para o intervalo escolhido; `rangeOf` reúne o corte em 366 dias (AD-243).
- 2026-11-20 — Serviços agendados também com a faixa de dias, no topo; o `RangeNav` e o `shiftRange` saem. A faixa mostra o dia da semana e sombreia sábado e domingo (AD-242).
- 2026-11-20 — Planejamento de rota: "Partir da minha localização" e "Incluir volta" também flutuam sobre o mapa (AD-242). Serviços agendados: cartão com dois `ButtonGroup` (Google Maps, Waze e Ver no mapa; Realizado, Adiado e Ausente) e "Realizar vistoria" sozinho.
- 2026-11-20 — Planejamento de rota igual ao Mapa: faixa de dias no lugar do `RangeNav` e "Localizar endereços" flutuando sobre o mapa; `day-strip` sobe para `field/@components/` e o `MapLeaflet` recebe o que flutua como `children` (AD-242).
- 2026-11-20 — Mapa troca o `RangeNav` pela faixa de dias na horizontal ocupando toda a largura, 21 dias, intervalo como faixa contínua colorida e mapa com canto arredondado e borda, "Localizar endereços" flutuando sobre o mapa, sem contagem, com spinner e dica (AD-242); o bloco `mini-calendar` do shadcnblocks não está no registry, a faixa usa o `Button` do projeto.
- 2026-11-20 — Primeiro passo do breadcrumb usa o nome do módulo da Home ("Logística", não "Campo") em `apps/web/src/components/page-card.tsx`; testes de `RangeNav` e `SignaturesPanel`.
- 2026-11-20 — Implementado LOG-01 a LOG-07 (AD-239). Divergência do design: o parâmetro da rota do PDF reaproveita o `inspectionParamSchema` da agenda em vez de um schema novo; `navigation-icons`, `itinerary` e `route-places` ficam no nível de `field/` porque o mapa compartilhado e duas páginas os usam.
