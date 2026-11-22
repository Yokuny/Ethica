# Central de notificações — Design

Base: `.specs/features/central-notificacoes/spec.md` e o plano de 2026-11-22 (seções 1 a 9). Decisões novas: AD-263 a AD-267 (`.specs/STATE.md`).

## 1. Modelo (`packages/db/src/models/notification.model.ts`)

Um schema Mongoose só, campos opcionais por tipo. A forma por tipo é garantida pela união discriminada em Zod (`packages/contracts/src/schemas/notification.schema.ts`), usada no BFF e no worker. Sem discriminators do Mongoose.

Os campos entram **na fase que os usa**, não antes (princípio do `AGENTS.md`):

| Campo | Fase | Tipos |
| --- | --- | --- |
| `Tenant`, `kind`, `module`, `status`, `source`, `Case`, `title`, `dueDate`, `filedDate`, `notes`, `readBy`, timestamps | 1 | `deadline`, `alert` (o resto do enum de `kind` já existe para a validação) |
| `topic`, `params`, `severity`, `Transaction`, `dedupeKey`, `expireAt` | 2 | `notice` (`finance_due`) |
| `evidence` | 4 | `notice` (`court_movement`) |
| `proposal`, `ruleKey`, `ruleVersion`, `decidedBy`, `decidedAt`, `applied`, `rejectReason` | 5 | `suggestion` |

Índices da Fase 1: `{Tenant, kind, status, dueDate}` (Central e contadores), `{Tenant, Case, kind, dueDate}` (serviço), `{status, dueDate}` (varredura entre escritórios). Fase 2: `{Tenant, dedupeKey}` único e parcial, TTL em `expireAt`.

Regras do model (iguais às do `Deadline`): `filed` exige `filedDate`; `deadline`/`alert` exigem `Case`, `title`, `dueDate` e `status`.

### Contrato (`notification.schema.ts`, substitui `deadline.schema.ts`)

- `NOTIFICATION_KINDS = ['deadline', 'alert', 'suggestion', 'notice']`, `NOTIFICATION_STATUS` (união: `pending`, `filed`, `missed`, `done`, `canceled`, `accepted`, `rejected`, `superseded`, `expired`), `STATUS_OF_KIND` e `validNotificationStatus(kind, status)`:
  - `deadline`: `pending`, `filed`, `missed`, `canceled`;
  - `alert`: `pending`, `done`, `canceled`;
  - `suggestion`: `pending`, `accepted`, `rejected`, `superseded`, `expired`;
  - `notice`: nenhum (lido/não lido por pessoa).
- `NOTIFICATION_MODULES = ['expert_cases', 'finance']` (módulos da matriz, AD-137).
- `NOTIFICATION_SOURCES = ['user', 'system', 'datajud']`.
- `DUE_SOON_DAYS = 15` (era `DEADLINE_DUE_SOON_DAYS`).
- `REPORT_DELIVERY_TITLE` e `SERVICE_DELIVERY_TITLE` ("Entrega do laudo", "Entrega do serviço") passam do `case/deadline.schema.ts` para o contrato: o `case` os usa no evento e no filtro de entrega, o `notifications` ao protocolar.
- `createNotificationSchema` (`caseId`, `kind` `deadline`|`alert`, `title`, `dueDate`, `notes`) e `updateNotificationSchema` (campos parciais, `status`, `filedDate`). Na Fase 2 a união ganha o `notice`; na 5, a `suggestion`.

## 2. Renomeações (o aceite é `rg -n "Deadline\b|deadlineService" apps packages` vazio)

O `rg` é sensível a maiúsculas e não pega o plural (`Deadlines`) nem o minúsculo. A lista real é o inventário de 123 arquivos (`rg -il deadline apps packages`). Nomes novos:

