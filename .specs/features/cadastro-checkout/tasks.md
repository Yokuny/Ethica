# Tasks — Cadastro com checkout

Design: `.specs/features/cadastro-checkout/design.md`.

| # | Task | Gate |
| --- | --- | --- |
| T1 | Contrato `billing.schema.ts` (planos, valores, dias, `billingPaySchema`, `BillingView`) e chaves de erro `trial_unavailable`, `billing_not_configured`, `billing_unavailable` | `pnpm vitest run packages/contracts` |
| T2 | `Tenant.accessUntil` + `Tenant.billing`, `isTenantOpen`/`openTenantFilter`; leitores (sessão, feed, aviso diário) usam a regra única | `pnpm vitest run apps/api/src/middlewares apps/api/src/modules/identity packages/db` |
| T3 | `providers/asaasClient.ts` + env `ASAAS_*` + injeção em `buildApp` | unit do cliente com `fetch` simulado |
| T4 | `identity/billing.*`: `GET /billing`, `POST /billing/pay`, `POST /billing/webhook`; `validSession`; `signup` sem acesso | e2e `billing.router.e2e.test.ts` com Asaas simulado |
| T5 | Web: "Criar conta" em `/auth`; `/suspended` com planos e Pagar; textos no dicionário | `pnpm vitest run apps/web` + `(cd apps/web && pnpm run build)` |
| T6 | Registro: `feature.md`, AD-230 ativa, `validation.md` | `pnpm docs:check` + `pnpm run check` |
