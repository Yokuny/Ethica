---
feature: Central de notificações
slug: central-notificacoes
descricao: Notification única (prazo, alerta, sugestão, aviso) no lugar do Deadline, Central no app e worker de lembretes e entrega
data: 2026-11-22
status: em-andamento
areas: [apps/api, apps/web, packages/contracts, packages/db, docs]
decisoes: [AD-263, AD-264, AD-265, AD-266, AD-267, AD-272]
spec: [.specs/features/central-notificacoes]
---

# Central de notificações

**Status**: em-andamento · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `docs`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='central-notificacoes'`.

## O que foi feito

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

### `apps/web`

- `apps/web/src/routes/_private/notifications/` — Central; `apps/web/src/components/notification-{dialog,form,labels}`, `apps/web/src/hooks/useNotificationForm.ts`, `apps/web/src/query/notification.ts`.

## Como testar

```
pnpm vitest run apps/api/src/modules/notifications apps/web/src/components/notification-dialog.unit.test.tsx
```

- UAT: Notificações → Adicionar → escolher o serviço → Prazo; Marcar como cancelado e achá-lo na aba Cancelado; cadastrar um serviço com prazo do laudo e ver "Entrega do laudo" no detalhe.

## Pendências

- [ ] Fases 2 e 6 (push) — `.specs/features/central-notificacoes/tasks.md`.
- [ ] Conferir a Central e o detalhe do serviço no navegador (o login local pede passkey; não conferido pelo agente).
- [ ] Usuário: há prazos reais em produção (D8)?
- [ ] Perita: confirmar a tabela "Assumptions" da spec.

## Histórico

- 2026-11-22 — Fase 1: `Notification` no lugar de `Deadline` num commit só, sem shim; `rg -n "Deadline\b|deadlineService" apps packages` vazio. Divergências do design em AD-272 (permissões de criar e excluir continuam `expert_cases` `update`; o serviço lê `?caseId=`). Sem migração de dados (D8, a confirmar com o usuário).
- 2026-11-22 — Fase 0: documentação, ADs e glossário. Absorve `avisos-notificacoes` e substitui a entidade de `prazos-alertas`.

## Referências

- Spec (congelada): `.specs/features/central-notificacoes/`
- Plano em execução: `.specs/plans/2026-11-22-automacao-datajud-notificacoes.md`
