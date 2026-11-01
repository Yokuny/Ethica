---
feature: Gestão de membros pelo admin
slug: gestao-membros
descricao: Admin edita nome e perfil, desativa e reativa membros e gerencia convites pendentes, sem mexer no banco
data: 2026-11-01
status: planejado
areas: [apps/api, apps/web, packages/contracts]
decisoes: [AD-134, AD-137, AD-148]
spec: [.specs/features/gestao-membros]
---

# Gestão de membros pelo admin

**Status**: planejado · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`,`` `apps/web`,`` `packages/contracts`

> Documento vivo. Ainda não implementado: a intenção e os requisitos estão em
> `.specs/features/gestao-membros/spec.md` (perguntas em aberto a confirmar com a perita antes do design).
> Correlação com o git: `git log --oneline -i --grep='gestao-membros'`.

## O que foi feito

- Nada ainda: só a spec.

## Por que

Trocar o perfil ou tirar o acesso de um membro só se fazia direto no banco. A AD-148 define o CRUD só do admin, com "remover" = desativar para manter o histórico.

## Como

A definir no `design.md`.

## Como testar

A definir no `tasks.md`.

## Pendências

- [ ] Confirmar com a perita a tabela "Assumptions & Open Questions" da spec.
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Implementação, validação e UAT.

## Histórico

- 2026-11-01 — Spec criada (`.specs/features/gestao-membros/spec.md`).

## Referências

- Spec (congelada): `.specs/features/gestao-membros/`
