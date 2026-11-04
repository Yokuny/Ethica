# Esfera e tipo de serviço — Design

Decisão: AD-177 (refina AD-158 e AD-176).

- `Case.courtType` passa a ser a **esfera**: `labor | civil | federal | extrajudicial` (sai `other`). Conversão na subida: `courtType: 'other'` → `extrajudicial` (`migrateCases`, `packages/db/src/models/case.model.ts`).
- O tipo: Perícia = `role: 'court_expert'`, Assistência técnica = `technical_assistant`, Parceria = `partnership` (novo em `CASE_ROLES`), tipo do escritório = `serviceType` (nome). `isOwnType` (`packages/contracts/src/schemas/case.schema.ts`) = tem nome de tipo ou é parceria; substitui `courtType === 'other'` em todo o código.
- `validServiceType`: judicial exige processo e tribunal e esfera de tribunal; parceria não leva nome de tipo.
- Edição: `null` apaga (`updateCaseSchema`): campos do tipo próprio ao virar judicial e datas apagadas na tela (`use-case-edit-form.ts` manda `null` para o que estava salvo e ficou vazio).
- Lista: `GET /expert-cases` aceita `role`, `serviceType`, `deliveryFrom`, `deliveryTo`; o período vira os ids das perícias com prazo de entrega no intervalo (`deadline.repository.caseIdsDueBetween`).
- `DatePicker` ganha "Limpar data" quando há valor.
