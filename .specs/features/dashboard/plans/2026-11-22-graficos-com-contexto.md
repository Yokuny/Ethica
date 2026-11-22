# Plano — gráficos com contexto no Dashboard e no Início (2026-11-22)

Arquivado ao concluir. Decisão: AD-253.

## Contexto

Pedido do usuário (2026-11-22), com três capturas de tela e o guia de dashboards dele: os rankings
`ShareList` de **Serviços por tipo**, **Receitas/Despesas por categoria** (Dashboard) e **Serviços por justiça**
(Início) "não dizem nada".

O diagnóstico é que o formato não é o problema principal. Ranking em barras horizontais é o que o guia recomenda,
e a AD-235/236 trocou os gráficos recharts por isso há 3 dias. O que falha é o contexto:

- **Barra com trilho cinza até 100%** lê como barra de progresso, como se houvesse uma meta ou capacidade. Como
  a barra mede a parcela do total, o maior item ocupa metade da largura e os outros ficam pequenos demais para
  comparar. O rótulo fica de um lado e o número do outro, a ~2000px de distância.
- **Escala desonesta entre painéis**: Receitas (R$ 178 mil) e Despesas (R$ 19,5 mil) ficam lado a lado, cada uma
  na própria escala, e parecem do mesmo tamanho.
- **Sem período nem comparação**: as categorias somam "desde o início", ao lado de um fluxo de caixa de 6/12
  meses, e não batem com ele.
- **Denominador escondido**: Serviços por justiça soma 54 dos 80 serviços. Os 26 sem justiça somem e as
  porcentagens ficam sem referência.
- **Sem drill-down**: nada leva à lista dos serviços daquele grupo.

Escopo escolhido pelo usuário: **web + API**.

## Abordagem

### 1. API: categorias no período, com o período anterior

- `apps/api/src/modules/finance/transaction.schema.ts`: o `categoriesQuerySchema` ganha
  `months: z.coerce.number().int().min(1).max(12).default(6)`, igual ao `flowQuerySchema`.
- `transaction.repository.ts` `totalsByCategory(tenantId, kind, months)` usa **as mesmas datas do `monthlyFlow`**:
  - receita pela data de cada parcela recebida (`installments.date`, `installments.amountCents`);
  - despesa por `settledDate` quando quitada e `dueDate` quando não.

  Assim a soma das categorias é igual a "Recebido" e "Despesas" do fluxo de caixa no mesmo período. Um `$facet`
  separa o período atual (últimos `months` meses, incluindo o mês corrente) do anterior (os `months` meses antes
  dele). A resposta passa a ser `{ category, totalCents, previousCents }[]`, ordenada por `totalCents`, e uma
  categoria só com valor no período anterior também aparece. Os limites dos meses vêm do mesmo helper que monta
  `months` para o `monthlyFlow`, no service.
- Ajustar `transaction.service.ts` / `transaction.controller.ts` para repassar `months`, o tipo `CategoryTotal` (a
  web espelha em `apps/web/src/query/transaction.ts`) e o `transaction.router.e2e.test.ts`: o período corta pela
  data certa, e `previousCents` e o cancelado ficam fora.

### 2. Web: um componente de barras no lugar do `ShareList`

Criar `apps/web/src/components/bar-list.tsx` (`BarList`) e **apagar** `share-list.tsx`.

- Uma linha por item: rótulo à esquerda (coluna fixa; no celular, acima da barra), barra **sem trilho** e
  proporcional ao **maior valor** (`max`, que pode ser passado para dividir a escala entre listas), valor
  escrito na ponta, e a coluna `detail` à direita (parcela ou variação, em texto).
- `href`/`search` opcionais: a linha vira `Link` (drill-down) com o `›` dos `LinkCard`. Nada depende de passar o
  mouse.
- Cores só por token: `tone` `info` (`bg-chart-1`) ou `error` (`bg-status-error-indicator`), as mesmas
  identidades de hoje, válidas nos três temas (AD-237).
- Texto por `ItemTitle`/`ItemDescription` (AD-087).

### 3. Dashboard: Serviços por tipo (`apps/web/src/routes/_private/dashboard/index.tsx`)

- `BarList` ordenado, com a quantidade e a parcela de cada tipo e o total no cabeçalho, como hoje.
- Contexto novo sem API: em cada linha, "N nos últimos 12 meses", somado de `byMonth[].byType`.
- Drill-down: Perícia/Assistência levam a `/expert-cases?role=[…]`, tipo próprio a `?serviceType=[nome]`.

### 4. Dashboard: um painel "Receitas e despesas por categoria"

