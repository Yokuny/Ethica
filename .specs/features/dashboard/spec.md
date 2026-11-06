# Dashboard

**Pedido**: perita, 2026-11-05. **Prefixo**: DSH.

## Requisitos

- **DSH-01** Seção Dashboard no menu, com o acesso de Serviços.
- **DSH-02** Totais: serviços cadastrados, serviços finalizados, honorários recebidos e honorários a receber.
- **DSH-03** Total de serviços por tipo: Perícia, Assistência técnica e cada tipo do escritório.
- **DSH-04** Gráfico de colunas de perícias por ano.
- **DSH-05** Gráfico de colunas de honorários recebidos por ano.
- **DSH-06** Valores em dinheiro só para quem vê o Financeiro (AD-137).

## Decisões de comportamento

| Assunto | Decisão | Quem |
| --- | --- | --- |
| Serviços finalizados | Todos os encerrados: Honorários recebidos, fases de perdas e cancelados (`isCaseClosed`) | Perita |
| Ano da perícia | Ano da nomeação; sem essa data, o ano do cadastro | Perita |
| Gráfico de perícias | Só o tipo Perícia, uma coluna por ano | Perita |
| Ano do honorário | Ano em que cada parcela entrou, como no fluxo de caixa (PRZ-02.5), sem lançamentos cancelados | Agente |
| Honorários a receber | Saldo dos lançamentos em aberto, como no início | Agente |

## Design

- `GET /expert-cases/dashboard` (acesso de Serviços) e `GET /finance/dashboard` (acesso do Financeiro): dois endereços porque cada um segue sua permissão.
- Tela em `apps/web/src/routes/_private/dashboard/`, com a faixa de indicadores e os gráficos no padrão da AD-104.

## Tasks

1. API e testes. Gate: `pnpm vitest run --project e2e dashboard`.
2. Tela, menu e teste. Gate: `pnpm run check` e build do web.
3. Conferência no navegador, `feature.md`, `pnpm docs:sync`, envio.
