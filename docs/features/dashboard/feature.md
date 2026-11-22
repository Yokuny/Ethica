---
feature: Dashboard
slug: dashboard
descricao: Seção com os totais de serviços e honorários, serviços por tipo e por mês e o financeiro do escritório
data: 2026-11-06
status: concluido
areas: [apps/api, apps/web]
decisoes: [AD-200, AD-228, AD-235, AD-236, AD-253, AD-254]
spec: [.specs/features/dashboard]
branches: [main]
---

# Dashboard

**Status**: concluido · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='dashboard'`.

## O que foi feito

- Item **Dashboard** no menu, em Gestão, com o acesso de Serviços.
- Faixa com os totais: serviços, serviços finalizados (todos os encerrados), honorários recebidos e honorários a receber.
- Serviços por tipo em barras (medidas pelo maior tipo) com quantidade, parcela e quantos entraram nos últimos 12 meses: Perícia, Assistência técnica e cada tipo do escritório. Cada tipo abre a lista de Serviços filtrada.
- Tabela de serviços por mês: os últimos 12 meses, total e uma coluna por tipo, cada contagem com a variação contra o mês anterior; sem os cancelados, pelo mês da nomeação; sem essa data, o mês do cadastro.
- Para quem vê o Financeiro: resumo do dinheiro, fluxo de caixa em tabela de calor (6 ou 12 meses: recebido, a receber, despesas e saldo por mês, cada um com a variação contra o mês anterior, e o saldo do período) e Receitas e despesas por categoria no mesmo período do fluxo de caixa (os dois totais na mesma escala, as categorias de cada um medidas entre si), cada categoria com a variação contra o período anterior (somam o Recebido e as Despesas do fluxo).
- Valores em dinheiro só para quem vê o Financeiro.
- No Início, Serviços por justiça em barra de composição sobre todos os serviços (os sem justiça incluídos), com o denominador escrito e cada justiça abrindo a lista filtrada.

## Por que

Pedido da perita (2026-11-05); escolhas dela em `.specs/features/dashboard/spec.md`.

## Como

- `apps/api/src/modules/case/case.{router,controller,service,repository,schema}.ts` — `GET /expert-cases/dashboard`.
- `apps/api/src/modules/finance/transaction.{router,controller,service,repository,schema}.ts` — `GET /finance/dashboard` e `GET /finance/categories?kind=&months=`.
- `apps/web/src/components/bar-list.tsx` (barras com drill-down) e `apps/web/src/routes/_private/@components/court-composition.tsx` (Início).
- `apps/web/src/routes/_private/dashboard/` — página, gráfico e consultas; menu em `apps/web/src/routes/_private/@consts/home-sections.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case/dashboard.router.e2e.test.ts
```

- UAT: entrar como administrador e abrir Dashboard; como operador, conferir que os valores em dinheiro somem.

## Pendências

- [ ] Conferir no celular os 12 rótulos de mês do gráfico de serviços.
- [ ] Conferir no navegador as tabelas por mês (fluxo de caixa 6 e 12 meses, serviços por tipo, celular), as barras e a composição por justiça (AD-253), nos três temas e no celular. A sessão de 2026-11-22 não conseguiu entrar no app de dev.

## Histórico

- 2026-11-22 — Só os totais de Recebido e Despesas dividem a escala; as categorias ficam abaixo, recuadas, medidas entre si. A nota avisa que o mês atual está em andamento, e no celular a variação desce para baixo do valor (AD-254).
- 2026-11-22 — Rankings com contexto (AD-253). `ShareList` vira `BarList`: barra sem trilho, medida pelo maior item, com drill-down. Serviços por tipo mostra os últimos 12 meses e abre a lista filtrada. Receitas e despesas por categoria viram um painel no período do fluxo de caixa (`GET /finance/categories` com `months` e `previousCents`), em escala comum e com variação contra o período anterior. No Início, Serviços por justiça vira barra de composição com os sem justiça e o denominador escrito. Plano: `.specs/features/dashboard/plans/2026-11-22-graficos-com-contexto.md`.
- 2026-11-19 — Serviços por mês vira tabela por mês com total e coluna por tipo (a API manda `byType` em cada mês) e Serviços por tipo vira ranking; o Início usa a mesma tabela no fluxo de caixa e ranking em Serviços por justiça (AD-236; `apps/web/src/components/month-heat-table.tsx`). Saem os gráficos recharts do Dashboard e do Início.
- 2026-11-19 — Fluxo de caixa vira tabela de calor por mês com saldo e variação contra o mês anterior, e as categorias viram ranking com valor e parcela escritos (AD-235; `apps/web/src/routes/_private/dashboard/@components/cash-flow-table.tsx`, `apps/web/src/components/share-list.tsx`). Sai `categories-chart.tsx`. Não conferido no navegador nesta sessão.
- 2026-11-15 — A legenda Menos/Mais sai de baixo dos blocos e vai para o cabeçalho de Serviços por tipo, oposta ao título (`HeatTilesLegend` em `apps/web/src/components/heat-tiles.tsx`).
- 2026-11-15 — Sai a visão anual (AD-228): "Perícias por ano" vira **Serviços por mês** (últimos 12 meses, todos os tipos) e sai "Honorários recebidos por ano", que repetia o recebido do Fluxo de caixa; a faixa segue com o total recebido (`receivedCents`). Resolve a pendência dos rótulos em dinheiro com muitos anos.
- 2026-11-14 — Painel minimalista: a faixa padrão de totais fica como está; serviços por tipo viram blocos em tom pastel proporcional à quantidade, com a parcela do total e a legenda Menos/Mais (`apps/web/src/components/heat-tiles.tsx`); seções com título maior em caixa normal (`Panel size="lg"`); paleta dos gráficos em tons pastéis dessaturados (`apps/web/src/theme.css`, `--chart-1..5`) e despesas em `--status-error-indicator`. Uma primeira versão com cartões brancos e bordas foi desfeita no mesmo dia.
- 2026-11-10 — Recebe do Financeiro o resumo do dinheiro, o fluxo de caixa (6 ou 12 meses) e os totais por categoria, só para quem vê o Financeiro; sai "Honorários a receber" da faixa, já coberto pelo resumo (AD-215).
- 2026-11-06 — Perícias canceladas saem do gráfico de perícias por ano; lançamentos anulados não contam nos honorários (AD-200).
- 2026-11-06 — Conferido com perícias e honorários de vários anos: colunas e somas batem, o operador não vê valor em dinheiro e ano sem dados não vira coluna (o gráfico pula do ano anterior para o seguinte). O sistema não tem tema escuro (`apps/web/src/main.tsx` fixa o claro), então esse item não se aplica.
- 2026-11-06 — Dashboard entregue.
