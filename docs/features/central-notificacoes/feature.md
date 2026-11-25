---
feature: Central de notificações
slug: central-notificacoes
descricao: Notification única (prazo, alerta, sugestão, aviso) no lugar do Deadline, Central no app e worker de lembretes e entrega
data: 2026-11-22
status: concluido
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db, packages/mail, docs]
decisoes: [AD-263, AD-264, AD-265, AD-266, AD-267, AD-272, AD-273, AD-280]
spec: [.specs/features/central-notificacoes]
---

# Central de notificações

**Status**: concluido · **Atualizado**: 2026-11-25 · **Áreas**: `apps/api`, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`, `packages/mail`, `docs`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='central-notificacoes'`.

## O que foi feito

- **Push** no celular e no computador: Conta → "Receber notificações neste aparelho"; o resumo do dia chega também por push, só com contagens (sem valor nem nome). Sair do sistema desliga o aparelho.
- **Worker** (`apps/worker`), serviço próprio que fala com a API só pelo banco: de hora em hora cria os avisos de vencimento financeiro e, a partir das 07:00, manda **um e-mail do dia por pessoa** com os prazos (quem vê Serviços) e os lançamentos atrasados, de hoje e de daqui a 7 dias (quem vê o Financeiro), sem perder o dia com restart e sem duplicar com duas réplicas.
- **Sino** no topo do menu com os avisos não lidos e a aba **Avisos** da Central (desde a AD-282, uma lista só e o número em Notificações) (lido é por pessoa, "Marcar todos como lidos"); quem não vê o Financeiro não vê os avisos dele.
- **Conta → Notificações**: liga e desliga o e-mail de prazos e o do financeiro (a escolha antiga do aviso de prazos foi mantida).
- A API não manda mais o e-mail do dia (saiu o timer de `server.ts`).
- **Notificações** no menu e no início, no lugar de "Prazos e Alertas": a mesma lista de prazos e alertas de todos os serviços por criticidade, com Adiar, protocolar, concluir e agora **Marcar como cancelado**.
- O `Deadline` deixou de existir: prazo e alerta são `Notification` (tipos `deadline` e `alert`) no módulo `notifications` (`/notifications`). O servidor recusa a situação de outro tipo (`invalid_notification_status`).
- O prazo "Entrega do laudo" (ou "Entrega do serviço") do cadastro nasce pelo evento `case:created`; excluir o serviço apaga as notificações dele por `case:deleted`.
- Agenda, iCal, cronograma de prazos, exportação, lista e faixa de Serviços leem as notificações; a entrega do laudo continua protocolando só o prazo, nunca o alerta.
- Fase 0: spec, design e tasks; decisões AD-263 a AD-267; glossário com `Notification` e os quatro tipos.

## Por que

O sistema não foi lançado, e prazos, lembretes, avisos e as sugestões do Datajud precisavam de uma casa e de um motor de entrega só. A troca do `Deadline` por `Notification` é feita de uma vez, sem shim (AD-263). Não desfazer sem ler a AD-263 e a AD-267.

## Como

### `packages/contracts` e `packages/db`

- `packages/contracts/src/schemas/notification.schema.ts` — tipos, situações, `validNotificationStatus`, títulos de entrega, `createNotificationSchema`/`updateNotificationSchema`.
- `packages/db/src/models/notification.model.ts` — um schema para os quatro tipos; `packages/db/src/notificationReads.ts` — leituras para o `case` (próximo prazo, entrega no período, números da faixa; AD-265).

### `apps/api`

- `apps/api/src/modules/notifications/` — router, controller, service, repository e schema; `apps/api/src/events/subscribers/notifications.subscriber.ts` (`case:created`, `case:deleted`).
- `agenda` (feed iCal e aviso diário) e `documents` (folha, cronograma, exportação, entrega do laudo) chamam `notificationService`.

### `apps/worker` e `packages/mail`

- `apps/worker/src/server.ts` (boot, heartbeat, laços), `queue/queue.ts` (fila `WorkerJob`), `queue/delivery-lock.ts` (trava `NotificationDelivery`), `queue/notification-writes.ts` (único lugar que grava `Notification`), `scheduler.ts`, `jobs/{reminders-sweep,email-digest,email-immediate}.ts`.
- `packages/db/src/workerReads.ts` — leituras do worker; `packages/mail` — provedores de e-mail usados pela API e pelo worker.
- Deploy: `Dockerfile.worker` (na Railway, configurado em Settings do serviço worker: healthcheck `/health`, reinício em falha, 1 réplica), serviço `worker` no `docker-compose.yml`.

