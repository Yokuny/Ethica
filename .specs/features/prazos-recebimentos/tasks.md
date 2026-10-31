# Prazos e recebimentos — Tasks

**Spec**: `.specs/features/prazos-recebimentos/spec.md` · **Design**: `.specs/features/prazos-recebimentos/design.md`

Um commit por task (`feat(prazos-recebimentos): …`), sem atribuição a LLM. Gate rápido de cada task de API: `pnpm -r exec tsc --noEmit && pnpm vitest run --project unit --project structural`; tasks com repository rodam também `--project integration --project e2e` do arquivo tocado (Mongo local: `docker compose up -d mongo`). Gate de web: `pnpm run check` + `(cd apps/web && pnpm run build)`.

## Test Coverage Matrix

| AC | Camada | Teste |
| --- | --- | --- |
| PRZ-01.1–3 (criar, protocolar, perdido) | e2e | `apps/api/src/modules/pericia/prazo.router.e2e.test.ts` |
| PRZ-01.4 (prazo do laudo) | unit | `apps/api/src/modules/pericia/pericia.service.unit.test.ts` |
| PRZ-01.5 (próximo prazo, 15 dias) | e2e | `apps/api/src/modules/pericia/prazo.router.e2e.test.ts` (listagem + stats) |
| PRZ-01.6 (calendário) | e2e + web unit | `GET /pericias/prazos` em `prazo.router.e2e.test.ts`; `apps/web/src/routes/_private/agenda/@components/month-view.unit.test.tsx` |
| Excluir perícia exclui prazos | e2e | `prazo.router.e2e.test.ts` |
| PRZ-02.1–5 (parcelas, status, estorno, saldo, fluxo) | e2e | `apps/api/src/modules/financeiro/lancamento.router.e2e.test.ts` |
| AD-111 (sem excluir, valor fixado atualiza) | e2e + unit | `lancamento.router.e2e.test.ts`, `lancamento.service.unit.test.ts` |
| PRZ-03.1–4 (feed iCal) | unit + e2e | `apps/api/src/modules/agenda/feed.service.unit.test.ts`, `feed.router.e2e.test.ts` |
| PRZ-04.1–3 (aviso) + AD-110 | unit | `apps/api/src/modules/agenda/avisoPrazo.service.unit.test.ts` |
| Preferência e token do feed | e2e | `preferences.router.e2e.test.ts`, `account.router.e2e.test.ts` |

## Fase 1 — Prazo (PRZ-01)

- [ ] **T1** Contrato e model: `packages/contracts/src/schemas/prazo.schema.ts`, `packages/db/src/models/prazo.model.ts` (+ export e `syncIndexes`); `prazoLaudo` sai de `updatePericiaSchema` e do model `Pericia`; `COMPROMISSO_TIPOS` perde `prazo`.
- [ ] **T2** API `pericia/prazo.*` (router/controller/service/repository/schema), rotas montadas em `pericia.router.ts`; `createPericia` cria "Entrega do laudo"; `deletePericia` apaga prazos; `listPericias` traz `proximoPrazo`; `stats` por prazos (15 dias); `findResumosByIds`. Remove `pericia:created`, `agenda.subscriber.ts`, `criarPrazoDoLaudo`. Testes unit + e2e.
- [ ] **T3** Web: `query/prazo.ts`, `components/prazo-labels.ts`, painel de prazos no detalhe, coluna "Próximo prazo" na listagem, formulário sem prazo do laudo na edição.
- [ ] **T4** Web agenda: prazos no mês/semana/dia, `PrazoDetail`, filtro sem `prazo`.

## Fase 2 — Recebimentos (PRZ-02)

- [ ] **T5** Contrato e model: `parcelas`, status `parcial`, schema `createParcelaSchema`, remove `honorarios_parciais`.
- [ ] **T6** API: rotas de parcela, regras de receita (sem excluir/cancelar, status derivado, valor ≥ recebido), resumo/fluxo pelas parcelas, `lancarHonorariosFixados` atualiza o existente. Testes unit + e2e.
- [ ] **T7** Web financeiro: recebido/saldo/parcial, diálogo de recebimento, histórico com estorno, sem cancelar receita.

## Fase 3 — Feed e aviso (PRZ-03, PRZ-04)

- [ ] **T8** Identity: `calendarFeedTokenHash`, rotas `/me/calendar-feed`, preferência `avisoPrazoEmail`, `findFeedOwner`, `listDestinatariosAvisoPrazo`. Testes e2e.
- [ ] **T9** Agenda: `feed.service` (.ics) + rota pública com rate limit. Testes unit + e2e.
- [ ] **T10** Agenda: `avisoPrazo.service` + agendamento em `server.ts` (`buildMailProvider` compartilhado). Testes unit.
- [ ] **T11** Web conta: seção "Avisos e calendário".

## Fase 4 — Fechamento

- [ ] **T12** Seed de demonstração no modelo novo (AD-112); `apps/api/CLAUDE.md` (grafo, eventos, ownership) e `tests/structural/module-boundary.structural.test.ts` (`DB_OWNERSHIP`).
- [ ] **T13** Verificação completa (`pnpm run check`, `pnpm vitest run` com Mongo, build do web) e validação independente (`validation.md`).
