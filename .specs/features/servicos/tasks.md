# Serviços — Tasks

**Spec**: `.specs/features/servicos/spec.md`

Gate: `pnpm run check` + `(cd apps/web && pnpm run build)`.

- [x] **T1** Contratos e banco: `courtType: 'other'`, `serviceType`, `serviceStatus`, número/tribunal opcionais no tipo novo, `inspection` no cadastro, índice parcial; categorias de despesa + `categoryName`.
- [x] **T2** API: `case.service` (validação, evento `case:inspection_scheduled`, lista de tipos novos), subscriber da agenda, coordenada no `geocode`, lista de categorias novas no financeiro; consumidores de `processNumber` opcional. Testes.
- [x] **T3** Web: textos "Serviços", campo tipo de serviço, status do serviço, data/hora/local da perícia, painel financeiro do serviço (pagamento, despesas, líquido, lançar despesa).
- [x] **T4** Registro: `feature.md`, glossário, AD-158 a AD-160, `pnpm docs:sync`.
