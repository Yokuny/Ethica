<!-- GERADO por scripts/docs/sync-docs.mjs — não edite à mão. Rode `pnpm docs:sync`. -->

# Gateway de documentação — Ethica

Ponto de entrada obrigatório antes de qualquer tarefa (protocolo em [`AGENTS.md`](../AGENTS.md)).
Cada feature tem **um** registro vivo em `docs/features/<slug>/feature.md`; spec, design, tasks,
validação e planos (congelados) ficam em `.specs/features/<slug>/`. Decisões: `.specs/STATE.md`.

## Em andamento

- [`fundacao-ethica`](features/fundacao-ethica/feature.md) — **parcial** — Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção

## Planos não arquivados (`.specs/plans/`)

_Nenhum._

## Features (7)

| Feature | O que faz | Status | Atualizado | Áreas | Spec | Planos |
| --- | --- | --- | --- | --- | --- | --- |
| [Benchmark da Jusperia](features/benchmark-jusperia/feature.md) | Engenharia reversa funcional do app da Jusperia (concorrente) e gap analysis contra o Ethica, com priorização em ondas | concluido | 2026-10-31 | `docs` | [spec](../.specs/features/benchmark-jusperia) | 1 |
| [Campo e vistorias](features/campo-vistorias/feature.md) | Rota de campo no celular com registro de vistoria, fotos, áudio e assinatura offline, mapa do dia, aviso às partes e campo no laudo | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/campo-vistorias) | — |
| [Base de documentos](features/documentos-pdf/feature.md) | Identidade do escritório, dados profissionais, PDFs (ficha, checklist, prazos, financeiro, paradas) e exportação ZIP | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` `infra` | [spec](../.specs/features/documentos-pdf) | — |
| [Importação de processos](features/importacao-processos/feature.md) | Cadastro de perícia a partir do PDF da ata, importação em lote por CSV, partes e advogados reutilizáveis e dados trabalhistas | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/importacao-processos) | — |
| [Laudo automatizado](features/laudos/feature.md) | Modelos de laudo por seções sim/não com variáveis do processo, parecer técnico e exportação em PDF e Word | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/laudos) | — |
| [Prazos e recebimentos](features/prazos-recebimentos/feature.md) | Vários prazos por perícia com protocolo, recebimento parcial de honorários, feed iCal e aviso de prazo por e-mail | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/prazos-recebimentos) | — |
| [Fundação do Ethica](features/fundacao-ethica/feature.md) | Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção | parcial | 2026-10-29 | `apps/api` `apps/web` `packages/contracts` `packages/db` `packages/ui` `harness` `docs` `infra` `tests` | [spec](../.specs/features/fundacao-ethica) | 1 |

## Por área

- **`apps/api`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`apps/web`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`docs`** — [benchmark-jusperia](features/benchmark-jusperia/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`harness`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`infra`** — [documentos-pdf](features/documentos-pdf/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/contracts`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/db`** — [campo-vistorias](features/campo-vistorias/feature.md), [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/ui`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`tests`** — [fundacao-ethica](features/fundacao-ethica/feature.md)

## Decisões recentes

Últimas 10 de [`.specs/STATE.md`](../.specs/STATE.md#decisions) (ADRs longos em [`docs/adr/`](adr/README.md)).

- **AD-132** (2026-10-31, active) — A feature `campo-vistorias` entra nesta rodada com CAM-01 a CAM-09, menos a transcrição de áudio (CAM-07.2, fora pela AD-124 até decisão pró
- **AD-131** (2026-10-31, active) — Mapa do dia (`/campo/mapa`) com Leaflet e tiles do OpenStreetMap (atribuição na tela). O endereço do compromisso é geocodificado pela API co
- **AD-130** (2026-10-31, active) — O registro de vistoria é a collection `Vistoria` do módulo `agenda`, uma por compromisso (o `compromisso` continua sendo o evento da agenda)
- **AD-129** (2026-10-31, active) — Mídias da vistoria ficam no storage S3 do tenant (AD-120) com chave `tenants/<tenantId>/vistorias/<compromissoId>/<midiaId>`, contadas na co
- **AD-128** (2026-10-31, active) — A tela de campo (`/campo`) funciona sem conexão: o `apps/web` vira PWA instalável (manifest + service worker escrito à mão em `apps/web/publ
- **AD-127** (2026-10-31, active) — A feature `laudos` entra nesta rodada com LAU-01, LAU-02, LAU-03, LAU-05 e LAU-06 (LAU-04 fora, AD-124). A biblioteca padrão trabalhista tra
- **AD-126** (2026-10-31, active) — Defaults da spec de `laudos` confirmados pelo usuário, com o modelo de dados: (1) `ModeloLaudo` e `Laudo` são collections do módulo `documen
- **AD-125** (2026-10-31, active) — O laudo é exportado em Word com a biblioteca `docx` no `apps/api`, montado a partir do mesmo HTML saneado (AD-123) lido com `htmlparser2`: c
- **AD-124** (2026-10-31, active) — A redação com IA (LAU-04) fica fora desta rodada. Nenhum texto do laudo sai do Ethica; provedor, limite por tenant e tratamento LGPD serão d
- **AD-123** (2026-10-31, active) — O texto do laudo e dos modelos é editado com Tiptap 3 no `apps/web` (StarterKit reduzido + tabela): parágrafo, títulos de nível 3 e 4, negri

## `.specs/` sem registro em `docs/features/`

- `.specs/features/prospeccao-datajud/`

## Outros documentos

- [Arquitetura](architecture.md) · [Glossário](glossary.md) · [Roadmap](roadmap.md) · [Posicionamento](positioning.md) · [ADRs](adr/README.md)
- Produto: [`PRODUCT.md`](../PRODUCT.md) · Operação local: [`RUN_BOOK.md`](../RUN_BOOK.md)
- Template de registro: [`docs/templates/feature-doc.md`](templates/feature-doc.md)
