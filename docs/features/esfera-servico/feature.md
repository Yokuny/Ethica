---
feature: Esfera e tipo de serviço
slug: esfera-servico
descricao: Esfera separada do tipo de serviço (perícia, assistência técnica, parceria, tipos do escritório), filtros e data apagável
data: 2026-11-03
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-177]
spec: [.specs/features/esfera-servico]
branches: [main]
---

# Esfera e tipo de serviço

**Status**: concluido · **Atualizado**: 2026-11-03 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='esfera-servico'`.

## O que foi feito

- Cadastro com **Esfera** (Trabalhista, Civil, Federal, Extrajudicial; obrigatória) e **Tipo de serviço** (Perícia, Assistência técnica, Parceria, tipos do escritório, Cadastrar novo). Parceria usa o formulário do tipo novo.
- Lista e detalhe mostram "Tipo · Esfera" (ex.: "Parceria · Extrajudicial").
- Filtros da lista: Status, Esfera, Tipo de serviço (inclui os tipos do escritório) e Período de entrega, com aviso de que a data usada é a de entrega.
- "Limpar data" em todo campo de data preenchido; na edição, a data apagada some do serviço.
- "Serviços em aberto" conta o status digitado nos tipos próprios.

## Por que

Pedido da perita (2026-11-03); escolhas dela em `.specs/features/esfera-servico/spec.md`. Não desfazer sem ler a AD-177: `courtType` é a esfera e não diz mais se o tipo é próprio — quem diz é `isOwnType`.

## Como

### `packages/contracts`

- `packages/contracts/src/schemas/case.schema.ts` — `COURTTYPES` com `extrajudicial`, `CASE_ROLES` com `partnership`, `isOwnType`, `validServiceType`, `updateCaseSchema` com `null` para apagar.

### `packages/db`

- `packages/db/src/models/case.model.ts` — `migrateCases` (antes `migrateCaseStatus`) converte `courtType: 'other'`.

### `apps/api`

- `apps/api/src/modules/case/case.service.ts` — edição com `null`, filtro de período pelos prazos de entrega.
- `apps/api/src/modules/case/case.repository.ts` — filtros `role`/`serviceType`/ids; `OPEN` com `custom`.
- `apps/api/src/modules/case/deadline.repository.ts` — `caseIdsDueBetween`.
- `apps/api/src/modules/case/import.service.ts` — "Parceria" na planilha; tipo do escritório importado como Extrajudicial.

### `apps/web`

- `apps/web/src/routes/_private/expert-cases/@components/service-type-field.tsx` — Esfera e Tipo.
- `apps/web/src/routes/_private/expert-cases/@components/cases-filters.tsx` — filtros.
- `apps/web/src/components/date-picker.tsx` — "Limpar data".
- `apps/web/src/routes/_private/expert-cases/details/@hooks/use-case-edit-form.ts` — `null` no que foi apagado.

## Como testar

```
pnpm vitest run apps/api/src/modules/case/service.router.e2e.test.ts packages/db/src/models/case.model.int.test.ts
```

- Na tela: Serviços → Adicionar → Tipo "Parceria", Esfera "Extrajudicial", salvar; na lista, Filtros → Tipo "Parceria" e Período de entrega.

## Pendências

- Apagar a data da perícia na edição não remove o compromisso da agenda.

## Histórico

- 2026-11-03 — Implementado ESF-01 a ESF-05 (AD-177). Conferido no navegador: cadastro de Parceria extrajudicial, "Limpar data" e filtros. Corrigido junto: "Serviços em aberto" não contava o status digitado (AD-176).
