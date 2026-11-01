---
feature: Nomes de código em inglês
slug: english-naming
descricao: Todo nome definido no código (campo, model, collection, módulo, arquivo, parâmetro, evento, comentário) em inglês, com um termo por conceito
data: 2026-11-01
status: concluido
areas: [apps/api, apps/web, packages/contracts, packages/db, tests, docs]
decisoes: [AD-113, AD-138, AD-139, AD-140, AD-141, AD-142]
spec: [.specs/features/english-naming]
branches: [refactor/english-naming]
---

# Nomes de código em inglês

**Status**: concluido · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `tests`, `docs`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), o código é a fonte da
> verdade. Correlação com o git: `git log --oneline -i --grep='english-naming'`.

## O que foi feito

- Models e collections em inglês: `Case`, `Deadline`, `Party`, `Appointment`, `Inspection`, `Transaction`, `Report`, `Template`, `Opportunity`, `Activity`; campos, payloads HTTP, parâmetros de URL (`?state=`, `?kind=`, `?months=`, `?caseId=`) e eventos (`case:fixed_fees`, `case:deleted`) idem.
- Módulos da API `case`, `agenda`, `finance`, `documents`, `prospecting`, `identity`; arquivos, schemas, tipos, hooks, componentes e chaves de query do web e do contrato em inglês.
- Comentários do código em inglês. O que o usuário lê continua em pt-BR (tela por `t()`, e-mail, iCal, PDF, Word, cabeçalhos de CSV, marcadores do laudo).
- Índices de busca `case_text`/`party_text`, prefixo do S3 `tenants/<id>/inspections/…` e chaves do IndexedDB (`day:`, `record:`, `draft:`, `media:`) em inglês.

## Por que

O código ficou bilíngue depois da AD-113 (valores em inglês) e da AD-138 (rotas em inglês): a rota
era `/expert-cases`, o model `Pericia` e o campo `numeroProcesso`. Um termo por conceito, igual em
todas as camadas, elimina a tradução de cabeça. O glossário curto (AD-140) foi escolha do usuário;
`nomination` em vez de `appointment` para a nomeação evita colidir com o model `Appointment`, e a
perícia como variável é `legalCase` porque `case` é palavra reservada. Rotas (AD-138) e valores
gravados (AD-113) não mudaram, por isso `Case` convive com `/expert-cases` e `Transaction` com
`/finance/entries`.

## Como

### `apps/api`

- `apps/api/src/modules/{case,agenda,finance,documents,prospecting,identity}/` — módulos renomeados; dono de cada model em `tests/structural/module-boundary.structural.test.ts` (`DB_OWNERSHIP`) e em `apps/api/CLAUDE.md`.
- `apps/api/src/providers/datajudClient.ts` — continua lendo os campos em português da resposta do CNJ e devolve `DatajudProcess` em inglês.
- `apps/api/src/modules/case/import.service.ts` — colunas do CSV em português ligadas aos campos em inglês (`['vara', 'division']`).

### `apps/web`

- Arquivos, hooks, componentes, chaves de query e parâmetros de busca em inglês; `apps/web/src/lib/helpers/translate.helper.ts` segue o glossário (`court` = "Tribunal", `court_header` = "Juízo").

### `packages/contracts` e `packages/db`

- `packages/contracts/src/schemas/*.schema.ts` e `packages/db/src/models/*.model.ts` com os nomes do glossário; `hasPermission()` (antes `pode`) em `packages/contracts/src/schemas/permission.schema.ts`.

## Como testar

```
pnpm run check
(cd apps/web && pnpm run build)
docker compose exec api /app/node_modules/.bin/tsx scripts/provision-search-indexes.ts
docker compose exec api /app/node_modules/.bin/tsx scripts/seed-demo.ts
```

- UAT: entrar com `admin@`, `manager@` e `operator@pericias.example.com`, no desktop e no celular, e abrir todas as telas (início, perícias, partes, agenda, campo, laudos e modelos, financeiro, prospecção, relatórios, conta, usuários, escritório, diário). Nenhum erro de console ou de API; gestor e operador voltam ao início nas telas que a matriz não libera.

## Pendências

- [ ] Banco local antigo: collections com nome em português ficam órfãs até `docker compose down -v` (AD-141).

## Histórico

- 2026-11-01 — Implementado em oito fatias (AD-139 a AD-142); validação em `.specs/features/english-naming/validation.md`. Ajustes durante a execução: `data` → `date` (movimentações, parcelas) e `local` → `location` feitos à mão; `presente` do agente da vistoria virou `present`, não `attendee`; `pode` virou `hasPermission` (colidia com o `can` do middleware e do web); a chave `track_each_expert_case_from_appointment_to_report` do início já estava desencontrada e foi corrigida no UAT; o breadcrumb das telas de detalhe mostrava a pasta crua (`expert-cases`) desde a AD-138 e agora traduz o segmento em snake_case (`apps/web/src/components/page-card.tsx`).
- 2026-11-01 — Spec criada (`.specs/features/english-naming/spec.md`).

## Referências

- Spec/design/tasks/validação (congelados): `.specs/features/english-naming/`
