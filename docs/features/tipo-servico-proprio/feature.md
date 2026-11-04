---
feature: Tipo de serviço próprio
slug: tipo-servico-proprio
descricao: Tipo de serviço criado pelo escritório com contratante, atuação e status digitados, data de entrega e pagamento no cadastro
data: 2026-11-03
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-176]
spec: [.specs/features/tipo-servico-proprio]
branches: [main]
---

# Tipo de serviço próprio

**Status**: concluido · **Atualizado**: 2026-11-03 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='tipo-servico-proprio'`.

## O que foi feito

- No cadastro com tipo do escritório ("Cadastrar novo" ou um já criado), a seção do processo vira **Dados do contratante**: nome/razão social (obrigatório no formulário), CPF/CNPJ, telefone, e-mail e endereço. Somem número do processo, tribunal, vara, comarca, data da perícia, partes e honorário proposto.
- **Atuação** e **status** abertos: escolher entre Perito do juízo/Assistente técnico ou as atuações já digitadas, ou cadastrar nova; status entre os já usados no tipo, Concluído, Cancelado ou cadastrar novo. Só Concluído e Cancelado encerram o serviço.
- "Data da contratação" e "Data de entrega" no lugar de "Data da nomeação" e "Prazo do laudo"; a data de entrega vira o prazo **Entrega do serviço** (agenda e aviso diário).
- Honorário contratado e **pagamento recebido** (Não, Sim, Parcial), valor recebido (no Sim repete o honorário) e data da quitação no cadastro, para quem lança no financeiro. Viram a receita do honorário e o recebimento nela.
- Detalhe, lista de serviços, PDF da ficha e escolha do serviço no laudo mostram contratante, atuação e status digitados.

## Por que

Pedido da perita (2026-11-03): serviços contratados direto por um cliente não têm processo, nomeação nem os status da rotina judicial. As escolhas foram dela (ver `spec.md`, "Assumptions").

Não desfazer sem ler: atuação e status digitados são `role: 'other'` + `roleName` e `status: 'custom'` + `statusName`, só no `courtType: 'other'`; o contratante é campo do serviço, fora do cadastro de partes; a API aceita o tipo próprio sem contratante porque PDF e planilha o criam assim (AD-176).

## Como

### `packages/contracts`

- `packages/contracts/src/schemas/case.schema.ts` — `CASE_ROLES`/`JUDICIAL_CASE_ROLES`, `CASE_STATUS` com `custom`, `OWN_TYPE_STATUSES`, `caseContractorSchema`, `casePaymentSchema`, `validServiceType` (tipo × campos), `validContractor`.

### `packages/db`

- `packages/db/src/models/case.model.ts` — `roleName`, `statusName`, `contractor`.

### `apps/api`

- `apps/api/src/modules/case/case.service.ts` — validação com o resultado final, limpeza ao virar judicial, prazo "Entrega do serviço" (`SERVICE_DELIVERY_DEADLINE`), `postFees` (categoria contratada e recebimento).
- `apps/api/src/modules/case/case.repository.ts` — `listServiceTypes` com `roleName` e `statuses`.
- `apps/api/src/modules/case/case.controller.ts` — pagamento no cadastro só com `finance:create` (403).
- `apps/api/src/modules/finance/transaction.service.ts` — `postFixedFees` lança o recebimento.
- `apps/api/src/modules/documents/documents.templates.ts` — contratante, atuação e status digitados na ficha.

### `apps/web`

- `apps/web/src/routes/_private/expert-cases/@components/case-form-fields.tsx` — seções do tipo próprio.
- `apps/web/src/routes/_private/expert-cases/@components/{service-type-field,case-status-field,open-choice-field,case-payment-fields}.tsx`.
- `apps/web/src/components/case-labels.ts` — `caseStatusLabel(status, statusName)`, `caseRoleLabel(role, roleName)`.
- `apps/web/src/routes/_private/expert-cases/details/@components/case-details-view.tsx` — grupo "Dados do contratante".

## Como testar

- `pnpm vitest run apps/api/src/modules/case/service.router.e2e.test.ts` — tipo próprio: atuação e status digitados, entrega, pagamento e 403 sem financeiro.
- Na tela: Serviços → Novo → Tipo de serviço "Cadastrar novo"; conferir Dados do contratante, atuação e status abertos, datas e pagamento.

## Pendências

- Conferência visual no navegador pela perita.
- Pagamento só no cadastro; depois, recebimento pelo painel Financeiro do serviço.

## Histórico

- 2026-11-03 — O tipo próprio deixa de ser `courtType: 'other'`: passa a ser nome de tipo ou Parceria (`isOwnType`), com esfera própria; ver `esfera-servico` (AD-177). "Serviços em aberto" passa a contar o status digitado.

- 2026-11-03 — Correção: ao escolher "Cadastrar novo" o campo "Nome do novo tipo" sumia (a troca de layout do formulário remontava o campo e perdia o estado) e o serviço não salvava, com o erro escondido. O estado passa a viver em `case-form-fields.tsx`. Campos obrigatórios ganham asterisco vermelho (`required` em `FormLabel`, `packages/ui/src/components/form.tsx`, e nos campos de `apps/web/src/components/form-fields.tsx`): tipo de serviço, nome do novo tipo, atuação, status e os nomes digitados, nome/razão social, objeto, número do processo e tribunal (judiciais), valor recebido e data da quitação.

- 2026-11-03 — Implementado TSP-01 a TSP-07 (AD-176). Divergência da spec: o contratante é obrigatório só no formulário de cadastro, não na API, porque a importação por PDF e planilha cria o tipo próprio sem ele.
