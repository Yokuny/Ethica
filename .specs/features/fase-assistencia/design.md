# Fases da Assistência técnica — Design

- `packages/contracts/src/schemas/case.schema.ts`: `TECHNICAL_ASSISTANCE_PHASES` (lista da assistência, reusa `fees_received`); `CASE_PHASES` passa a incluir as novas; `casePhases(data)` devolve as fases permitidas pelo tipo (perícia: grupos; assistência: a lista; tipo do escritório: `custom` + `OWN_TYPE_PHASES`) e `validServiceType` recusa fase fora dela; `defaultPhase(data)`; `CASE_CLOSED_PHASES` ganha `assistance_settlement`.
- `packages/db/src/models/case.model.ts`: `migrateCases` leva assistência (sem `serviceType`) com fase fora da lista para `assistance_hired`.
- `apps/api`: `case.service.createCase` grava `defaultPhase` quando a fase não veio; `case.repository` `DELIVERED` ganha a assistência de `technical_opinion_delivered` até `fees_received`; `report.service.fileDelivery` usa a fase de entrega do tipo; `import.service.rowToCase` descarta a fase que não serve; `document.layout.ts` rótulos.
- `apps/web`: `case-labels.ts` rótulos + `TECHNICAL_ASSISTANCE_PHASE_ITEMS`; `case-phase-field.tsx` lista simples na assistência; `service-type-field.tsx` troca a fase pelo `defaultPhase`; filtro com todas as fases; gráfico com a barra "Assistência técnica".
- Sem coleção ou campo novo: a fase continua `Case.phase` (AD-178).
