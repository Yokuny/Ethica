---
feature: Rotas de vistoria com ponto de partida
slug: rotas-vistoria
descricao: Mapa do dia saindo de um endereço escolhido (localização, escritório ou digitado) com a rota calculada por serviço de rota próprio
data: 2026-11-01
status: planejado
areas: [apps/api, apps/web, packages/db]
decisoes: [AD-131, AD-150]
spec: [.specs/features/rotas-vistoria]
---

# Rotas de vistoria com ponto de partida

**Status**: planejado · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`,`` `apps/web`,`` `packages/db`

> Documento vivo. Ainda não implementado: a intenção e os requisitos estão em
> `.specs/features/rotas-vistoria/spec.md` (perguntas em aberto a confirmar com a perita antes do design).
> Correlação com o git: `git log --oneline -i --grep='rotas-vistoria'`.

## O que foi feito

- Nada ainda: só a spec.

## Por que

A ordem das vistorias parte só da localização do aparelho e a rota usa o OSRM público pelo navegador, sem garantia e expondo os endereços. A AD-150 passa a rota para um OSRM próprio chamado pela API.

## Como

A definir no `design.md`.

## Como testar

A definir no `tasks.md`.

## Pendências

- [ ] Confirmar com a perita a tabela "Assumptions & Open Questions" da spec.
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Implementação, validação e UAT.

## Histórico

- 2026-11-01 — Spec criada (`.specs/features/rotas-vistoria/spec.md`).

## Referências

- Spec (congelada): `.specs/features/rotas-vistoria/`
