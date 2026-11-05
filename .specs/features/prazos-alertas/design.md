# Prazos e Alertas — Design

- `packages/contracts/src/schemas/deadline.schema.ts`: `DEADLINE_KINDS = ['deadline','alert']`, `kind` no cadastro (padrão `deadline`); status `done` (só alerta); `filed`/`missed` só prazo — regra `validDeadlineStatus(kind, status)`.
- `packages/db/src/models/deadline.model.ts`: `kind` com padrão `deadline` (os existentes ficam prazo, sem conversão).
- `apps/api` (`case`): `GET /expert-cases/deadlines?status&page&limit` (`listDeadlinesQuerySchema`), pendentes por `dueDate` crescente, os outros decrescente, com `caseNumber` (`withCaseNumber`); `updateDeadline` recusa status que não é do tipo (`invalid_deadline_status`).
- `apps/web`: rota `apps/web/src/routes/_private/deadlines/` (lista + formulário com escolha do serviço), item no menu e em `HOME_SECTIONS`, `moduleFromRoute` → `expert_cases`; `DeadlineDialog` com "Concluir" no alerta; `DeadlineForm` com Prazo/Alerta.
