<!-- GERADO por scripts/docs/sync-docs.mjs — não edite à mão. Rode `pnpm docs:sync`. -->

# Gateway de documentação — Ethica

Ponto de entrada obrigatório antes de qualquer tarefa (protocolo em [`AGENTS.md`](../AGENTS.md)).
Cada feature tem **um** registro vivo em `docs/features/<slug>/feature.md`; spec, design, tasks,
validação e planos (congelados) ficam em `.specs/features/<slug>/`. Decisões: `.specs/STATE.md`.

## Em andamento

- [`documentos-pdf`](features/documentos-pdf/feature.md) — **planejado** — Identidade do escritório, dados profissionais e PDFs (ficha, checklist, prazos, financeiro, paradas) e exportação ZIP
- [`importacao-processos`](features/importacao-processos/feature.md) — **planejado** — Cadastro de perícia a partir do PDF da ata, importação em lote por CSV, partes e advogados reutilizáveis
- [`laudos`](features/laudos/feature.md) — **planejado** — Modelos de laudo por seções sim/não com variáveis, editor com IA e exportação em PDF e Word
- [`fundacao-ethica`](features/fundacao-ethica/feature.md) — **parcial** — Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção

## Planos não arquivados (`.specs/plans/`)

_Nenhum._

## Features (6)

| Feature | O que faz | Status | Atualizado | Áreas | Spec | Planos |
| --- | --- | --- | --- | --- | --- | --- |
| [Benchmark da Jusperia](features/benchmark-jusperia/feature.md) | Engenharia reversa funcional do app da Jusperia (concorrente) e gap analysis contra o Ethica, com priorização em ondas | concluido | 2026-10-31 | `docs` | [spec](../.specs/features/benchmark-jusperia) | 1 |
| [Base de documentos](features/documentos-pdf/feature.md) | Identidade do escritório, dados profissionais e PDFs (ficha, checklist, prazos, financeiro, paradas) e exportação ZIP | planejado | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/documentos-pdf) | — |
| [Importação de processos](features/importacao-processos/feature.md) | Cadastro de perícia a partir do PDF da ata, importação em lote por CSV, partes e advogados reutilizáveis | planejado | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/importacao-processos) | — |
| [Laudo automatizado](features/laudos/feature.md) | Modelos de laudo por seções sim/não com variáveis, editor com IA e exportação em PDF e Word | planejado | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/laudos) | — |
| [Prazos e recebimentos](features/prazos-recebimentos/feature.md) | Vários prazos por perícia com protocolo, recebimento parcial de honorários, feed iCal e aviso de prazo por e-mail | concluido | 2026-10-31 | `apps/api` `apps/web` `packages/contracts` `packages/db` | [spec](../.specs/features/prazos-recebimentos) | — |
| [Fundação do Ethica](features/fundacao-ethica/feature.md) | Base do monorepo (harness, api modular com eventos, web padronizada) e domínio inicial de perícias, agenda, financeiro e prospecção | parcial | 2026-10-29 | `apps/api` `apps/web` `packages/contracts` `packages/db` `packages/ui` `harness` `docs` `infra` `tests` | [spec](../.specs/features/fundacao-ethica) | 1 |

## Por área

- **`apps/api`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`apps/web`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`docs`** — [benchmark-jusperia](features/benchmark-jusperia/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`harness`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`infra`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/contracts`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/db`** — [documentos-pdf](features/documentos-pdf/feature.md), [importacao-processos](features/importacao-processos/feature.md), [laudos](features/laudos/feature.md), [prazos-recebimentos](features/prazos-recebimentos/feature.md), [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`packages/ui`** — [fundacao-ethica](features/fundacao-ethica/feature.md)
- **`tests`** — [fundacao-ethica](features/fundacao-ethica/feature.md)

## Decisões recentes

Últimas 10 de [`.specs/STATE.md`](../.specs/STATE.md#decisions) (ADRs longos em [`docs/adr/`](adr/README.md)).

- **AD-112** (2026-10-31, active) — A troca de modelo da feature `prazos-recebimentos` (prazo do laudo vira `Prazo`, compromisso perde o tipo `prazo`, lançamento ganha parcelas
- **AD-111** (2026-10-31, active) — Honorário (lançamento de `natureza: receita`) não é excluído nem cancelado. Recebe parcelas (valor, data, conta/observação) gravadas dentro
- **AD-110** (2026-10-31, active) — O aviso de prazo por e-mail é uma preferência por usuário: todo usuário com papel no tenant (qualquer papel) liga ou desliga o próprio aviso
- **AD-109** (2026-10-31, active) — Prazo processual é entidade própria: collection `Prazo` no módulo `pericia` (dono do model), com título, vencimento `YYYY-MM-DD` (AD-103), s
- **AD-108** (2026-10-31, proposed) — Permissões do tenant passam a ser uma matriz perfil × módulo × ação (acessar, visualizar, editar, inserir, excluir). Os perfis de equipe (eq
- **AD-107** (2026-10-29, active) — O financeiro (`/financeiro/*` na API e no web) é restrito a `admin` e `manager`; perícias, agenda e prospecção são de qualquer papel do tena
- **AD-106** (2026-10-29, active; a parte `pericia:created` ⇒ compromisso "Entrega do laudo" foi superseded pela AD-109, e o trade-off do segundo lançamento ao alterar o honorário fixado foi superseded pela AD-111) — Efeitos entre módulos do domínio por evento (AD-039): `pericia:created` com `prazoLaudo` ⇒ a `agenda` cria o compromisso automático "Entrega
- **AD-105** (2026-10-29, active) — Prospecção usa a API Pública do Datajud (CNJ) chamada só pelo `apps/api` (`providers/datajudClient.ts`, injetado em `buildApp`), com a chave
- **AD-104** (2026-10-29, active) — Gráficos com recharts 3 através do primitivo `chart` do `packages/ui` (`ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, `ChartLegend
- **AD-103** (2026-10-29, active) — Complementa a AD-036. Data de calendário (prazo do laudo, data da nomeação, vencimento e liquidação de lançamento) trafega e é gravada como

## `.specs/` sem registro em `docs/features/`

- `.specs/features/prospeccao-datajud/`

## Outros documentos

- [Arquitetura](architecture.md) · [Glossário](glossary.md) · [Roadmap](roadmap.md) · [Posicionamento](positioning.md) · [ADRs](adr/README.md)
- Produto: [`PRODUCT.md`](../PRODUCT.md) · Operação local: [`RUN_BOOK.md`](../RUN_BOOK.md)
- Template de registro: [`docs/templates/feature-doc.md`](templates/feature-doc.md)