| Antes | Depois | Por quê |
| --- | --- | --- |
| `Deadline` (model), `DeadlineDocument`, `DeadlineRecord`, `CreateDeadline`, `UpdateDeadline`, `DeadlineKind`, `DeadlineStatus` | `Notification…` | a entidade |
| `reportDeadline` (campo de entrada do cadastro e da importação, coluna do CSV) | `reportDueDate` | o "prazo do laudo" é uma data de calendário (sufixo `Date`, AD-140); o rótulo de tela continua "Prazo do laudo" |
| `nextDeadline` / `NextDeadline` (lista de serviços) | `nextDue` / `NextDue` | o próximo prazo ou alerta pendente |
| `invalid_deadline_status` | `invalid_notification_status` | chave de `API_MESSAGE_KEYS` |
| `deadlineAgendaEntries`, `DEADLINE_STATUS_ENTRY` | `notificationAgendaEntries`, `NOTIFICATION_STATUS_ENTRY` | `CALENDAR_ENTRY_SOURCES`: `deadline` → `notification` |
| `calendarEntryService.deleteDeadlinesOfCase` | `deleteNotificationsOfCase` | — |
| `User.preferences.deadlineReminderEmail` | fica até a Fase 2, que troca pela matriz tipo × canal | a Fase 1 não muda preferências |
| rota web `/deadlines` | `/notifications` | Central |
| `query/deadline.ts`, `useDeadlineForm`, `deadline-dialog`, `deadline-form`, `deadline-labels`, `case-deadlines`, `deadlines-table`, `new-deadline-dialog`, `deadline-entry-dialog` | `query/notification.ts`, `useNotificationForm`, `notification-dialog`, `notification-form`, `notification-labels`, `case-notifications`, `notifications-table`, `new-notification-dialog`, `notification-entry-dialog` | renomeados com `git mv` e adaptados, não duplicados |

Chaves de tradução que nomeiam **texto** (`deadline: 'Prazo'`, `deadlines_and_alerts`…) continuam: o texto da tela ainda diz "prazo". Só sai `invalid_deadline_status`; entram as chaves novas que a tela pedir, buscadas antes no dicionário.

## 3. BFF (`apps/api/src/modules/notifications/`)

Arquivos: `notification.{router,controller,service,repository,schema}.ts` + testes colocalizados (os de `case/deadline.*` migrados com `git mv`). Dono de `Notification` no `DB_OWNERSHIP`.

| Método e rota | Permissão (AD-137) | O que faz |
| --- | --- | --- |
| `GET /notifications` | `expert_cases` `view` | Paginado. Filtros `status` e `caseId`. Sem `caseId`: `status` padrão `pending` (a aba de hoje). Com `caseId`: todas do serviço. Ordem por vencimento crescente; situação resolvida, decrescente (AD-189). |
| `POST /notifications` | `expert_cases` `create` | Cria prazo ou alerta (`source: 'user'`, `module: 'expert_cases'`). Serviço ausente → 404 do serviço. |
| `PATCH /notifications/:id` | `expert_cases` `update` | Editar, Adiar, protocolar, concluir, cancelar. Status de outro tipo → 422 `invalid_notification_status`. |
| `DELETE /notifications/:id` | `expert_cases` `delete` | — |

Na Fase 2 entram `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all` e o filtro `kind`; a lista passa a filtrar por módulo visível (D5). Na Fase 5, `accept`/`reject`.

`activityLog.middleware.ts`: `notifications` → módulo `expert_cases` no mapa; leitura (`/read`, `/read-all`) entra no `IGNORED` na Fase 2.

### Grafo de módulos

- `notifications` → `case` (`caseService.getCase`, `findSummariesByIds` para o rótulo).
- `documents` → `notifications` (`fileReportDelivery`, folha do serviço, cronograma e exportação).
- `agenda` → `notifications` (feed iCal; o aviso diário, até sair na Fase 2).
- **`case` não depende de `notifications`** (sem ciclo):
  - prazo do laudo no cadastro → evento novo **`case:created`** `{ tenantId, caseId, delivery?: { title, dueDate, notes } }`, com subscriber `notifications.subscriber.ts` (AD-264). O `case` decide o título (tipo próprio ou não), porque é ele quem conhece o tipo.
  - `case:deleted` (existe) → `notifications` apaga as do serviço; a agenda já apaga os itens pelo `Case`.
  - "Próximo prazo" da lista, filtro "entrega no período" (AD-177) e os números da faixa (vencidos, vencem em 15 dias) → **funções de leitura em `packages/db/src/notificationReads.ts`** (`nextDueByCases`, `caseIdsDueBetween`, `pendingDueCounts`), no padrão de `groupStats`/`dailyTrend`. São leituras puras, sem regra de negócio; a escrita continua só no dono (AD-265).

