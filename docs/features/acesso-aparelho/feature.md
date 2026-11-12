---
feature: Acesso preso ao aparelho (passkey)
slug: acesso-aparelho
descricao: Entrada pelo e-mail termina criando a passkey do aparelho (um computador + um celular) e tela de entrada nova
data: 2026-11-12
status: planejado
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-220, AD-155]
spec: [.specs/features/acesso-aparelho]
---

# Acesso preso ao aparelho (passkey)

**Status**: planejado · **Atualizado**: 2026-11-12 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Ainda não implementado: requisitos e design em
> `.specs/features/acesso-aparelho/spec.md`, tarefas em `tasks.md`.
> Correlação com o git: `git log --oneline -i --grep='acesso-aparelho'`.

## O que foi feito

- Nada ainda: escolhas de comportamento confirmadas em 2026-11-12 (AD-220, proposta).

## Por que

A entrada pelo e-mail (AD-155) passa a valer só no aparelho em que a pessoa criou a passkey, um computador e um celular por vez (AD-220).

## Como

Design em `.specs/features/acesso-aparelho/spec.md` (seção Design).

## Como testar

A definir na implementação (T3 a T7 de `tasks.md`).

## Pendências

- [ ] T1 a T8 de `.specs/features/acesso-aparelho/tasks.md`.

## Histórico

- 2026-11-12 — Feature planejada: passkey obrigatória após o e-mail, um computador + um celular, passkey sincronizada aceita, cadastro de teste com senha sai, tela nova com vitrine do produto (AD-220).
