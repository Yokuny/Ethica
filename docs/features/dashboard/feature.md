---
feature: Dashboard
slug: dashboard
descricao: Seção com os totais de serviços e honorários e os gráficos de perícias e honorários recebidos por ano
data: 2026-11-06
status: concluido
areas: [apps/api, apps/web]
decisoes: []
spec: [.specs/features/dashboard]
branches: [main]
---

# Dashboard

**Status**: concluido · **Atualizado**: 2026-11-06 · **Áreas**: `apps/api`, `apps/web`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='dashboard'`.

## O que foi feito

- Item **Dashboard** no menu, em Gestão, com o acesso de Serviços.
- Faixa com os totais: serviços, serviços finalizados (todos os encerrados), honorários recebidos e honorários a receber.
- Total de serviços por tipo: Perícia, Assistência técnica e cada tipo do escritório.
- Gráfico de colunas de perícias por ano (só o tipo Perícia, pelo ano da nomeação; sem essa data, o ano do cadastro).
- Gráfico de colunas de honorários recebidos por ano, pela data em que cada parcela entrou.
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

- [ ] Celular com muitos anos: com 4 anos os rótulos em dinheiro cabem; com 8 eles se sobrepõem e o primeiro é cortado. A perita decide como deve ficar.

## Histórico

- 2026-11-06 — Conferido com perícias e honorários de vários anos: colunas e somas batem, o operador não vê valor em dinheiro e ano sem dados não vira coluna (o gráfico pula do ano anterior para o seguinte). O sistema não tem tema escuro (`apps/web/src/main.tsx` fixa o claro), então esse item não se aplica.
- 2026-11-06 — Dashboard entregue.