### `apps/web`

- `apps/web/src/routes/_private/notifications/` — Central; `apps/web/src/components/notification-{dialog,form,labels}`, `apps/web/src/hooks/useNotificationForm.ts`, `apps/web/src/query/notification.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/notifications apps/worker apps/web/src/components/notification-dialog.unit.test.tsx tests/structural
```

- UAT: Notificações → Adicionar → escolher o serviço → Prazo; Marcar como cancelado e achá-lo na aba Cancelado; cadastrar um serviço com prazo do laudo e ver "Entrega do laudo" no detalhe.

## Pendências

- [ ] Conferir o push num celular com o app instalado e num computador (build de produção).
- [ ] Perita: confirmar a tabela "Assumptions" da spec.

## Histórico

- 2026-11-25 — Abas Abertas e Resolvidas com a contagem ao lado: `GET /notifications` devolve `counts` no mesmo `aggregate` da lista (`$facet`), com o tipo e o período filtrados e sem a própria aba; sem contador gravado. A contagem "Abertas" não é o número do menu (`countDue` só conta o que já chegou no dia).
- 2026-11-23 — A Central vira uma lista só (Abertas/Resolvidas), com uma leitura e um contador na API; saem as abas e o item Avisos do menu. Detalhe em `notificacoes-processo-unico` (AD-282).

- 2026-11-22 — Collection antiga `deadlines` apagada pelo usuário na produção; a troca do `Deadline` terminou também nos dados.
- 2026-11-22 — Worker no ar na Railway, configurado em Settings (a Railway não aceita mais config-as-code em serviço novo), com o usuário `ethica-worker` do Atlas e as chaves VAPID; o primeiro ciclo rodou (varredura, e-mail do dia, tribunal, expiração de sugestões).
- 2026-11-22 — Fase 6: push (AVS-03) com chaves VAPID, inscrição por aparelho e resumo do dia por push (AD-280). Não conferido num aparelho real (precisa do build de produção e das chaves). Plano arquivado em `.specs/features/central-notificacoes/plans/`.
- 2026-11-22 — D8 resolvido: o usuário rodou o script na produção (11 prazos e 11 itens de agenda copiados); o script saiu do código, como previsto no plano.
- 2026-11-22 — Script avulso `apps/api/scripts/migrate-deadlines.ts` (D8): copia `deadlines` para `notifications` com o mesmo id e religa os itens de agenda; simula sem `--apply` e é idempotente. Rodado no banco local (111 prazos, 105 itens de agenda).
- 2026-11-22 — Conferido no navegador com o usuário logado: criar prazo, cancelar (aba Cancelado, agenda e serviço), aba Avisos com 29 avisos do worker, lido por pessoa (sino de 29 para 28) e Conta → Notificações salvando. No banco local, os prazos antigos (`deadlines`) e os itens de agenda deles (`source: 'deadline'`) seguem órfãos até a decisão do D8. A descrição da Central passa a citar os avisos.
- 2026-11-22 — Fase 2: worker, `packages/mail`, e-mail do dia por pessoa com prazos e financeiro, avisos `finance_due`, sino, aba Avisos e preferências por tipo × canal (AD-273). Worker conferido rodando local e na imagem Docker (`/health` 200, e-mail só no log).
- 2026-11-22 — Fase 1: `Notification` no lugar de `Deadline` num commit só, sem shim; `rg -n "Deadline\b|deadlineService" apps packages` vazio. Divergências do design em AD-272 (permissões de criar e excluir continuam `expert_cases` `update`; o serviço lê `?caseId=`). Sem migração de dados (D8, a confirmar com o usuário).
- 2026-11-22 — Fase 0: documentação, ADs e glossário. Absorve `avisos-notificacoes` e substitui a entidade de `prazos-alertas`.

## Referências

- Spec (congelada): `.specs/features/central-notificacoes/`
- Plano (arquivado): `.specs/features/central-notificacoes/plans/2026-11-22-automacao-datajud-notificacoes.md`
