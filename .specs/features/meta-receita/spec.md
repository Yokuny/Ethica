# Meta de receita do ano — Spec

**Slug**: `meta-receita` · **Prefixo**: `MRA` · **Data**: 2026-11-22 · **Decisão**: AD-258

## Problem

A perita quer cadastrar quanto pretende receber no ano e acompanhar o quanto já entrou, sem montar a conta à parte com os lançamentos do Financeiro.

## Requirements

- **MRA-01 — Cadastro**: em Escritório (`/office`, só admin), uma etapa "Meta do ano" com o valor da meta de receita do ano corrente. Valor 0 remove a meta. Na virada do ano a meta antiga deixa de valer e o campo volta vazio.
- **MRA-02 — Realizado**: soma de tudo que entrou no ano pela **data efetiva do recebimento** (data de cada parcela, `installments.date`), em toda receita não anulada. Não usa a data da contratação nem o vencimento. Despesas ficam de fora. É o mesmo número de "Recebido" do fluxo de caixa.
- **MRA-03 — Dashboard**: para quem vê o Financeiro, um painel "Meta do ano" no topo, com meta, realizado, % atingido, quanto falta, o esperado até hoje no ritmo linear do ano (no ritmo / abaixo do ritmo) e quanto falta por mês nos meses que restam, contando o atual. Sem meta: o admin vê o convite para cadastrar em Escritório; os demais não veem o painel. O painel é do ano corrente até hoje, fora do período `?months=` da página.
- **MRA-04 — Serviços**: cada pessoa que vê o Financeiro escolhe, pelo menu "…" de Serviços, acompanhar a meta ali. Ligado, a página mostra uma linha curta (realizado de meta, %, link para o Dashboard) junto da linha da OS. Escolha salva na conta da pessoa (preferência), desligada por padrão.
- **MRA-05 — Permissão**: gravar a meta é do admin (`PUT /tenant/office/revenue-goal`); ler o acompanhamento exige `finance.view` no servidor (`GET /finance/revenue-goal`).

## Assumptions & Open Questions

| # | Pergunta | Resposta (perita, 2026-11-22) |
| --- | --- | --- |
| 1 | O que conta como realizado? | Receita recebida (todas as categorias, bruto, sem despesas). |
| 2 | O que o Dashboard mostra? | Meta, realizado, %, falta, e ritmo (esperado até hoje e quanto precisa por mês). |
| 3 | A escolha em Serviços vale para quem? | Cada pessoa, salva na conta. |

## Design (inline)

- **Dado**: `Tenant.revenueGoal = { year, amountCents }` (um só; só vale quando `year` é o ano corrente no fuso de exibição). Dono: `identity` (`office.service.getRevenueGoal`).
- **Leitura**: `finance` → `identity` (`officeService.getRevenueGoal`), sem ciclo. `transactionRepository.receivedBetween` soma as parcelas entre `YYYY-01-01` e `YYYY+1-01-01`. O service devolve `RevenueGoal = { year, goalCents?, receivedCents, expectedCents?, monthsLeft }`, com o esperado linear pelos dias do ano até hoje.
- **Preferência**: `revenueGoalOnCases` em `preferences` (ausente = desligado).
- **Web**: `revenueGoalQuery` em `apps/web/src/query/transaction.ts` (sob `transactionKeys.all`, recebimento novo atualiza); salvar a meta invalida essa chave. Painel no Dashboard com `Progress` e `RecordStats`; linha em Serviços com `AppLink`.
