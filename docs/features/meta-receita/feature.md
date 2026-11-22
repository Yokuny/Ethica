---
feature: Meta de receita do ano
slug: meta-receita
descricao: Meta de receita do ano cadastrada em Escritório e acompanhada no Dashboard e, por escolha de cada pessoa, em Serviços
data: 2026-11-22
status: parcial
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-258]
spec: [.specs/features/meta-receita]
branches: [main]
---

# Meta de receita do ano

**Status**: parcial · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='meta-receita'`.

## O que foi feito

- **Escritório** (`/office`, só admin): etapa "Meta do ano" com o valor de "Meta de <ano>". Zero deixa sem meta; na virada do ano a meta antiga deixa de valer.
- **Realizado**: tudo que entrou no ano pela data efetiva de cada recebimento (parcelas), em toda receita não anulada; despesas, vencimento e data de contratação não entram. É o mesmo número de "Recebido" do fluxo de caixa.
- **Dashboard**: painel "Meta de <ano>" no topo para quem vê o Financeiro: recebido com % atingido e régua, quanto falta, esperado até hoje (no ritmo / abaixo do ritmo) e quanto falta por mês até dezembro. Sem meta, só o admin vê o convite para cadastrar em Escritório.
- **Serviços**: no menu "…", "Acompanhar a meta aqui" / "Ocultar a meta daqui" (cada pessoa, salvo na conta); ligado, a linha da OS ganha "Meta de <ano>: recebido de meta · % atingido" com o link "Ver a meta" para o Dashboard.

## Por que

Pedido da perita (2026-11-22); escolhas dela na tabela de `.specs/features/meta-receita/spec.md` e na AD-258.

## Como

- `packages/db/src/models/tenant.model.ts` (`revenueGoal`) e `user.model.ts` (`preferences.revenueGoalOnCases`); `packages/contracts/src/schemas/document.schema.ts` (`updateRevenueGoalSchema`).
- `apps/api/src/modules/identity/office.*` — `PUT /tenant/office/revenue-goal` (admin), `revenueGoal` no `GET /tenant/office`, `getRevenueGoal` para o financeiro; `preferences.*` com `revenueGoalOnCases`.
- `apps/api/src/modules/finance/transaction.*` — `GET /finance/revenue-goal` (`finance.view`), `receivedBetween` e o ritmo em `revenueGoal`.
- `apps/web/src/routes/_private/_admin/office/@components/office-revenue-goal.tsx` (+ `@hooks/use-revenue-goal-form.ts`, mutation em `@query/office.ts`, que invalida as chaves de lançamento).
- `apps/web/src/routes/_private/dashboard/@components/revenue-goal-panel.tsx`; `apps/web/src/routes/_private/expert-cases/@components/cases-revenue-goal.tsx` e o menu em `expert-cases/index.tsx`; `revenueGoalQuery` em `apps/web/src/query/transaction.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/finance/revenueGoal.router.e2e.test.ts
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: como admin, cadastrar a meta em Escritório; no Dashboard conferir o painel; em Serviços ligar "Acompanhar a meta aqui"; como operador, o painel e a opção não aparecem.

## Pendências

- [ ] Conferência visual no navegador (o login local exige passkey; o agente não conseguiu entrar).

## Histórico

- 2026-11-22 — Entregue (AD-258): cadastro em Escritório, `GET /finance/revenue-goal`, painel no Dashboard e linha opcional em Serviços. Testes e2e cobrem a data efetiva (vencimento em outro ano), 1º de janeiro e 31 de dezembro, anuladas e despesas fora, meta de outro ano, remover com zero e as permissões.

## Referências

- Spec/tasks: `.specs/features/meta-receita/`
