---
feature: Dashboard
slug: dashboard
descricao: Seção com os totais de serviços e honorários, serviços por tipo e por mês e o financeiro do escritório
data: 2026-11-06
status: concluido
areas: [apps/api, apps/web]
decisoes: [AD-200, AD-228]
spec: [.specs/features/dashboard]
branches: [main]
---

# Dashboard

**Status**: concluido · **Atualizado**: 2026-11-15 · **Áreas**: `apps/api`, `apps/web`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='dashboard'`.

## O que foi feito

- Item **Dashboard** no menu, em Gestão, com o acesso de Serviços.
- Faixa com os totais: serviços, serviços finalizados (todos os encerrados), honorários recebidos e honorários a receber.
- Total de serviços por tipo: Perícia, Assistência técnica e cada tipo do escritório.
- Gráfico de colunas de serviços por mês: os últimos 12 meses, todos os tipos, sem os cancelados, pelo mês da nomeação; sem essa data, o mês do cadastro.
- Para quem vê o Financeiro: resumo do dinheiro, fluxo de caixa (6 ou 12 meses, onde fica o recebido mês a mês) e totais por categoria.
- Valores em dinheiro só para quem vê o Financeiro.

## Por que

Pedido da perita (2026-11-05); escolhas dela em `.specs/features/dashboard/spec.md`.

## Como

- `apps/api/src/modules/case/case.{router,controller,service,repository,schema}.ts` — `GET /expert-cases/dashboard`.
- `apps/api/src/modules/finance/transaction.{router,controller,service,repository,schema}.ts` — `GET /finance/dashboard`.
- `apps/web/src/routes/_private/dashboard/` — página, gráfico e consultas; menu em `apps/web/src/routes/_private/@consts/home-sections.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/case/dashboard.router.e2e.test.ts
```

- UAT: entrar como administrador e abrir Dashboard; como operador, conferir que os valores em dinheiro somem.

## Pendências

- [ ] Conferir no celular os 12 rótulos de mês do gráfico de serviços.

## Histórico

- 2026-11-15 — A legenda Menos/Mais sai de baixo dos blocos e vai para o cabeçalho de Serviços por tipo, oposta ao título (`HeatTilesLegend` em `apps/web/src/components/heat-tiles.tsx`).
- 2026-11-15 — Sai a visão anual (AD-228): "Perícias por ano" vira **Serviços por mês** (últimos 12 meses, todos os tipos) e sai "Honorários recebidos por ano", que repetia o recebido do Fluxo de caixa; a faixa segue com o total recebido (`receivedCents`). Resolve a pendência dos rótulos em dinheiro com muitos anos.
- 2026-11-14 — Painel minimalista: a faixa padrão de totais fica como está; serviços por tipo viram blocos em tom pastel proporcional à quantidade, com a parcela do total e a legenda Menos/Mais (`apps/web/src/components/heat-tiles.tsx`); seções com título maior em caixa normal (`Panel size="lg"`); paleta dos gráficos em tons pastéis dessaturados (`apps/web/src/theme.css`, `--chart-1..5`) e despesas em `--status-error-indicator`. Uma primeira versão com cartões brancos e bordas foi desfeita no mesmo dia.
- 2026-11-10 — Recebe do Financeiro o resumo do dinheiro, o fluxo de caixa (6 ou 12 meses) e os totais por categoria, só para quem vê o Financeiro; sai "Honorários a receber" da faixa, já coberto pelo resumo (AD-215).
- 2026-11-06 — Perícias canceladas saem do gráfico de perícias por ano; lançamentos anulados não contam nos honorários (AD-200).
- 2026-11-06 — Conferido com perícias e honorários de vários anos: colunas e somas batem, o operador não vê valor em dinheiro e ano sem dados não vira coluna (o gráfico pula do ano anterior para o seguinte). O sistema não tem tema escuro (`apps/web/src/main.tsx` fixa o claro), então esse item não se aplica.
- 2026-11-06 — Dashboard entregue.