Os dois painéis lado a lado viram **um** painel, ligado ao `ToggleGroup` 6/12 do fluxo de caixa. O toggle sobe
para um seletor de período comum aos dois painéis; a URL continua sendo `?months=`.

- Descrição do alcance: "últimos 6 meses, comparado aos 6 anteriores".
- Dois `BarList` empilhados (Receitas em `info`, Despesas em `error`) com **a mesma escala**
  (`max` = maior valor das duas listas). Assim as despesas aparecem do tamanho real perto das receitas.
- `detail` de cada linha: a variação contra o período anterior (`+R$ 1,2 mil · +12%`, ou "novo" quando o anterior
  é zero), em texto neutro com sinal, no padrão da `MonthHeatTable`. A cor fica para identidade, não para estado.
- O total de cada lista vem no subtítulo dela, com a variação do total.
- Sem drill-down: a lista de lançamentos não tem filtro de categoria, e criar um fica fora deste escopo
  (anotar no roadmap).
- A query `categoriesQuery(kind, months)` ganha `months` na chave (`transactionKeys.categories`).

### 5. Início: Serviços por justiça (`apps/web/src/routes/_private/index.tsx`)

Parte de um todo com poucos grupos vira **barra de composição** única (100% = todos os serviços):

- Um segmento por justiça (`chart-1..3`) e "Sem justiça" em cinza neutro.
- Abaixo, a legenda escrita: cor, nome, quantidade e %. Cada justiça é um `Link` para
  `/expert-cases?courtType=[x]`; "Sem justiça" não tem link, porque o filtro não aceita `none`.
- No cabeçalho, o denominador: "54 de 80 serviços têm justiça".
- O grupo `none` já vem em `distribution.data.courtType` (`packages/db/src/groupStats.ts`). Hoje o filtro
  `COURTTYPES.includes` o descarta.
- Componente local `apps/web/src/routes/_private/@components/court-composition.tsx`, porque só o Início usa.

### 6. Registro

- **AD-253** em `.specs/STATE.md`: rankings com escala pelo maior valor e sem trilho, escala comum entre receita e
  despesa, categorias no período do fluxo de caixa com o anterior, composição com denominador e drill-down.
  Supersede a parte `ShareList` da AD-235 (2) e da AD-236 (1, 2).
- Atualizar `.agents/skills/ethica-web-standards/SKILL.md` (linhas 72 e 136): `share-list` → `bar-list` e a
  regra de escala, período e drill-down.
- `docs/features/dashboard/feature.md`: "O que foi feito", Histórico e Pendências.
- `docs/roadmap.md`: filtro de categoria na lista de lançamentos, para o drill-down das categorias.
- `pnpm docs:sync`.

## Arquivos críticos

- `apps/api/src/modules/finance/transaction.{schema,repository,service,controller}.ts`, `transaction.router.e2e.test.ts`
- `apps/web/src/query/transaction.ts`
- `apps/web/src/components/bar-list.tsx` (novo), `share-list.tsx` (apagar)
- `apps/web/src/routes/_private/dashboard/index.tsx`, `index.unit.test.tsx`
- `apps/web/src/routes/_private/index.tsx`, `@components/court-composition.tsx` (novo)
- `apps/web/src/lib/helpers/translate.helper.ts`: só chaves novas genéricas, depois de buscar as existentes
  (ex.: `vs_previous_period`, `in_last_12_months`, `without_court`, `of_total_services`)

## Reaproveitar

- O helper de meses do `monthlyFlow` (service de finance) e as expressões de data do `monthlyFlow` no repository.
- `formatMoney`, o formato compacto de variação de `apps/web/src/components/cash-flow-table.tsx`,
  `serviceTypeLabel`/`courtTypeLabel` (`@/components/case-labels.js`), `casesSearchSchema`
  (`expert-cases/@interface/cases.interface.ts`) para os parâmetros do drill-down.

## Verificação

1. `pnpm run format`, `pnpm run check` (tsc + Biome + vitest, incluindo o e2e de finance com o banco do
   `RUN_BOOK.md`) e `(cd apps/web && pnpm run build)`.
2. Teste de unidade do Dashboard: as linhas de tipo têm link com o filtro certo; as categorias mostram a variação;
   o operador não vê dinheiro.
3. Tela real (`run` / Playwright), com a API e o web de dev:
   - Dashboard com 6 e 12 meses: as categorias somam o Recebido e as Despesas do fluxo de caixa.
   - A barra de despesa é proporcional à de receita.
   - O clique em um tipo abre a lista filtrada.
   - Início: a composição soma 100% com "Sem justiça" e o clique abre a lista por justiça.
   - Nos temas Claro, Escuro e Azul, e na largura de celular.
4. Registro e envio: commit na `main` (skill `ethica-commit-standards`).
