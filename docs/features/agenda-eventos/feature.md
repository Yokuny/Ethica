---
feature: Agenda por eventos
slug: agenda-eventos
descricao: Perícia, prazos, vencimentos e recebimentos do financeiro chegam à agenda por evento, com tipo, estado e filtro
data: 2026-11-03
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-169, AD-192, AD-193]
spec: [.specs/features/agenda-eventos]
branches: [main]
---

# Agenda por eventos

**Status**: concluido · **Atualizado**: 2026-11-03 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='agenda-eventos'`.

## O que foi feito

- **Data e hora da perícia** viram o compromisso de perícia do serviço no cadastro **e na edição**: mudar a data no serviço move o compromisso.
- **Financeiro na agenda**: cada honorário a receber e cada despesa no dia do vencimento, com valor e serviço, e cada recebimento no dia em que caiu. Pago ou cancelado continua no dia, marcado. Só aparece para quem vê o financeiro; clicar abre os lançamentos do serviço.
- **Prazos** seguem na agenda pelo mesmo caminho, marcados quando protocolados ou perdidos; clicar abre o prazo.
- Filtro da agenda por tipo inclui Prazo, Receita, Despesa e Recebimento.

## Por que

Pedido de 2026-11-03: a agenda recebe as datas de todo o sistema por evento e aceita vários tipos. Respostas: as quatro origens entram, pago fica marcado e "planilha" era a agenda.

Não desfazer sem ler: a agenda guarda uma cópia que só a origem muda, pelo evento `agenda:entries_synced` com a lista completa dos itens da origem (AD-169). Nova origem com data = emitir esse evento no service dono e, se for tipo novo, incluí-lo em `CALENDAR_ENTRY_TYPES`.

## Como

### `packages`

- `packages/contracts/src/schemas/calendar-entry.schema.ts` — tipos, estados, fontes, `deadlineAgendaEntries`, `transactionAgendaEntries`; `caseInspectionSchema` também na edição (`case.schema.ts`).
- `packages/db/src/models/calendar-entry.model.ts` — `CalendarEntry` e `backfillCalendarEntries` (chamada em `apps/api/src/server.ts`).

### `apps/api`

- `apps/api/src/events/event-types.ts` (`AgendaEntriesSyncedPayload`) e `apps/api/src/events/subscribers/agenda.subscriber.ts` (itens e perícia; `case:deleted` leva os prazos do serviço).
- Quem emite: `case.service.ts` (perícia e prazo do cadastro), `deadline.service.ts`, `finance/transaction.service.ts`.
- `apps/api/src/modules/agenda/calendar-entry.{schema,repository,service}.ts`; `GET /agenda/entries` em `appointment.router.ts`; `appointment.service.saveCaseInspection`.

### `apps/web`

- `apps/web/src/query/calendar-entry.ts`, `apps/web/src/components/calendar-entry-labels.ts`.
- `apps/web/src/routes/_private/agenda/` — `CalendarEntryChip`, `@components/deadline-entry-dialog.tsx`, filtro por tipo; edição do serviço com a data da perícia (`expert-cases/@components/case-form-fields.tsx`).

## Como testar

```
pnpm vitest run apps/api/src/modules/agenda packages/db/src/models/calendar-entry.model.int.test.ts apps/web/src/routes/_private/agenda
```

- Agenda: lançar um honorário com vencimento e um recebimento; ver os dois no calendário; marcar pago e ver "Pago". Editar um serviço com nova data da perícia e ver o compromisso mudar.

## Pendências

- [ ] Conferência visual no navegador.
- [ ] Financeiro no feed iCal (o link do calendário externo não carrega a matriz de permissões).

## Histórico

- 2026-11-05 — Página montada direto no `index.tsx`: tipo e Dia/Semana/Mês como seletores no cabeçalho; navegação à direita do mês/ano (AD-193).
- 2026-11-05 — Dia/Semana/Mês vira lista suspensa ao lado da navegação; período com o mês abreviado grande e o ano menor; o tipo vai para o botão "Filtros" (AD-192).
- 2026-11-04 — Botões de operação da agenda no topo, como no resto do sistema: anterior/Hoje/próximo e Novo compromisso à direita do título, Dia/Semana/Mês logo abaixo; sobre o calendário ficam o mês e o filtro de tipo (`apps/web/src/routes/_private/agenda/@components/calendar-toolbar.tsx`).
- 2026-11-03 — Implementado AEV-01 a AEV-05 (AD-169).
- 2026-11-03 — Spec criada (`.specs/features/agenda-eventos/spec.md`).
