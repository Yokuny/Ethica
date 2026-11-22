# Central de notificações — Specification

**Origem**: plano `2026-11-22-automacao-datajud-notificacoes.md` (em `.specs/plans/` durante a execução; arquivado em `.specs/features/central-notificacoes/plans/` ao concluir) (decisões D1, D2, D4, D5, D7 e D8), escolhido pelo usuário em 2026-11-22. Substitui `prazos-alertas` (a entidade) e absorve `avisos-notificacoes` (AVS-01 a AVS-03). Prefixo de requisito: `CNT`.

## Problem Statement

Tudo o que pede a atenção de alguém no escritório está espalhado: prazos e alertas no `Deadline` (AD-109, AD-189), o aviso diário de prazos num timer de memória do processo da API (AD-110, AD-147 nunca implementada), e nada para vencimento financeiro, movimentação no tribunal ou sugestões. O sistema ainda não foi lançado: é o momento de chegar ao formato final sem carregar a estrutura antiga.

## Goals

- [ ] Uma entidade só, `Notification`, com quatro tipos: prazo, alerta, sugestão e aviso.
- [ ] Uma tela só, a **Central de notificações** (`/notifications`), no lugar de "Prazos e Alertas".
- [ ] Um motor só de lembretes e entrega (tela, e-mail e, depois, push), fora do processo da API.
- [ ] Nada do que "Prazos e Alertas" faz hoje se perde.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Sugestões e avisos do Datajud | Módulo premium, `automacao-datajud`. A Central só os mostra. |
| SMS e WhatsApp | Custo por mensagem; e-mail e push cobrem o pedido (mantido de `avisos-notificacoes`). |
| Migração dos `Deadline` existentes | D8: o sistema não foi lançado; seeds refeitos. Se houver dado real em produção, um script avulso (a confirmar com o usuário). |

---

## Já existe (não refazer, só mudar de casa)

| Item | Onde está hoje | Vai para |
| --- | --- | --- |
| Prazo e alerta, criticidade, Adiar, protocolar, concluir, títulos aprovados (AD-189, AD-190) | `Deadline`, `apps/api/src/modules/case/deadline.*`, `apps/web/src/routes/_private/deadlines/` | `Notification` (`kind` `deadline`/`alert`), módulo `notifications`, `/notifications` |
| Prazo "Entrega do laudo" do cadastro (AD-109) | `case.service.createCase` | evento `case:created` → `notifications` |
| Entrega do laudo protocola o prazo, nunca o alerta (AD-126, AD-189) | `deadlineService.fileReportDelivery` | `notificationService.fileReportDelivery` |
| Prazos na agenda e no iCal (AD-169) | `source: 'deadline'` | `source: 'notification'` |
| Aviso diário de prazos por e-mail (AD-110) | `agenda/deadlineReminder.service.ts` + `setTimeout` em `server.ts` | job `email_digest` no `apps/worker` (Fase 2) |
| E-mail | `apps/api/src/providers/mail/` | `packages/mail` (Fase 2) |

---

## Assumptions & Open Questions

Padrões da seção 12 do plano. A confirmação com a perita fica registrada em `docs/roadmap.md`.

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Nome da Central no menu | "Notificações" | Cobre prazo, alerta, sugestão e aviso | No |
| Status `canceled` para prazo e alerta | Sim: à mão e pela sugestão de encerramento (acordo, extinção) | Prazo de processo encerrado não é perdido nem protocolado | No |
| Há dados reais de prazos em produção? (D8) | Não: seeds refeitos, sem migração | Sistema não lançado | No (usuário) |
| Horário do consolidado | A partir das 07:00 `America/Sao_Paulo`, varredura de hora em hora (AD-110, AD-147) | Recupera o dia perdido e não duplica | No |
| Vencimento financeiro | `expected`/`partial` em 7 dias, hoje e atrasados, todo dia até liquidar (AVS-02) | Conta esquecida é o problema real | No |
| Quem vê e recebe o financeiro | Quem tem `finance` `view` (AD-137) | Quem não vê valores não recebe valores | No |
| Preferências | Matriz tipo × canal na conta, por pessoa; tudo ligado no começo; a preferência de e-mail de prazos atual vira `deadlines.email` | Mesma regra da AD-110 | No |
| Push | Web Push (VAPID) no service worker que já existe, sem valor nem nome de parte no texto (AVS-03) | Sem custo nem loja | No |
| Lido | Por pessoa (`readBy`); o status de prazo, alerta e sugestão é do escritório | Uma pessoa protocola e vale para todos | No |

---

## User Stories

### P1: Notificação única no lugar do prazo ⭐ MVP — CNT-01

**User Story**: Como perita, quero que prazos e alertas continuem funcionando igual, agora dentro da Central de notificações.

**Acceptance Criteria**:

1. WHEN abro "Notificações" THEN the system SHALL mostrar a aba "Prazos e alertas" com tudo o que "Prazos e Alertas" mostrava (criticidade, Adiar, protocolar, concluir, filtros por situação).
2. WHEN crio um prazo ou alerta pelo serviço ou pela Central THEN the system SHALL usar os títulos aprovados por tipo de serviço (AD-190) e gravar uma `Notification` do tipo escolhido.
3. WHEN mudo a situação para uma de outro tipo THEN the system SHALL recusar com `invalid_notification_status`.
4. WHEN cancelo um prazo ou alerta pendente THEN the system SHALL marcá-lo `canceled`, que sai dos pendentes e fica cancelado na agenda.
5. WHEN cadastro um serviço com prazo do laudo THEN the system SHALL criar o prazo "Entrega do laudo" (ou "Entrega do serviço" no tipo próprio).
6. WHEN registro a entrega do laudo THEN the system SHALL protocolar o prazo "Entrega do laudo" pendente mais antigo, nunca um alerta.
7. WHEN excluo um serviço THEN the system SHALL excluir as notificações dele.
8. WHEN abro a agenda, o iCal, o relatório de prazos ou a exportação THEN the system SHALL mostrar os prazos e alertas como antes.
9. WHEN procuro `Deadline` no código THEN the system SHALL não ter mais nada (`rg -n "Deadline\b|deadlineService" apps packages` vazio).

**Independent Test**: e2e de `/notifications` (os testes de `deadline.router.e2e.test.ts` migrados), e2e do cadastro do serviço e da entrega do laudo, unit do feed iCal.

### P1: Varredura e entrega sem perda nem duplicidade — CNT-02 (era AVS-01)

**Acceptance Criteria**:

1. WHEN o worker varre (de hora em hora, a partir das 07:00) THEN the system SHALL mandar o consolidado do dia a quem ainda não recebeu, conforme as preferências.
2. WHEN o worker esteve fora às 07:00 THEN the system SHALL mandar na primeira varredura depois de voltar.
3. WHEN duas réplicas varrem juntas THEN the system SHALL mandar uma vez só por pessoa × dia × canal (`NotificationDelivery`).
4. WHEN o envio falha THEN the system SHALL tentar de novo na varredura seguinte e registrar no log.
5. WHEN a varredura entra THEN the system SHALL tirar o timer de `apps/api/src/server.ts` e o `deadlineReminder.service.ts`.
6. WHEN o e-mail de prazos sai THEN the system SHALL trazer os mesmos prazos para os mesmos destinatários de hoje (15 dias, hoje, ontem; AD-110).

### P1: Aviso de vencimento financeiro — CNT-03 (era AVS-02)

**Acceptance Criteria**:

1. WHEN um lançamento `expected`/`partial` vence em 7 dias, hoje ou está atrasado THEN the system SHALL criar o aviso `finance_due` (um por lançamento e faixa) e incluí-lo no consolidado.
2. WHEN a pessoa não tem `finance` `view` THEN the system SHALL não mostrar nem enviar.
3. WHEN não há nada THEN the system SHALL não mandar e-mail vazio.

### P1: Sino e Central com avisos — CNT-04

**Acceptance Criteria**:

1. WHEN há avisos não lidos visíveis a mim THEN the system SHALL mostrar o número no sino do layout.
2. WHEN abro a aba "Avisos" THEN the system SHALL listar os avisos com lido e não lido, e "Marcar todos como lidos".
3. WHEN outra pessoa lê um aviso THEN the system SHALL mantê-lo não lido para mim.

### P1: Preferências tipo × canal — CNT-05

**Acceptance Criteria**:

1. WHEN abro Conta → Notificações THEN the system SHALL mostrar a matriz (prazos, financeiro, tribunal, sugestões) × (e-mail, push).
2. WHEN a pessoa já tinha desligado o e-mail de prazos THEN the system SHALL manter `deadlines.email` desligado.

### P2: Push — CNT-06 (era AVS-03)

Os critérios de AVS-03 (`.specs/features/avisos-notificacoes/spec.md`) valem sem mudança. Entra na Fase 6.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CNT-01 | Notificação única | Fase 1 | Pending |
| CNT-02 | Varredura e entrega | Fase 2 | Pending |
| CNT-03 | Vencimento financeiro | Fase 2 | Pending |
| CNT-04 | Sino e avisos | Fase 2 | Pending |
| CNT-05 | Preferências | Fase 2 | Pending |
| CNT-06 | Push | Fase 6 | Pending |

## Success Criteria

- [ ] A perita usa a Central como usava "Prazos e Alertas", sem perder nada.
- [ ] Reiniciar o worker às 06:59 e às 07:01 não faz ninguém perder nem receber em dobro o consolidado.
- [ ] O operador sem financeiro não vê nem recebe `finance_due`.