**Trade-off do evento**: a resposta do cadastro volta antes do prazo existir (milissegundos). A tela do serviço busca as notificações depois de abrir; os testes usam `expect.poll`.

## 4. Agenda e iCal (AD-266)

`CALENDAR_ENTRY_SOURCES`: `deadline` → `notification`; o `type` do item continua `deadline` (é o que a agenda desenha) e ganha o alerta como hoje. `canceled` vira item cancelado. `backfillCalendarEntries` passa a ler `Notification` (`deadline`/`alert`). O feed iCal lê os pendentes por `notificationService.listPending`. O `UID` do iCal continua `prazo-<id>@ethica`.

## 5. Web (`apps/web`)

- `routes/_private/notifications/` (no lugar de `deadlines/`), título "Notificações", aba **Prazos e alertas** (a tabela de hoje, com Cancelar). A aba **Avisos** e o sino entram na Fase 2; **Para aprovar**, na Fase 5.
- Menu (`home-sections`, `home-access`), início, `case-columns` (`nextDue`), detalhe do serviço (`case-notifications`), agenda (`notification-entry-dialog`) e relatórios apontam para a nova API.
- `query/notification.ts` com `notificationKeys` e as mutações; a invalidação é a mesma de hoje (lista, faixa, agenda).

## 6. Dados (D8)

Sem migração e **sem código de boot que apague ou reescreva** a collection `deadlines`: ela fica órfã no banco até o usuário decidir (apagar dado fora do ambiente local é dele). Seeds (`seed-demo`, `seed-volume`) passam a gravar `Notification`. Banco local se recria (`docker compose down -v`, AD-141).

## 7. Fase 2 — worker e entrega (estrutura)

- `apps/worker` (plano anterior, D1 e seção 9): `src/server.ts` (env → conexão → `syncIndexes(workerModels)` → `/health` e `/metrics` em `node:http` → fila → agendador), `config/env.config.ts`, `queue/` (claim com `findOneAndUpdate`, lease, prioridade, retry com backoff e jitter, encerramento no SIGTERM), `scheduler.ts` (só enfileira, com `dedupeKey` por janela), `jobs/`.
- Models novos em `packages/db`: `WorkerJob` (o `DatajudJob` do plano anterior, com nome geral porque a fila agora carrega lembretes e e-mails; AD-267), `WorkerHeartbeat`, `NotificationDelivery` (`{User, channel, key}` único).
- `syncIndexes` por dono (D6 do plano anterior): `apiModels` e `workerModels`.
- `packages/mail`: `apps/api/src/providers/mail/` movido com `git mv`; o api passa a importar dele.
- Leituras do worker em `packages/db` (rótulo do serviço, destinatários com preferência e permissão, escritório aberto), para o worker não importar services do api.
- Jobs: `reminders_sweep` (cria `finance_due` com `dedupeKey`), `email_digest` (consolidado por pessoa com a trava `digest:<dia>`), `email_immediate` (`critical`, trava `immediate:<id>`).
- Preferências: `User.preferences.notifications` = `{ deadlines, finance, court, suggestions } × { email, push }`; `deadlineReminderEmail: false` vira `deadlines.email: false` numa migração de subida do api (`migrateUsers`, padrão de `migrateCases`).
- Saem do api: `scheduleDeadlineNotices` (`server.ts`) e `agenda/deadlineReminder.service.ts`.
- Deploy: `Dockerfile.worker`, `railway.worker.json`, serviço `worker` no `docker-compose.yml`, `pnpm dev:worker`, variáveis no `.env.example`. O serviço no Railway e o usuário próprio no Atlas são do usuário (roadmap).
- Teste estrutural: o worker não importa `apps/api` e vice-versa; o `mongoose-boundary` varre o worker; o worker só usa `updateOne`/`findOneAndUpdate` em `Notification` dentro de `queue/notification-writes.ts` (D7).
