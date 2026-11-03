# Novo laudo — Tasks

**Spec**: `.specs/features/novo-laudo/spec.md`

Gate: `pnpm run check` + `(cd apps/web && pnpm run build)`.

- [x] **T1** Contratos e banco: `serviceOrder` (Tenant e Case), `Signatory`, `Report.Signatory`, `unnumbered`/`included`, `reportLayoutSchema`, modelos padrão em lista, `[NUMERO_OS]`.
- [x] **T2** API — OS: sequência no escritório, número no cadastro do serviço, OS editável.
- [x] **T3** API — responsável técnico (CRUD + logo) e uso na exportação.
- [x] **T4** API — modelo trabalhista novo, item novo, "faz parte", layout no PDF e Word. Testes.
- [x] **T5** Web — componente `NumberedList`, editor em rolagem, layout, item novo.
- [x] **T6** Web — Novo laudo (serviço/OS, responsável, modelo), botão no hub e lista; Escritório (OS e responsáveis); OS no serviço.
- [x] **T7** Registro: `feature.md`, glossário, AD, `pnpm docs:sync`, commit e push.
