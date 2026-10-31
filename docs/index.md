<!-- GERADO por scripts/docs/sync-docs.mjs — não edite à mão. Rode `pnpm docs:sync`. -->

# Gateway de documentação — Ethica

Ponto de entrada obrigatório antes de qualquer tarefa (protocolo em [`AGENTS.md`](../AGENTS.md)).
Cada feature tem **um** registro vivo em `docs/features/<slug>/feature.md`; spec, design, tasks,
validação e planos (congelados) ficam em `.specs/features/<slug>/`. Decisões: `.specs/STATE.md`.

## Em andamento

- [`laudos`](features/laudos/feature.md) — **planejado** — Modelos de laudo por seções sim/não com variáveis, editor com IA e exportação em PDF e Word
- [`fundacao-ethica`](features/fundacao-ethica/feature.md) — **parcial** — Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção

## Planos não arquivados (`.specs/plans/`)

_Nenhum._

## Features (6)

| Feature | O que faz | Status | Atualizado | Áreas | Spec | Planos |
| --- | --- | --- | --- | --- | --- | --- |
| [Benchmark da Jusperia](features/benchmark-jusperia/feature.md) | Engenharia reversa funcional do app da Jusperia (concorrente) e gap analysis contra o Ethica, com priorização em ondas | concluido | 2026-10-31 | `docs` | [spec](../.specs/features/benchmark-jusperia) | 1 |
| [Base de documentos](features/documentos-pdf/feature.md) | Identidade do escritório, dados profissionais, PDFs (ficha, checklist, prazos, financeiro, paradas) e exportação ZIP | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` `infra` | [spec](../.specs/features/documentos-pdf) | — |
| [Importação de processos](features/importacao-processos/feature.md) | Cadastro de perícia a partir do PDF da ata, importação em lote por CSV, partes e advogados reutilizáveis e dados trabalhistas | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/importacao-processos) | — |
| [Laudo automatizado](features/laudos/feature.md) | Modelos de laudo por seções sim/não com variáveis, editor com IA e exportação em PDF e Word | planejado | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/laudos) | — |
| [Prazos e recebimentos](features/prazos-recebimentos/feature.md) | Vários prazos por perícia com protocolo, recebimento parcial de honorários, feed iCal e aviso de prazo por e-mail | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/prazos-recebimentos) | — |
| [Fundação do Ethica](features/fundacao-ethica/feature.md) | Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção | parcial | 2026-10-29 | `apps/api` `apps/web` `packages/contracts` `packages/db` `packages/ui` `harness` `docs` `infra` `tests` | [spec](../.specs/features/fundacao-ethica) | 1 |

## Por área

- **`apps/api`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`apps/web`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`docs`** — [benchmark-jusperia](features/benchmark-jusperia/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`harness`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`infra`** — [documentos-pdf](features/documentos-pdf/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/contracts`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/db`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/ui`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`tests`** — [fundacao-ethica](features/fundacao-ethica/feature.md)

## Decisões recentes

Últimas 10 de [`.specs/STATE.md`](../.specs/STATE.md#decisions) (ADRs longos em [`docs/adr/`](adr/README.md)).

- **AD-122** (2026-10-31, active) — A `documentos-pdf` entra inteira nesta rodada (DOC-01 a DOC-04). A exportação é um ZIP (`fflate`) com um CSV por entidade do tenant, separad
- **AD-121** (2026-10-31, active) — Defaults da `documentos-pdf` confirmados pelo usuário: (1) cabeçalho e rodapé são texto simples de várias linhas com os marcadores `[LOGO]`,
- **AD-120** (2026-10-31, active) — Arquivos do tenant ficam em storage de objetos compatível com S3 (RustFS no docker local, já que as imagens públicas do MinIO saíram do Dock
- **AD-119** (2026-10-31, active) — PDF é gerado no `apps/api` por HTML → PDF com Chromium headless (`puppeteer-core` + pacote `chromium` do Debian na imagem `Dockerfile.dev`).
- **AD-118** (2026-10-31, active) — Arquivo de importação vai no corpo da requisição com o próprio tipo (`application/pdf` até 10 MB, `text/csv` até 2 MB e 1000 linhas), com `e
- **AD-117** (2026-10-31, active) — Partes e advogados são uma collection `Parte` do módulo `pericia`, com `tipo` `party`/`lawyer` (documento CPF/CNPJ para parte, OAB para advo
- **AD-116** (2026-10-31, active) — A feature `importacao-processos` entra inteira nesta rodada: IMP-01 (PDF), IMP-02 (CSV), IMP-03 (partes e advogados reutilizáveis) e IMP-04
- **AD-115** (2026-10-31, active) — Defaults da importação confirmados pelo usuário: (1) o PDF só preenche o formulário de cadastro, o perito confere e salva; (2) CSV com separ
- **AD-114** (2026-10-31, active) — A extração de dados do PDF da ata/despacho é feita por regras sobre a camada de texto do PDF, no `apps/api`: `unpdf` extrai o texto e `extra
- **AD-113** (2026-10-31, active) — Todo valor de domínio que o back-end grava e devolve é uma chave em inglês: status, tipos, categorias, naturezas, atuação, justiça, status d

## `.specs/` sem registro em `docs/features/`

- `.specs/features/prospeccao-datajud/`

## Outros documentos

- [Arquitetura](architecture.md) · [Glossário](glossary.md) · [Roadmap](roadmap.md) · [Posicionamento](positioning.md) · [ADRs](adr/README.md)
- Produto: [`PRODUCT.md`](../PRODUCT.md) · Operação local: [`RUN_BOOK.md`](../RUN_BOOK.md)
- Template de registro: [`docs/templates/feature-doc.md`](templates/feature-doc.md)
