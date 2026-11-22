# Automação Datajud — Tasks

Gate de cada fase: `pnpm run check`, `(cd apps/web && pnpm run build)`, registro, commit, push.

## Fase 0 — Descoberta e documentação

- [x] T0.1 Consultas reais ao Datajud; fixtures em `fixtures/` (TRT24 completo e em lote, TRT2 parcial e recusado).
- [x] T0.2 `spec.md`, `design.md`, `tasks.md`; ADs AD-267 a AD-271.
- [ ] T0.3 Fixtures de TJ e TRF — TRF3 gravado em 2026-11-22 (`fixtures/trf3-process-alvara.json`, alvará com o mesmo movimento 60 + complemento 73); TJ (TJMS 504, TJSP 429) ainda indisponível.
- [ ] T0.4 Gatilho do alvará ("expedição de alvará eletrônico automatizado"): texto e origem com o usuário.

## Fase 3 — Módulo premium

- [x] T3.1 `Tenant.automationUntil`, `billing.automationSubscriptionId`; contrato do plano do módulo (preço do usuário).
- [x] T3.2 Assinatura e webhook (plano da mesma assinatura, AD-275), flag na sessão; `requireAutomation` vai para a Fase 4 (AD-276).
- [x] T3.3 Oferta na Central, no serviço e no `/billing`; `automation_expiring` no `reminders_sweep`.

## Fase 4 — Acompanhamento no tribunal (porta: fixtures de TJ/TRF ou "só TRT" confirmado)

- [x] T4.1 Cliente Datajud no worker (plano anterior, seção 6), `courtUnitFromNumber` no contrato.
- [x] T4.2 `CourtProcess`, `CaseCourtSync`, `court_refresh`, `court_refresh_batch`, `notice` `court_movement`.
- [x] T4.3 `GET /automation/cases/:id/court-process` (o status vem da sessão, sem rota própria); seção "No tribunal".

## Fase 5 — Sugestões de serviço

- [x] T5.1 Regras de status e fase; `accept`/`reject` pelo `caseService`; aba "Para aprovar"; sugestões no serviço.

## Fase 6 — Sugestões financeiras e de prazos, qualidade

- [ ] T6.1 `payment_in_progress`, `notifications_cancel`, aviso de revisar prazos na suspensão.
- [ ] T6.2 Regra do alvará (desligada até a confirmação do gatilho).
- [ ] T6.3 Métricas de aceite e rejeição por regra em `ops/grafana`.
