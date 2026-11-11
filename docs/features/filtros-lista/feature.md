---
feature: Filtros das listas
slug: filtros-lista
descricao: Botão "Filtros" das listas com vários filtros vira lista de filtros com opções marcáveis, várias por filtro
data: 2026-11-11
status: concluido
areas: [apps/api, apps/web, packages/contracts]
decisoes: [AD-193, AD-218]
spec: [.specs/features/filtros-lista]
branches: [main]
---

# Filtros das listas

**Status**: concluido · **Atualizado**: 2026-11-11 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da verdade.
> Correlação com o git: `git log --oneline -i --grep='filtros-lista'`.

## O que foi feito

- Em Serviços, Varas e Diário de bordo, "Filtros" abre uma lista curta com o nome de cada filtro e, ao lado, o que
  está aplicado. Um clique no filtro mostra as opções dele (busca quando a lista é longa, marcação em cada opção e
  "Limpar") ou os campos (número de controle, período), com seta para voltar.
- Cada filtro de opções aceita várias opções: a lista traz o que bate com qualquer uma delas.
- Listas com um filtro só (Partes) seguem com o menu de um clique (AD-193).

## Por que

A coluna de seletores empilhados ficava longa e feia; a perita enviou o desenho de lista com busca e marcação e
escolheu poder marcar várias opções por filtro (AD-218).

## Como

- `apps/web/src/components/data-table.tsx` — `TableFilters` com `items` (lista → passo do filtro) ou `options`
  (filtro único); `TableFilterItem` é de opções (`items`, `value[]`, `onChange`) ou de campos (`summary`, `content`).
- Filtros de cada tela: `apps/web/src/routes/_private/expert-cases/@hooks/use-cases-filters.tsx`,
  `apps/web/src/routes/_private/court-divisions/@hooks/use-court-divisions-filters.ts`,
  `apps/web/src/routes/_private/_admin/activity-log/@hooks/use-activity-log-filters.tsx`. No endereço da tela os
  filtros são listas.
- `packages/contracts/src/schemas/query-list.schema.ts` — `queryListSchema`: a chave repete na URL e vira lista.
  Usado em `apps/api/src/modules/case/case.schema.ts`, `court-division.schema.ts` (cidades por várias UFs) e
  `packages/contracts/src/schemas/activityLog.schema.ts`; os repositórios filtram com `$in`.

## Como testar

```
pnpm vitest run packages/contracts/src/schemas/query-list.schema.unit.test.ts
```

- UAT: Serviços → Filtros → Status → marcar duas opções; a lista traz as duas e o filtro mostra "2". Varas → UF com
  duas marcadas → Cidade lista as cidades das duas.

## Pendências

- [ ] Conferir as telas no celular (não foi possível abrir o sistema local nesta sessão).

## Histórico

- 2026-11-11 — Criada: lista de filtros com opções marcáveis, várias por filtro (AD-218).
