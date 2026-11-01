---
feature: Prazos e recebimentos
slug: prazos-recebimentos
descricao: Vários prazos por perícia com protocolo, recebimento parcial de honorários, feed iCal e aviso de prazo por e-mail
data: 2026-11-01
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-103, AD-106, AD-107, AD-109, AD-110, AD-111, AD-112, AD-113]
spec: [.specs/features/prazos-recebimentos]
branches: [feat/prazos-recebimentos]
---

# Prazos e recebimentos

**Status**: concluido · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='prazos-recebimentos'`.

## O que foi feito

- Cada perícia tem vários prazos (título, vencimento, observações) que o perito protocola com a data de entrega, marca como perdidos ou reabre; o prazo do laudo do cadastro vira o prazo "Entrega do laudo".
- A listagem de perícias mostra o próximo prazo pendente com os selos "Vencido" e "Vence em breve" (até 15 dias); a faixa de indicadores e o início contam prazos vencidos e que vencem em até 15 dias.
- A agenda mostra os prazos pendentes no calendário (dia inteiro) e abre o prazo para protocolar.
- Honorários recebem parcelas (valor, data, conta) com saldo, status parcial e estorno; honorário não é excluído nem cancelado, e o fluxo de caixa conta o recebido pela data de cada parcela.
- Ao abrir um compromisso ou prazo na agenda, admin e manager veem os recebimentos da perícia (honorários, recebido, saldo e parcelas).
- Cada pessoa gera na conta um link secreto do feed iCal (compromissos e prazos) para assinar no Google, Outlook ou Apple, e liga ou desliga o e-mail diário de prazos (07:00, prazos que vencem em 15 dias, hoje e os vencidos ontem).

## Por que

Prazo perdido e honorário esquecido são as duas maiores dores do perito (`PRODUCT.md`). O prazo é entidade própria no módulo `case` porque tem semântica de protocolo e é um dia, não um instante (AD-109, supersede a parte de agenda da AD-106). O honorário guarda as parcelas e deriva o status delas; por decisão do usuário ele nunca é excluído nem cancelado, e o juízo alterar o valor atualiza o lançamento existente (AD-111). O aviso por e-mail é escolha de cada pessoa, sem chave no tenant (AD-110). Não houve migração: só o seed foi atualizado (AD-112).

## Como

### `apps/api`

- `apps/api/src/modules/case/deadline.{controller,service,repository,schema}.ts` (rotas em `case.router.ts`) — CRUD de prazo sob `/expert-cases` (`/expert-cases/deadlines`, `/expert-cases/:id/deadlines`, `/expert-cases/deadlines/:deadlineId`).
- `apps/api/src/modules/case/case.service.ts` — cria "Entrega do laudo", apaga os prazos ao excluir a perícia, anexa `nextDeadline` na listagem; `findSummariesByIds` (número e partes) para os outros módulos.
- `apps/api/src/modules/finance/transaction.repository.ts` — parcelas e status do honorário no próprio update (pipeline), resumo e fluxo pelas parcelas.
- `apps/api/src/modules/finance/transaction.service.ts` — regras do honorário (sem excluir/cancelar, valor ≥ recebido) e `postFixedFees` que atualiza o existente.
- `apps/api/src/modules/agenda/feed.{service,controller,schema}.ts` — `GET /agenda/feed/:token.ics` público, `.ics` montado à mão, rate limit por token (`apps/api/src/middlewares/rateLimit.middleware.ts`).
- `apps/api/src/modules/agenda/deadlineReminder.service.ts` + `apps/api/src/server.ts` — consolidado diário às 07:00 com timer em memória.
- `apps/api/src/modules/identity/account.*` — `/me/calendar-feed` (gerar, status, revogar) e destinatários do aviso; `preferences.*` com `deadlineReminderEmail`.
- Removidos: evento `case:created`, `events/subscribers/agenda.subscriber.ts`, `createReportDeadline`.

### `apps/web`

- `apps/web/src/routes/_private/expert-cases/details/@components/case-deadlines.tsx` e `deadline-form.tsx` — painel de prazos do detalhe.
- `apps/web/src/components/deadline-dialog.tsx` e `deadline-labels.ts` — leitura/ações do prazo e selos, usados por perícias e agenda.
- `apps/web/src/routes/_private/expert-cases/@utils/case-columns.tsx` — coluna "Próximo prazo".
- `apps/web/src/routes/_private/agenda/@components/{calendar-event,month-view,time-grid-view}.tsx` — prazos no calendário.
- `apps/web/src/routes/_private/finance/entries/@components/{receipt-form,installments-list}.tsx` — registrar e estornar recebimentos.
- `apps/web/src/routes/_private/account/@components/{account-deadline-reminder,account-calendar-feed}.tsx` — seções da conta.
- `apps/web/src/components/case-receipts.tsx` — recebimentos da perícia nos diálogos da agenda; `canSeeFinance` em `apps/web/src/query/session.ts`.
- `apps/web/src/query/deadline.ts` — dados de prazo.

### `packages/contracts`

- `packages/contracts/src/schemas/deadline.schema.ts`; `transaction.schema.ts` (`createInstallmentSchema`, status `partial`); chaves de erro em `packages/contracts/src/response/messages.ts`.

### `packages/db`

- `packages/db/src/models/deadline.model.ts`; `transaction.model.ts` (`installments`); `user.model.ts` (`calendarFeedTokenHash`, `preferences.deadlineReminderEmail`).

## Como testar

```
docker compose up -d mongo
pnpm vitest run apps/api/src/modules/pericia apps/api/src/modules/financeiro apps/api/src/modules/agenda
pnpm run check && (cd apps/web && pnpm run build)
```

- UAT: `pnpm --filter api run seed:demo`, entrar como `admin@pericias.example.com`; no detalhe de uma perícia protocolar um prazo; na agenda ver os prazos no mês; no financeiro registrar e estornar um recebimento do honorário parcial; em "Minha conta" gerar o link do calendário e abri-lo (`.ics`).

## Pendências

- [x] UAT visual das telas com os três logins do `ACC.md` (perícias, detalhe, agenda, financeiro, conta; operador sem financeiro).
- [ ] Assinatura real do feed num Google Agenda e envio por SMTP real.
- [ ] Aviso diário roda num timer em memória: com mais de uma réplica da API, mandaria e-mail duplicado; API fora do ar às 07:00 perde o dia — spec em `avisos-notificacoes` (AD-147).
- [ ] Juízo reduzir o honorário fixado abaixo do já recebido só aparece no log (`domain_event.handler_failed`).

## Histórico

- 2026-11-01 — Varredura agendada no lugar do timer, aviso financeiro e push especificados em `avisos-notificacoes` (AD-147).
- 2026-11-01 — Caminhos e nomes de código citados aqui passam ao inglês (feature `english-naming`, AD-139/AD-140).
- 2026-11-01 — Honorário do assistente técnico lançado como `contracted_fees`, o mesmo automático por perícia (`docs/features/gestao-escritorio/feature.md`, AD-135).
- 2026-10-31 — Valores de domínio em inglês no back-end e chaves de tradução em inglês (AD-113); recebimentos da perícia no detalhe do evento da agenda; UAT visual feita.
- 2026-10-31 — Implementado (AD-109 a AD-112). Divergências do design: chaves de erro em inglês no padrão do contrato; T1+T2 e T5+T6 em um commit cada; PRZ-04.3 (liga/desliga no tenant) trocado por preferência por usuário (AD-110).
- 2026-10-31 — Spec criada (`.specs/features/prazos-recebimentos/spec.md`).

## Referências

- Spec/design/tasks/validação: `.specs/features/prazos-recebimentos/`
- Origem: `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md` (onda 1)
