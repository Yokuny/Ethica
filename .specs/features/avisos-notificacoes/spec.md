# Avisos de vencimento e notificações push — Specification

**Origem**: roadmap item 8 (`docs/roadmap.md`), pendências de `docs/features/prazos-recebimentos/feature.md` (aviso diário em timer de memória) e pedido do usuário em 2026-11-01 ("pode ser por cron job no servidor a cada x tempo verificando se tem coisa com vencimento próximo a ser notificado"). Prefixo de requisito: `AVS`.

## Problem Statement

Hoje só existe um aviso: o e-mail diário de **prazos** das perícias às 07:00 (AD-110). Ele roda num `setTimeout` encadeado em memória (`apps/api/src/server.ts`): se a API estiver fora do ar às 07:00 o dia se perde, e com duas réplicas o e-mail sai duplicado. Vencimentos do **financeiro** (honorário a receber, despesa a pagar) não avisam ninguém, e não há aviso no celular: a perita só fica sabendo se abrir o sistema ou o e-mail.

## Goals

- [ ] Os avisos rodam por uma varredura agendada que não perde dia e não envia em dobro.
- [ ] Vencimentos financeiros próximos e atrasados avisam quem cuida do financeiro.
- [ ] Os avisos também chegam como notificação push no celular e no computador, para quem ativar.

## Out of Scope

| Feature | Reason |
| --- | --- |
| SMS ou WhatsApp | Custo por mensagem e provedor a decidir; e-mail e push cobrem o pedido. |
| Aviso de movimentação nova no Datajud | Roadmap item 10; Datajud fica para depois (decisão de 2026-11-01). |
| Central de notificações dentro do app (sino com histórico) | Não pedido; avaliar depois de usar push. |
| Fila externa (Redis, SQS) ou serviço de jobs separado | Uma varredura idempotente no banco resolve o volume atual. |

---

## Já existe (não refazer)

| Item | O que já há | Lacuna |
| --- | --- | --- |
| Aviso de prazo | `apps/api/src/modules/agenda/deadlineReminder.service.ts` (`sendDeadlineNotices`: 15 dias, hoje, ontem; um e-mail por pessoa) | Disparo por timer em memória. |
| Preferência | `User.preferences.deadlineReminderEmail` na tela de conta (AD-110) | Preferências do financeiro e do push. |
| E-mail | `apps/api/src/providers/mail/` (`MailProvider`) | — |
| PWA | `apps/web/public/sw.js`, `manifest.webmanifest`, registro do service worker em produção (`campo-vistorias`, AD-128) | Receber push no service worker. |
| Financeiro | `Transaction` com `dueDate` e `status` (`expected`, `partial`, `settled`, `canceled`); "atrasado" é derivado (glossário) | Aviso. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Agendador | Cron dentro do processo da API (biblioteca de cron ou intervalo fixo) que roda **a cada hora** e envia o que ainda não foi enviado no dia; o envio de cada pessoa × dia × tipo de aviso fica gravado no banco com índice único, que é a trava (AD-147) | Recupera o dia se a API estava fora às 07:00 e impede duplicidade entre réplicas sem infraestrutura nova | No |
| Horário | Primeiro envio a partir das 07:00 de `America/Sao_Paulo` (AD-036, AD-110); depois disso, a varredura só envia quem ainda não recebeu o do dia | Mantém o comportamento que a perita conhece | No |
| Aviso financeiro: o quê | Lançamentos `expected` ou `partial` com vencimento em 7 dias, hoje e atrasados (vencidos e não liquidados), num consolidado diário separado do de prazos | Mesmo formato do aviso de prazos; o financeiro tem ciclo próprio | No |
| Aviso financeiro: atrasados | Atrasado entra no consolidado **todo dia** até liquidar ou cancelar | Conta a receber esquecida é o problema real; confirmar se é insistente demais | No |
| Aviso financeiro: quem | Quem tem `finance` `view` na matriz (AD-137) e deixou o aviso ligado | Quem não vê valores não recebe valores | No |
| Push | Web Push (padrão do navegador, chaves VAPID no ambiente) pelo service worker já existente; cada aparelho ativa na tela de conta; o push leva título curto e abre a tela certa ao tocar | Sem custo nem app de loja; no iPhone só funciona com o app instalado na tela inicial (iOS 16.4+) | No |
| Push: conteúdo | Sem valor em reais nem nome de parte no texto do push (aparece na tela bloqueada): "3 prazos vencem hoje", "2 recebimentos atrasados" | LGPD e sigilo do processo | No |
| Preferências | Na conta, por pessoa: e-mail de prazos (existe), e-mail financeiro, push ligado neste aparelho | Mesma regra da AD-110: cada um decide o seu | No |
| Tenant suspenso | Não recebe nenhum aviso (AD-098) | Igual ao aviso atual | No |

