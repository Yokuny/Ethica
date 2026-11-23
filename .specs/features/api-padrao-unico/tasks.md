# Tasks — API num padrão único

Um commit por task na `main`; gate de cada uma: `pnpm run check`.

| # | Task | Requisitos |
| --- | --- | --- |
| T1 | AD-284, spec/design/tasks, `apps/api/CLAUDE.md` com o padrão e o grafo real, `AGENTS.md` com `packages/mail`, comentários do WebSocket que não existe | APU-10 |
| T2 | Quebras de regra: `push.service.ts`, `CsvCell` no schema, corte do "parado no início" no service | APU-01, APU-05 |
| T3 | Erro e controller por módulo: `CustomError(…, 404)` no service, controllers sem `try/catch`, sem `notFoundAs404`, sem fábrica nem wrapper | APU-01, APU-02 |
| T4 | Camadas: `auth.deps` pelo repository, `user.avatar.ts`, `providers/pdf-text.ts` | APU-05, APU-06, APU-07 |
| T5 | Router e convite: `createInviteRouter`, `tenantInvite` dentro de `invite` | APU-03, APU-04 |
| T6 | Nomes em kebab-case com `git mv` e `vi.mock` recalculados | APU-08 |
| T7 | Regras (f)–(j) no teste estrutural com self-check | APU-09 |
| T8 | `feature.md`, plano arquivado, roadmap, `pnpm docs:sync` | — |
