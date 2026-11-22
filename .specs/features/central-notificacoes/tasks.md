# Central de notificações — Tasks

Gate de cada fase: `pnpm run check` verde, `(cd apps/web && pnpm run build)` sem erro, registro (`STATE.md`, `feature.md`, `roadmap.md`, `pnpm docs:sync`), um commit, push. Progresso também no plano (`2026-11-22-automacao-datajud-notificacoes.md`, seção "Progresso").

## Fase 0 — Documentação

- [x] T0.1 `spec.md`, `design.md`, `tasks.md` desta feature e de `automacao-datajud`.
- [x] T0.2 ADs AD-263 a AD-271 no `STATE.md` e Status das superadas.
- [x] T0.3 Glossário, `docs/architecture.md`, `feature.md` de `prazos-alertas` e `avisos-notificacoes` (histórico), `feature.md` novo das duas features, roadmap.

## Fase 1 — `Notification` no lugar de `Deadline` (um commit, sem shim)

- [x] T1.1 Inventário `rg -il deadline apps packages` (126 arquivos) comparado com a seção 7 do plano. Faltavam na seção 7: diário de bordo (`activityLog.middleware.ts`), registro de schemas (`schema.registry.ts`, `packages/contracts/src/registry.ts`), tour guiado e navegação do web, conversão de oportunidade (`reportDueDate`), PDF da folha do serviço.
- [x] T1.2 `git mv` dos testes para os arquivos novos (`case/deadline.router.e2e.test.ts` → `notifications/notification.router.e2e.test.ts`, `deadline-labels.unit.test.ts`, `deadline-dialog.unit.test.tsx`, `case-deadlines.unit.test.tsx`, `deadlineReminder.service.unit.test.ts` fica no lugar até a Fase 2).
- [x] T1.3 Contrato `notification.schema.ts` (substitui `deadline.schema.ts`), `calendar-entry.schema.ts` (`notification`), `case.schema.ts` e `import.schema.ts` (`reportDueDate`), `invalid_notification_status`.
- [x] T1.4 `packages/db`: `notification.model.ts` (sai `deadline.model.ts`), `notificationReads.ts`, `syncIndexes`, `backfillCalendarEntries`.
- [x] T1.5 Módulo `notifications` no api; `case:created`; `case:deleted`; `case` sem `deadline.*`; `documents`, `agenda` (feed e aviso diário) e `activityLog` religados; `DB_OWNERSHIP`; `apps/api/CLAUDE.md`.
- [x] T1.6 Seeds (`seed-demo`, `seed-volume`) e importação.
- [x] T1.7 Web: `/notifications` (aba Prazos e alertas, com Cancelar), componentes renomeados, menu, início, lista e detalhe do serviço, agenda, relatórios; `/deadlines` sai.
- [x] T1.8 Aceite: `rg -n "Deadline\b|deadlineService" apps packages` vazio; gate; registro; commit `feat(central-notificacoes): …`.

## Fase 2 — Worker e entrega

- [x] T2.1 `packages/mail` (`git mv` de `apps/api/src/providers/mail/`).
- [x] T2.2 `packages/db`: `WorkerJob`, `WorkerHeartbeat`, `NotificationDelivery`, `syncIndexes` por dono, leituras do worker.
- [x] T2.3 `apps/worker`: env, boot, fila, heartbeat, `/health`, `/metrics`, agendador; projetos do vitest; testes estruturais.
- [x] T2.4 Jobs `reminders_sweep` (`finance_due`), `email_digest`, `email_immediate`.
- [x] T2.5 Preferências tipo × canal e migração da preferência atual; tela Conta → Notificações.
- [x] T2.6 Sino, aba Avisos, `unread-count`, `read`, `read-all`, visibilidade por módulo.
- [x] T2.7 Sai do api: `scheduleDeadlineNotices` e `deadlineReminder.service.ts`.
- [x] T2.8 `Dockerfile.worker`, `railway.worker.json`, `docker-compose.yml`, `pnpm dev:worker`, `.env.example`, `RUN_BOOK.md`.
- [x] T2.9 Aceite (restart às 07:10, duas réplicas, operador sem financeiro, mesmo e-mail de prazos); gate; registro; commit.

## Fase 6 (parte base) — Push

- [x] T6.1 Web Push (AVS-03): inscrição por aparelho, envio pelo worker, texto sem dado sensível.
