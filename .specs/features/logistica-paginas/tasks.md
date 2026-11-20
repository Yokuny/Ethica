# Logística em páginas por intenção — Tasks

- [x] T1 Hub `/field`, intervalo de datas (`RangeNav`, `use-field-range`), `/field/map`, `/field/route`, `/field/inspections` e o registro movido para `/field/inspections/details`; links atualizados. (LOG-01 a LOG-05) — gate: `pnpm run check && (cd apps/web && pnpm run build)`
- [x] T2 `GET /documents/inspections/:appointmentId` com e2e. (LOG-07) — gate: `pnpm vitest run --project e2e apps/api/src/modules/documents`
- [x] T3 Aba Observações com assinaturas e pré-visualização do PDF; coleta sai de Presentes. (LOG-06, LOG-07) — gate: `pnpm run check && (cd apps/web && pnpm run build)`
- [ ] T4 Conferência na tela, `feature.md`, roadmap, `pnpm docs:sync`.
