---
feature: Laudo automatizado
slug: laudos
descricao: Modelos de laudo por seções sim/não com variáveis, editor com IA e exportação em PDF e Word
data: 2026-10-31
status: planejado
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-107]
spec: [.specs/features/laudos]
---

# Laudo automatizado

**Status**: planejado · **Atualizado**: 2026-10-31 · **Áreas**: `apps/api`,`` `apps/web`,`` `packages/contracts`,`` `packages/db`

> Documento vivo. Ainda sem código: requisitos em `.specs/features/laudos/spec.md`.

## O que foi feito

- Spec escrita a partir do benchmark da Jusperia (`docs/features/benchmark-jusperia/feature.md`).

## Por que

O problema e as decisões em aberto estão em `.specs/features/laudos/spec.md` ("Problem Statement" e "Assumptions & Open Questions"). Origem: gap analysis em `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md`.

## Como

Ainda sem implementação. Áreas previstas no frontmatter; os arquivos entram aqui quando o código existir.

## Como testar

Sem código ainda. Os testes independentes de cada história estão na spec.

## Pendências

- [ ] Decisões em aberto listadas na spec (viram AD-NNN). A base de PDF já existe: HTML → Chromium (AD-119), identidade do escritório e marcadores (AD-121) em `docs/features/documentos-pdf/feature.md`; o editor rico do laudo deve gerar HTML compatível.
- [ ] `design.md` e `tasks.md`.

## Histórico

- 2026-10-31 — Pendência atualizada: a base de documentos (`documentos-pdf`, AD-119 a AD-122) está pronta para o laudo reaproveitar.
- 2026-10-31 — Spec criada (`.specs/features/laudos/spec.md`).
