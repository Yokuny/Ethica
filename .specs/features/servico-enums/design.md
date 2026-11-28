# Tipo e fase do serviço só em enums — Design

- `packages/contracts/src/schemas/case.schema.ts`: `SERVICE_TYPES`; `casePhases(serviceType)`; listas
  `CASE_PHASE_GROUPS` (+ `finished` no grupo de recebimento), `TECHNICAL_ASSISTANCE_PHASES` (`hired`, `finished`),
  `OWN_SERVICE_PHASES`; `CASE_PHASES` é a união; `usesContractor` = tudo menos perícia; saem `CASE_ROLES`,
  `isOwnType`, `OWN_TYPE_PHASES`, `custom`, `roleName`, `phaseName`.
- `packages/db/src/models/case.model.ts`: `serviceType` enum obrigatório; `migrateCases` passa a fazer só a conversão
  da SEN-05 (as conversões antigas saem: produção já estava no formato anterior a esta).
- API: `case.service` sem os campos do tipo próprio; `case.repository` filtra `serviceType $in` e agrupa por
  `serviceType`; sai `listServiceTypes`. Automação, laudos, worker e importação leem `serviceType`.
- Web: `case-labels.ts` com `SERVICE_TYPE_ITEMS`; campo de tipo vira select simples; fase vira select da lista do tipo;
  saem `open-choice-field` e os campos de atuação.
- Decisão: AD-310 (supersede o tipo/atuação/fase digitados de AD-158, AD-176, AD-177, AD-178, AD-199, AD-200 e a
  fase `assistance_closed` da AD-305).
