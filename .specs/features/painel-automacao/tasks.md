# Painel da Automação Datajud — Tasks

Spec: `.specs/features/painel-automacao/spec.md` · Design: `.specs/features/painel-automacao/design.md`. Um commit por task, direto na `main` (AD-143); cada um deixa `pnpm run check` verde. A troca da resposta de `GET /automation/cases` vai no mesmo commit da tela que a lê (T6).

| # | Task | Gate | Requisitos |
| --- | --- | --- | --- |
| T1 | `ensureAutomation` sobe para `billingService` (`identity`); `notifications` e `automation` passam a chamá-la; `notifications` deixa de importar `automation` | `pnpm vitest run --project structural` + `pnpm vitest run apps/api/src/modules/{notifications,automation}` | design "Checagem do módulo pago" |
| T2 | `packages/db`: model `CourtSyncDay` e campos `lastMovementAt`/`lastMovementName` no `CaseCourtSync`; termo no `docs/glossary.md` | `pnpm run check` | PAT-06 |
| T3 | Worker: linha do dia no enfileiramento (`tracked`), resposta por serviço contada uma vez (`answeredCases`, `found`, `notFound`), `newMovements`, `notices` por módulo e última movimentação no `CaseCourtSync`; testes de integração do lote (nova tentativa não soma) | `pnpm vitest run apps/worker` | PAT-06 |
| T4 | API: `notificationService.suggestionActivity` e `GET /automation/dashboard` (schema em `packages/contracts`), e2e com módulo, sem módulo e permissão do Financeiro | `pnpm vitest run apps/api/src/modules/automation` | PAT-01, PAT-04, PAT-05 |
| T5 | Web: período compartilhado em `apps/web/src/lib/helpers/period.helper.ts` e `MonthDetails` em `apps/web/src/components/`; Dashboard importando de lá, sem mudança de tela | `pnpm run check` + `(cd apps/web && pnpm run build)` | PAT-02 |
| T6 | API `GET /automation/cases` paginada (busca, situação com `stale`, ordem, desempate) + página `/automation` refeita (faixa, atividade com a fileira de consultas, duas roscas, `DataTable`); sai `tracked-cases.tsx` e o `trackedCaseState` do web; chaves `t()` novas; testes da página e e2e da lista | `pnpm run check` + build | PAT-01, PAT-02, PAT-03, PAT-04, PAT-05 |
| T7 | Registro: `docs/features/painel-automacao/feature.md`, Histórico de `automacao-datajud` e `processos-acompanhados`, AD nova, roadmap, `pnpm docs:sync` | `pnpm docs:check` | — |
