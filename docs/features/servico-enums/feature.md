---
feature: Tipo e fase do serviço em enums
slug: servico-enums
descricao: Tipo de serviço e fase só como enums em inglês, Finalizado igual em todos os tipos e filtro de tipo com um parâmetro só
data: 2026-11-27
status: concluido
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-310]
spec: [.specs/features/servico-enums]
branches: [main]
---

# Tipo e fase do serviço em enums

**Status**: concluido · **Atualizado**: 2026-11-27 · **Áreas**: `apps/api`, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md` (congelado), o código é a fonte da verdade.
> Correlação com o git: `git log --oneline -i --grep='servico-enums'`.

## O que foi feito

- **Tipo de serviço** é sempre um de quatro: Perícia, Assistência técnica, Parceria e Serviço particular. Saiu o "Cadastrar novo" (tipo com nome digitado) e a Atuação digitada.
- **Fase** é sempre da lista do tipo: perícia em grupos, assistência com a lista própria, e Parceria e Serviço particular com Contratado, Em andamento, Entregue, Honorários recebidos e Finalizado. Saiu a fase digitada.
- **Finalizado** é a mesma fase em todos os tipos e encerra o serviço: o filtro pronto "Serviços finalizados", a Situação e os números da tela passam a contar as Parcerias finalizadas.
- Filtro "Tipo de serviço" da lista: um parâmetro só na URL e na API (`serviceType`).
- Área do modelo de laudo: as esferas da perícia e os outros três tipos.
- Planilha: "Parceria" é reconhecida; outro nome de tipo vira Serviço particular e o nome vira o objeto; "Finalizado", "Concluído" e "Encerrado" viram Finalizado.

## Por que

O filtro "Serviços finalizados" escondia metade dos finalizados (as Parcerias com fase digitada), e o filtro de tipo
gerava `role` ou `serviceType` conforme o tipo. Pedido do usuário: normalizar agora, em MVP, com poucos enums em
inglês e a tradução só na tela (AD-310).

## Como

- `packages/contracts/src/schemas/case.schema.ts` — `SERVICE_TYPES`, `casePhases`, `defaultPhase`, `OWN_SERVICE_PHASES`, `CASE_CLOSED_PHASES`, `usesContractor`, `validServiceType`.
- `packages/db/src/models/case.model.ts` — `serviceType` enum obrigatório; `migrateCases` converte o formato anterior (de/para do texto digitado).
- `apps/api/src/modules/case/case.repository.ts` — filtro `serviceType $in`, ordem por tipo e dashboard agrupados direto pelo enum.
- `apps/web/src/components/case-labels.ts` — `SERVICE_TYPE_ITEMS`, `serviceTypeLabel`, `OWN_SERVICE_PHASE_ITEMS`; campos em `apps/web/src/routes/_private/expert-cases/@components/{service-type-field,case-phase-field}.tsx`.

## Como testar

```
pnpm vitest run packages/db/src/models/case.model.int.test.ts apps/api/src/modules/case/service.router.e2e.test.ts
```

- UAT: Serviços → "…" → Filtros prontos → "Serviços finalizados" mostra as Parcerias e as Assistências finalizadas.

## Pendências

- [ ] Conferir na tela (o login local pede passkey): cadastro com os quatro tipos, fase por tipo e o filtro pronto.

## Histórico

- 2026-11-27 — Criada (AD-310). Produção: backup de `cases` e `templates` antes do envio; os 19 serviços convertidos na subida da API.
