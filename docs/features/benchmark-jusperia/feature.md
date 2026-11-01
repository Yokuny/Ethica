---
feature: Benchmark da Jusperia
slug: benchmark-jusperia
descricao: Engenharia reversa funcional do app da Jusperia (concorrente) e gap analysis contra o Ethica, com priorização em ondas
data: 2026-11-01
status: concluido
areas: [docs]
decisoes: [AD-105, AD-106, AD-107, AD-108]
spec: [.specs/features/benchmark-jusperia]
---

# Benchmark da Jusperia

**Status**: concluido · **Atualizado**: 2026-10-31 · **Áreas**: `docs`

> Documento vivo. Correlação com o git: `git log --oneline -i --grep='benchmark-jusperia'`.

## O que foi feito

- Inventário funcional do app da Jusperia (`app.jusperia.com.br`), tela a tela, com campos, regras, endpoints, documentos gerados, integrações e evidências: `.specs/features/benchmark-jusperia/2026-10-31-jusperia-inventario.md`.
- Gap analysis módulo × Ethica (tem/parcial/não tem, arquivo do Ethica, esforço P/M/G, valor) e priorização em 6 ondas: `.specs/features/benchmark-jusperia/2026-10-31-jusperia-gap-analysis.md`.
- Specs das ondas escolhidas: `prazos-recebimentos`, `importacao-processos`, `documentos-pdf`, `laudos`.

## Por que

Saber o que o concorrente direto entrega ao perito e onde o Ethica já está à frente (Datajud, validação CNJ, automações por evento, permissões por papel) antes de priorizar o roadmap. Nada foi implementado no Ethica nesta etapa.

## Como

### `docs`

- `.specs/features/benchmark-jusperia/` — inventário, gap analysis e plano arquivado (`plans/2026-10-31-benchmark-jusperia.md`).
- Método: navegação autenticada em Chrome headless via CDP, inspeção passiva com o MCP do REA, leitura dos scripts servidos pelo app e exercício dos fluxos com registros verossímeis (log no inventário).

## Como testar

- Não há código. Revisão: ler o inventário e conferir a gap analysis contra `docs/roadmap.md` e os `feature.md` existentes.

## Pendências

- [x] Matriz de permissões e jornada do assistente técnico: feitas em `gestao-escritorio` (AD-137).
- [x] Onda 5 (campo) feita como `campo-vistorias`.
- [x] Ondas 5 e 6 viraram `campo-vistorias` e `gestao-escritorio`.

## Histórico

- 2026-11-01 — Pendências fechadas: as ondas 5 e 6 e a matriz de permissões já foram entregues.
- 2026-10-31 — Respostas do usuário às perguntas abertas registradas no inventário; specs ajustadas (vence em breve = 15 dias, movimentação, duplicados pulados com aviso, parecer técnico em `laudos`); AD-108 proposta (matriz de permissões); novos itens na gap analysis (§5).
- 2026-10-31 — Inventário, gap analysis e specs das ondas 1–4 (plano `.specs/features/benchmark-jusperia/plans/2026-10-31-benchmark-jusperia.md`). Onda 2 ajustada pelo usuário: importação por PDF e CSV, sem IA externa colada. Registros criados na conta da Jusperia mantidos a pedido do usuário.

## Referências

- `docs/roadmap.md`, `PRODUCT.md`
