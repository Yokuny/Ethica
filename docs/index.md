<!-- GERADO por scripts/docs/sync-docs.mjs — não edite à mão. Rode `pnpm docs:sync`. -->

# Gateway de documentação — Ethica

Ponto de entrada obrigatório antes de qualquer tarefa (protocolo em [`AGENTS.md`](../AGENTS.md)).
Cada feature tem **um** registro vivo em `docs/features/<slug>/feature.md`; spec, design, tasks,
validação e planos (congelados) ficam em `.specs/features/<slug>/`. Decisões: `.specs/STATE.md`.

## Em andamento

- [`fundacao-ethica`](features/fundacao-ethica/feature.md) — **parcial** — Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção

## Planos não arquivados (`.specs/plans/`)

_Nenhum._

## Features (9)

| Feature | O que faz | Status | Atualizado | Áreas | Spec | Planos |
| --- | --- | --- | --- | --- | --- | --- |
| [Campo e vistorias](features/campo-vistorias/feature.md) | Rota de campo no celular com registro de vistoria, fotos, áudio e assinatura offline, mapa do dia, aviso às partes e campo no laudo | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/campo-vistorias) | — |
| [Base de documentos](features/documentos-pdf/feature.md) | Identidade do escritório, dados profissionais, PDFs (ficha, checklist, prazos, financeiro, paradas) e exportação ZIP | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `infra` | [spec](../.specs/features/documentos-pdf) | — |
| [Nomes de código em inglês](features/english-naming/feature.md) | Todo nome definido no código (campo, model, collection, módulo, arquivo, parâmetro, evento, comentário) em inglês, com um termo por conceito | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `tests` `docs` | [spec](../.specs/features/english-naming) | — |
| [Fundação do Ethica](features/fundacao-ethica/feature.md) | Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção | parcial | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `packages/ui` `harness` `docs` `infra` `tests` | [spec](../.specs/features/fundacao-ethica) | 1 |
| [Gestão do escritório](features/gestao-escritorio/feature.md) | Matriz de permissões por membro, diário de bordo, fase e situação da perícia, honorário do assistente técnico e início configurável | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` `harness` | [spec](../.specs/features/gestao-escritorio) | — |
| [Importação de processos](features/importacao-processos/feature.md) | Cadastro de perícia a partir do PDF da ata, importação em lote por CSV, partes e advogados reutilizáveis e dados trabalhistas | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/importacao-processos) | — |
| [Laudo automatizado](features/laudos/feature.md) | Modelos de laudo por seções sim/não com variáveis do processo, parecer técnico e exportação em PDF e Word | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/laudos) | — |
| [Prazos e recebimentos](features/prazos-recebimentos/feature.md) | Vários prazos por perícia com protocolo, recebimento parcial de honorários, feed iCal e aviso de prazo por e-mail | concluido | 2026-11-01 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/prazos-recebimentos) | — |
| [Benchmark da Jusperia](features/benchmark-jusperia/feature.md) | Engenharia reversa funcional do app da Jusperia (concorrente) e gap analysis contra o Ethica, com priorização em ondas | concluido | 2026-10-31 | `docs` | [spec](../.specs/features/benchmark-jusperia) | 1 |

## Por área

- **`apps/api`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md)
- **`apps/web`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md)
- **`docs`** — [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [benchmark-jusperia](features/benchmark-jusperia/feature.md)
- **`harness`** — [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md)
- **`infra`** — [documentos-pdf](features/documentos-pdf/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/contracts`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md)
- **`packages/db`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md), [gestao-escritorio](features/gestao-escritorio/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md)
- **`packages/ui`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`tests`** — [english-naming](features/english-naming/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)

## Decisões recentes

Últimas 10 de [`.specs/STATE.md`](../.specs/STATE.md#decisions) (ADRs longos em [`docs/adr/`](adr/README.md)).

- **AD-142** (2026-11-01, active) — A padronização sai num PR único (`refactor/english-naming`), com um commit por fatia de domínio, cada uma atravessando db, contrato, API e w
- **AD-141** (2026-11-01, active) — Renomear collections, campos, índices de busca e prefixo do S3 sem migração: o banco local é recriado com `pnpm --filter api run seed:demo`
- **AD-140** (2026-11-01, active) — Glossário único de tradução (variante curta), aplicado igual em todas as camadas: perícia `Case`, número do processo `processNumber`, laudo
- **AD-139** (2026-11-01, active) — A padronização em inglês (`english-naming`) cobre todo nome definido no código: campos de model, de contrato, de payload HTTP e de evento; p
- **AD-138** (2026-11-01, active (nomes de campo, collections e pastas de módulo superseded by AD-139)) — Todo nome que vira URL ou valor gravado é inglês, traduzido no web: as pastas de rota do `apps/web` (`/expert-cases`, `/parties`, `/agenda`,
- **AD-137** (2026-11-01, active) — Aceita a AD-108 com a forma: matriz de permissões por membro (`User.permissoes` e `Invite.permissoes`: módulo → ações), com módulos `pericia
- **AD-136** (2026-11-01, active) — O início é configurável por usuário: a preferência `preferences.blocosOcultos` (lista de chaves de `HOME_BLOCOS` em `packages/contracts/src/
- **AD-135** (2026-11-01, active) — Na perícia em que o escritório é assistente técnico (`papel: technical_assistant`), o contratante é uma das partes ou advogados já ligados à
- **AD-134** (2026-11-01, active) — Diário de bordo é a collection `Atividade` do módulo `identity` (dono, junto do tenant e dos usuários): quem (id e nome gravado), quando, mó
- **AD-133** (2026-11-01, active) — A perícia mantém as 8 etapas (`PERICIA_STATUS`) e ganha uma fase detalhada opcional (`fase`) de lista fixa agrupada por etapa (`PERICIA_FASE

## `.specs/` sem registro em `docs/features/`

- `.specs/features/prospeccao-datajud/`

## Outros documentos

- [Arquitetura](architecture.md) · [Glossário](glossary.md) · [Roadmap](roadmap.md) · [Posicionamento](positioning.md) · [ADRs](adr/README.md)
- Produto: [`PRODUCT.md`](../PRODUCT.md) · Operação local: [`RUN_BOOK.md`](../RUN_BOOK.md)
- Template de registro: [`docs/templates/feature-doc.md`](templates/feature-doc.md)
