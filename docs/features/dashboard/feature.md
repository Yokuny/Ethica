---
feature: Dashboard
slug: dashboard
descricao: Seção com os totais de serviços e honorários, serviços por tipo e por mês e o financeiro do escritório
data: 2026-11-06
status: concluido
areas: [apps/api, apps/web]
decisoes: [AD-200, AD-228, AD-235, AD-236, AD-253, AD-254, AD-255, AD-256]
spec: [.specs/features/dashboard]
branches: [main]
---

# Dashboard

**Status**: concluido · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='dashboard'`.

## O que foi feito

- Item **Dashboard** no menu, em Gestão, com o acesso de Serviços.
- Um período (6 ou 12 meses completos; o mês em andamento fica de fora) no cabeçalho vale para a página toda; toda comparação é contra o período anterior de mesmo tamanho.
- **Nível 1**: faixa do dinheiro com Saldo, Recebido (e o recebido desde o início), Despesas e A receber (com o vencido em linha própria); a seção Trabalho abre com a própria faixa, Serviços novos e Serviços em aberto (e os finalizados). Cada número com linha de tendência, variação e estado (despesa subindo é ruim). Alertas por regra: honorários vencidos e saldo negativo no período, com link para os lançamentos.
- **Dinheiro**: fluxo de caixa em linhas (recebido verde, despesas vermelho, a receber previsto roxo, eixo a partir de 0) e roscas de "De onde vem" e "Para onde vai" o dinheiro por categoria, com total, parcela e variação escritos; acima de 4 categorias, o resto em "Demais".
- **Trabalho**: entrada de serviços em área empilhada por tipo e mix de serviços em rosca, com a mesma cor por tipo; cada tipo abre a lista filtrada.
- O mês a mês exato (tabelas de calor de fluxo e de serviços) fica recolhido em "Ver mês a mês".
- Valores em dinheiro e alertas só para quem vê o Financeiro.
- No Início: o mesmo gráfico de fluxo de caixa (6 meses completos), Serviços por justiça em rosca com os sem justiça e o denominador escrito, e ponto vermelho/âmbar nos prazos vencidos/a vencer e no a receber com vencido.

## Por que

Pedido da perita (2026-11-05); escolhas dela em `.specs/features/dashboard/spec.md`.

## Como

- `apps/api/src/modules/case/case.{router,controller,service,repository,schema}.ts` — `GET /expert-cases/dashboard`.
- `apps/api/src/modules/finance/transaction.{router,controller,service,repository,schema}.ts` — `GET /finance/dashboard` e `GET /finance/categories?kind=&months=`.
- `apps/web/src/components/cash-flow-chart.tsx` e `apps/web/src/components/composition-donut.tsx` (Dashboard e Início); KPIs, alertas e área de serviços em `apps/web/src/routes/_private/dashboard/@components/`.
- `apps/web/src/routes/_private/dashboard/` — página, gráfico e consultas; menu em `apps/web/src/routes/_private/@consts/home-sections.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case/dashboard.router.e2e.test.ts
```

- UAT: entrar como administrador e abrir Dashboard; como operador, conferir que os valores em dinheiro somem.

## Pendências

- [ ] Conferir no navegador o tooltip das categorias em "De onde vem o dinheiro" (passar o mouse e focar pelo teclado).
- [ ] Conferir no celular os 12 rótulos de mês do gráfico de serviços.
- [x] Conferido no navegador em 2026-11-22 (Dashboard 6 e 12 meses, Início, temas Claro, Escuro e Azul, 390px).

## Histórico

- 2026-11-22 — Em "De onde vem o dinheiro", cada categoria de receita ganha um ícone de ajuda com tooltip que explica a fatia (honorários fixados, contratados e prévios). O `CompositionDonut` passa a aceitar `hint` na fatia (`apps/web/src/components/composition-donut.tsx`); os textos são as chaves `*_fees_hint`.
- 2026-11-22 — O período vira número na URL (`?months=6`, antes `?months=%226%22`, porque o roteador grava entre aspas a string que parece número). Links antigos e valores estranhos caem em 6 meses (`apps/web/src/routes/_private/dashboard/@interface/dashboard.interface.ts`).
- 2026-11-22 — Conferido no navegador. Ajustes do que apareceu: a nota da faixa dizia que o mês atual entrava; o centro e as linhas das roscas mostram só o percentual (o "vs. período anterior" vai uma vez na descrição do painel); a linha do valor do `RecordStat` quebra em vez de sobrepor (vencido do A receber no Início e percentuais no celular).
- 2026-11-22 — A faixa de seis números vira duas: dinheiro no nível 1 (quatro números) e serviços na abertura de Trabalho; o vencido do A receber sai de ao lado do valor, onde se sobrepunha, para uma linha própria em vermelho.
- 2026-11-22 — Dashboard e Início reformulados com gráficos, do macro ao micro (AD-255, AD-256): KPIs com tendência, variação e estado, alertas, fluxo de caixa em linhas, roscas de composição (categorias, mix de serviços, justiça), área empilhada de entrada de serviços e o mês a mês recolhido. Saem as barras da AD-253/254. Só meses completos (`byMonth` com 25 meses, fluxo com `2 × meses + 1`, categorias sem o mês em andamento). Plano: `.specs/features/dashboard/plans/2026-11-22-dashboard-graficos.md`.
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
