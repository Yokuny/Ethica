---
feature: Avisos de vencimento e notificações push
slug: avisos-notificacoes
descricao: Varredura agendada dos avisos sem perda nem duplicidade, aviso de vencimento financeiro e notificação push no aparelho
data: 2026-11-01
status: planejado
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-110, AD-147]
spec: [.specs/features/avisos-notificacoes]
---

# Avisos de vencimento e notificações push

**Status**: planejado · **Atualizado**: 2026-11-01 · **Áreas**: `apps/api`,`` `apps/web`,`` `packages/contracts`,`` `packages/db`

> Documento vivo. Ainda não implementado: a intenção e os requisitos estão em
> `.specs/features/avisos-notificacoes/spec.md` (perguntas em aberto a confirmar com a perita antes do design).
> Correlação com o git: `git log --oneline -i --grep='avisos-notificacoes'`.

## O que foi feito

- Nada ainda: só a spec.

## Por que

O aviso diário de prazos roda num timer em memória que perde o dia com a API fora do ar e duplica com duas réplicas; o financeiro não avisa ninguém e não há aviso no celular. A AD-147 troca o timer por uma varredura agendada com trava por envio no banco.

## Como

A definir no `design.md`.

## Como testar

A definir no `tasks.md`.

## Pendências

- [ ] Confirmar com a perita a tabela "Assumptions & Open Questions" da spec.
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Implementação, validação e UAT.

## Histórico

- 2026-11-01 — Spec criada (`.specs/features/avisos-notificacoes/spec.md`).

## Referências

- Spec (congelada): `.specs/features/avisos-notificacoes/`
