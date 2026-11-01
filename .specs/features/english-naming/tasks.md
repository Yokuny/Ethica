# Padronização de nomes em inglês — Tasks

**Design**: `.specs/features/english-naming/design.md`. Cada task é um commit (AD-142), com o gate
`pnpm -r exec tsc --noEmit && pnpm biome check . && pnpm vitest run`.

| Task | Fatia | Requisitos | Gate |
| --- | --- | --- | --- |
| T1 | Perícia: `Case`, `Party`, `Deadline`, movimentações, importação; módulo `apps/api/src/modules/case/`; cliente do Datajud traduzindo para o tipo do Ethica | ENG-01..06 | tsc + biome + vitest |
| T2 | Agenda: `Appointment`, `Inspection`, campo, mapa, avisos, IndexedDB | ENG-01..06 | idem |
| T3 | Financeiro: `Transaction`, parcelas, módulo `finance` | ENG-01..05 | idem |
| T4 | Laudos e documentos: `Report`, `Template`, módulo `documents` | ENG-01..05 | idem |
| T5 | Prospecção: `Opportunity`, módulo `prospecting` | ENG-01..05 | idem |
| T6 | Identity: `Activity`, permissões (`hasPermission`), preferências, escritório | ENG-01..05 | idem |
| T7 | Termos comuns (título, nome, tipo, observações…), `data` → `date` e `local` → `location` | ENG-02, ENG-05 | idem + build do web |
| T8 | Comentários do código em inglês | AD-139 | idem + build do web |
| T9 | Seed refeito, índices reprovisionados, UAT com as três contas no desktop e no celular | ENG-08 | UAT |
| T10 | Documentação viva (`feature.md`, `CLAUDE.md`, glossário, skills) e `pnpm docs:sync` | ENG-09 | `pnpm docs:check` |
