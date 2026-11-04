# Tipo de serviço próprio — Design

Decisão: AD-176. Base: AD-158 (tipo do escritório = `courtType: 'other'` + `serviceType`), AD-166 (status único), AD-109 (prazo de entrega), AD-135/AD-111 (honorário contratado e recebimentos).

## Modelo

| Campo | Onde | Regra |
| --- | --- | --- |
| `role: 'other'` + `roleName` | `CASE_ROLES`, `Case` | Atuação digitada; só em `courtType: 'other'`. |
| `status: 'custom'` + `statusName` | `CASE_STATUS`, `Case` | Status digitado; só em `courtType: 'other'`; conta como em aberto (não está em `CASE_CLOSED_STATUSES`/`CASE_IDLE_STATUSES`). Concluído e Cancelado continuam `completed`/`declined`. |
| `contractor { name, document?, phone?, email?, address? }` | `Case` | Só em `courtType: 'other'`; obrigatório (nome) no cadastro desse tipo. Não entra no cadastro de partes (AD-117): é dado do serviço. |
| `fixedFeesCents` no cadastro | `createCaseSchema` | Honorário contratado já no cadastro. |
| `payment { amountCents, date }` | `createCaseSchema` (só cadastro) | Exige honorário e valor ≤ honorário; vira recebimento na receita do honorário. Só quem cria no financeiro (`finance:create`) envia. |

A regra de consistência mora em `validOwnType` (`packages/contracts/src/schemas/case.schema.ts`), checada no refine do cadastro e no `case.service` com o resultado final da edição. Trocar para tipo judicial apaga `roleName`, `statusName` e `contractor` (como já apaga `serviceType`).

## Fluxo do cadastro

1. `case.service.createCase` valida, grava e cria o prazo de entrega com o título `Entrega do serviço` no tipo próprio (`Entrega do laudo` nos judiciais).
2. Com honorário, emite `case:fixed_fees` com a categoria `contracted_fees` (tipo próprio ou assistente técnico) e `received` quando há pagamento.
3. `finance.postFixedFees` cria a receita e, com `received`, lança o recebimento (`addInstallment`) na data da quitação.

## Listas abertas

`GET /expert-cases/service-types` passa a devolver, por tipo, `roleName` e `statuses` (status digitados já usados no tipo). A tela monta: atuações = Perito do juízo, Assistente técnico, `roleName` distintos, "Cadastrar nova"; status = `statuses` do tipo, Concluído, Cancelado, "Cadastrar novo status" (+ o status atual, se for um dos judiciais de um serviço antigo).

## Tela (`apps/web/src/routes/_private/expert-cases/@components/case-form-fields.tsx`)

Tipo próprio: seções Serviço (tipo, atuação, OS, status) → Dados do contratante → Objeto e prazos (objeto, data da contratação, data de entrega no cadastro) → Honorários (contratado; no cadastro, pagamento recebido, valor recebido e data da quitação, só para quem vê o financeiro) → Observações. Somem número/tribunal/vara/comarca, data da perícia, partes e honorário proposto.

Rótulos: `caseStatusLabel(status, statusName)` e `caseRoleLabel(role, roleName)` em `apps/web/src/components/case-labels.ts`; no servidor, `documents.templates.ts` usa `roleName`/`statusName` quando existem.
