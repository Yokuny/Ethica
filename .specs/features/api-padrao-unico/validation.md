# Validation — API num padrão único

Data: 2026-11-23 · Decisão: AD-284

## Evidência

| Requisito | Prova |
| --- | --- |
| APU-01 | Script mínimo com o Express 5.2.1 do `apps/api`: handler `async` que lança erro com `status: 404` responde `404 {"message":"case_not_found"}` sem `try/catch` nem `next(e)`. Regra (f) do teste estrutural: nenhum `try` em controller além de `agenda/inspection.controller.ts` |
| APU-02 | Regra (g): nenhuma classe de erro em módulo além de `InspectionConflictError`. Os e2e que esperam 404 (outro escritório, id inexistente) em agenda, automation, case, court-division, documents, party, finance, account, report, billing e notifications seguem verdes |
| APU-03, APU-04 | `createInviteRouter` e `createTeamInviteRouter` em `apps/api/src/modules/identity/invite.router.ts`; `invite.router.e2e.test.ts` e `invite-team.router.e2e.test.ts` verdes |
| APU-05, APU-06 | Regras (h) e (i): model só em repository, repository sem outra camada, arquivo de apoio sem repository, `providers/`, `express` nem model (exceção `identity/auth.deps.ts`) |
| APU-07 | `apps/api/src/providers/pdf-text.ts`; testes de importação de PDF e de laudo verdes |
| APU-08 | Regra (j): todo arquivo de `apps/api/src` em kebab-case |
| APU-09 | `pnpm vitest run --project structural tests/structural/module-boundary`: 20 testes (10 regras e 10 self-checks por fixture) |
| APU-10 | `apps/api/CLAUDE.md` (tabela do padrão, regras a–j, grafo com `case` → `identity`), `AGENTS.md` com `apps/worker` e `packages/mail` |

Gate final: `pnpm run check` (tsc + Biome + Vitest) com 139 arquivos e 741 testes verdes.

## Mudança visível

Um "não encontrado" de outro módulo que o controller não mapeava (antes 500) passa a 404. Os rótulos de métrica de banco das gravações de convite mudaram de `platform.*` para `invite.*`.
