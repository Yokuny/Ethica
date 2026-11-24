---
feature: Meta de receita do ano
slug: meta-receita
descricao: Meta de receita do ano cadastrada em Escritório e acompanhada no Dashboard e, por escolha de cada pessoa, em Serviços
data: 2026-11-22
status: parcial
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-258, AD-259, AD-260, AD-261]
spec: [.specs/features/meta-receita]
branches: [main]
---

# Meta de receita do ano

**Status**: parcial · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='meta-receita'`.

## O que foi feito

- **Escritório** (`/office`, só admin): etapa "Meta do ano" com a lista de metas por ano (Nova meta, Editar, Remover); o ano vai de cinco anos atrás a cinco à frente.
- **Realizado**: tudo que entrou no ano pela data efetiva de cada recebimento (parcelas), em toda receita não anulada; despesas, vencimento e data de contratação não entram. É o mesmo número de "Recebido" do fluxo de caixa.
- **Ritmo**: média mensal da meta vezes os meses já vividos do ano, contando o atual. No ritmo ou acima é verde, a partir de 75% do esperado amarelo, abaixo vermelho.
- **Barra da meta** (`apps/web/src/components/goal-progress.tsx`): trilho em degradê vermelho → amarelo → verde, preenchimento com o recebido na cor do ritmo, traço no esperado até agora, % atingido e o ritmo em texto.
- **Dashboard**: painel "Meta de <ano>" depois do Fluxo de caixa, só quando há meta, para quem vê o Financeiro: recebido, meta, quanto falta e por mês até dezembro, e o gráfico (área verde do recebido acumulado até o mês atual, linha tracejada da meta distribuída no ano) com a barra da meta na vertical, grossa, à direita. Com mais de um ano, um seletor de ano (`?year=`).
- **Serviços**: no menu "…", "Acompanhar a meta aqui" / "Ocultar a meta daqui" (cada pessoa, salvo na conta); ligado, aparece só "? Dados da meta" sublinhado à esquerda da linha da OS, com o nome do ano, a barra da meta, meta, recebido, quanto falta e o por mês no tooltip.

## Por que

Pedido da perita (2026-11-22); escolhas dela na tabela de `.specs/features/meta-receita/spec.md` e na AD-258.

## Como

- `packages/db/src/models/tenant.model.ts` (`revenueGoal`) e `user.model.ts` (`preferences.revenueGoalOnCases`); `packages/contracts/src/schemas/document.schema.ts` (`updateRevenueGoalSchema`).
- `apps/api/src/modules/identity/office.*` — `PUT /tenant/office/revenue-goal` (admin, `{ year, amountCents }`), `revenueGoals` e `currentYear` no `GET /tenant/office`, `getRevenueGoals` para o financeiro; `preferences.*` com `revenueGoalOnCases`.
- `apps/api/src/modules/finance/transaction.*` — `GET /finance/revenue-goal?year=` (`finance.view`), `receivedByMonth` e o ritmo em `revenueGoal`.
- `apps/web/src/routes/_private/_admin/office/@components/office-revenue-goal.tsx` e `revenue-goal-dialog.tsx` (mutation em `@query/office.ts`, que invalida as chaves de lançamento).
- `apps/web/src/routes/_private/dashboard/@components/revenue-goal-chart.tsx` (painel e seletor de ano em `dashboard/index.tsx`); `apps/web/src/routes/_private/expert-cases/@components/cases-revenue-goal.tsx` e o menu em `expert-cases/index.tsx`; `revenueGoalQuery` em `apps/web/src/query/transaction.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/finance/revenue-goal.router.e2e.test.ts
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: como admin, cadastrar a meta em Escritório; no Dashboard conferir o painel; em Serviços ligar "Acompanhar a meta aqui"; como operador, o painel e a opção não aparecem.

## Pendências

- [ ] Conferência visual no navegador (o login local exige passkey; o agente não conseguiu entrar).

## Histórico

- 2026-11-24 — A meta aparece em Serviços sempre que o ano tem meta (quem vê o Financeiro), sem o item do menu nem sublinhado no "? Dados da meta"; a preferência `revenueGoalOnCases` sai do banco, da API e do web (AD-291).
- 2026-11-22 — Barra da meta na vertical à direita do gráfico no Dashboard (AD-261); teste da página confirma o painel depois do Fluxo de caixa e nenhum painel sem meta.
- 2026-11-22 — Segunda conferência (AD-260): ritmo pela média mensal, barra da meta com degradê no Dashboard e no tooltip de Serviços, painel da meta depois do Fluxo de caixa e só com meta, meta à esquerda em Serviços. De carona, a Entrada de serviços do Dashboard ganha área translúcida como os outros gráficos.
- 2026-11-22 — Ajustes da conferência da perita (AD-259): metas por ano em Escritório; no Dashboard a faixa de números, embolada com os KPIs, vira gráfico de recebido acumulado contra a meta, com seletor de ano; em Serviços sai a linha com valores e fica só "? Dados da meta" com tooltip. Diverge do `spec.md` (meta só do ano corrente, painel em faixa).
- 2026-11-22 — Entregue (AD-258): cadastro em Escritório, `GET /finance/revenue-goal`, painel no Dashboard e linha opcional em Serviços. Testes e2e cobrem a data efetiva (vencimento em outro ano), 1º de janeiro e 31 de dezembro, anuladas e despesas fora, meta de outro ano, remover com zero e as permissões.

## Referências

- Spec/tasks: `.specs/features/meta-receita/`