---

## User Stories

### P1: Varredura agendada sem perda nem duplicidade ⭐ MVP — AVS-01

**User Story**: Como perita, quero receber o aviso de prazos todo dia, mesmo que o servidor tenha reiniciado de madrugada, e nunca em dobro.

**Acceptance Criteria**:

1. WHEN chega a hora da varredura THEN the system SHALL procurar quem deve receber o aviso do dia e ainda não recebeu, e enviar.
2. WHEN a API estava fora do ar às 07:00 THEN the system SHALL enviar o aviso do dia na primeira varredura depois de voltar.
3. WHEN duas instâncias da API varrem ao mesmo tempo THEN the system SHALL enviar uma vez só por pessoa, dia e tipo de aviso.
4. WHEN o envio de uma pessoa falha THEN the system SHALL tentar de novo na próxima varredura do mesmo dia e registrar a falha no log.
5. WHEN a varredura nova entra THEN the system SHALL remover o timer de `apps/api/src/server.ts` (sem manter os dois).

**Independent Test**: unit do service com relógio injetado (antes das 07:00 não envia, depois envia, segunda chamada no mesmo dia não reenvia); integração com dois disparos simultâneos gravando um envio.

### P1: Aviso de vencimento financeiro — AVS-02

**User Story**: Como perita, quero saber de manhã quais honorários e despesas vencem ou estão atrasados, para cobrar e pagar em dia.

**Acceptance Criteria**:

1. WHEN há lançamentos previstos ou parciais vencendo em 7 dias, hoje ou atrasados THEN the system SHALL enviar um e-mail consolidado com perícia, descrição, valor em aberto e vencimento, com link para o lançamento.
2. WHEN a pessoa não tem `finance` `view` THEN the system SHALL não enviar.
3. WHEN a pessoa desliga o aviso financeiro na conta THEN the system SHALL não enviar.
4. WHEN não há nada a avisar THEN the system SHALL não enviar e-mail vazio.

**Independent Test**: seed com honorário vencido e despesa vencendo hoje; admin recebe; operador (sem financeiro) não recebe.

### P2: Notificação push — AVS-03

**User Story**: Como perita, quero ver no celular que tenho prazo ou recebimento vencendo, sem abrir o e-mail.

**Acceptance Criteria**:

1. WHEN a perita ativa "Notificações neste aparelho" na conta THEN the system SHALL pedir a permissão do navegador e guardar a inscrição do aparelho.
2. WHEN sai o aviso diário de prazos ou o financeiro THEN the system SHALL mandar também um push para cada aparelho ativo da pessoa, com texto sem dado sensível.
3. WHEN a perita toca no push THEN the system SHALL abrir a tela correspondente (perícias com prazo, financeiro).
4. WHEN o navegador recusa a inscrição ou ela expira THEN the system SHALL removê-la e mostrar na conta que o aparelho não recebe.
5. WHEN a pessoa sai do sistema naquele aparelho THEN the system SHALL apagar a inscrição dele.

**Independent Test**: ativar push no Chrome do computador e no PWA instalado no celular; forçar a varredura; ver a notificação e tocar.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AVS-01 | P1: Varredura agendada | Specify | Pending |
| AVS-02 | P1: Aviso de vencimento financeiro | Specify | Pending |
| AVS-03 | P2: Notificação push | Specify | Pending |

## Success Criteria

- [ ] Reiniciar a API às 06:59 e às 07:01 não faz ninguém perder nem receber em dobro o aviso do dia.
- [ ] Um honorário atrasado aparece no aviso até ser recebido.
- [ ] A perita recebe o push no celular com o app instalado.

## Pontos de atenção para o design

- Módulos: a varredura é de quem é dono do dado (prazo em `case`, lançamento em `finance`); o envio e a trava podem ficar em `identity` (pessoas e preferências) ou num módulo de notificações. Decidir no design respeitando AD-038/AD-039.
- Datas de vencimento são datas de calendário (`YYYY-MM-DD`, AD-103); "hoje" é o dia em `DISPLAY_TIMEZONE`.
- Variáveis novas de ambiente (chaves VAPID) entram em `apps/api/src/config/env.config.ts`, `.env.example` e `RUN_BOOK.md`; sem chave, o push fica desligado e o resto funciona (mesmo padrão do Datajud e do S3).
- O service worker (`apps/web/public/sw.js`) só é registrado no build de produção; o teste de push é no `vite build` + `vite preview`.
