# Meta de receita do ano — Tasks

1. **API e dados** (MRA-01, 02, 05): `revenueGoal` no Tenant, `PUT /tenant/office/revenue-goal`, `GET /finance/revenue-goal`, preferência `revenueGoalOnCases`; testes e2e (data efetiva, virada do ano, anuladas e despesas fora, 403). Gate: `pnpm vitest run apps/api/src/modules/finance apps/api/src/modules/identity tests/structural`.
2. **Web** (MRA-01, 03, 04): etapa no `/office`, painel no Dashboard, opção e linha em Serviços. Gate: `pnpm run check && (cd apps/web && pnpm run build)` + conferência no navegador.
3. **Registro**: `docs/features/meta-receita/feature.md`, glossário, AD-258, roadmap, `pnpm docs:sync`.
