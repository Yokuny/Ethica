---
feature: Vistoria no laudo e revisão do laudo
slug: laudo-vistoria
descricao: Relatório fotográfico e anotações da vistoria no laudo, reabrir laudo concluído e excluir com confirmação explícita
data: 2026-11-01
status: planejado
areas: [apps/api, apps/web, packages/contracts]
decisoes: [AD-126, AD-129, AD-130, AD-149]
spec: [.specs/features/laudo-vistoria]
---

# Vistoria no laudo e revisão do laudo

**Status**: planejado · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`,`` `apps/web`,`` `packages/contracts`

> Documento vivo. Ainda não implementado: a intenção e os requisitos estão em
> `.specs/features/laudo-vistoria/spec.md` (perguntas em aberto a confirmar com a perita antes do design).
> Correlação com o git: `git log --oneline -i --grep='laudo-vistoria'`.

## O que foi feito

- Nada ainda: só a spec.

## Por que

O que a perita colhe em campo ainda é redigitado no laudo (relatório fotográfico e anotações), e um laudo concluído por engano só sai excluindo a perícia. A AD-149 libera reabrir e excluir o laudo concluído, com a exclusão protegida por confirmação digitada.

## Como

A definir no `design.md`.

## Como testar

A definir no `tasks.md`.

## Pendências

- [ ] Confirmar com a perita a tabela "Assumptions & Open Questions" da spec.
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Implementação, validação e UAT.

## Histórico

- 2026-11-01 — Spec criada (`.specs/features/laudo-vistoria/spec.md`).

## Referências

- Spec (congelada): `.specs/features/laudo-vistoria/`
