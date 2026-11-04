# Fase e status do serviço — Design

Decisão: AD-178 (supersede AD-166 no status e AD-177 na esfera e na parceria).

- `Case.phase` (`CASE_PHASES`, `packages/contracts/src/schemas/case.schema.ts`) com `CASE_PHASE_GROUPS` para a lista por grupos; `custom` + `phaseName` só no tipo do escritório (antes `status: 'custom'` + `statusName`).
- `Case.status` passa a ser `active | suspended | canceled`.
- Encerrado: `status: canceled` ou `phase` em `CASE_CLOSED_PHASES` (perdas + `fees_received`). Parado só com `status: active` e fase aberta.
- `courtType` = esfera `labor | civil | federal`, opcional, exigida só na perícia (`role: court_expert` sem `serviceType`). `extrajudicial` e `partnership` saem.
- Formulário de contratante = `usesContractor` (tipo do escritório ou assistência técnica); substitui `isOwnType` onde o efeito é o formulário.
- Conversão na subida (`migrateCases`): `extrajudicial` → sem esfera; `partnership` → `serviceType: 'Parceria'`, `role: other`, `roleName: 'Parceria'`; status antigo → fase + status:

| Antigo | Fase | Status |
| --- | --- | --- |
| appointed, fees_proposed, fees_accepted | awaiting_scheduling | active |
| inspection_scheduled | awaiting_inspection | active |
| drafting_report | awaiting_expert_report | active |
| report_delivered | report_delivered | active |
| clarifications | objection_reply_1 | active |
| awaiting_payment | evidence_closed | active |
| completed | fees_received | active |
| suspended | awaiting_scheduling | suspended |
| declined | awaiting_scheduling | canceled |
| custom (+ statusName) | custom (+ phaseName) | active |

- Concluir o laudo com a entrega leva a fase para `report_delivered` quando ela ainda é anterior (fase inicial ou aguardando/revisar laudo).
- Gráfico do início: serviços por grupo de fase.
