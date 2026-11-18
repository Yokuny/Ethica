---
feature: Cadastro com checkout
slug: cadastro-checkout
descricao: Criar conta termina na assinatura paga no Asaas; sem pagamento ou mensalidade vencida, o escritório fica suspenso
data: 2026-11-18
status: planejado
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-230, AD-155, AD-220, AD-098]
spec: [.specs/features/cadastro-checkout]
---

# Cadastro com checkout

**Status**: planejado · **Atualizado**: 2026-11-18 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Ainda não implementado: a intenção e os requisitos estão em
> `.specs/features/cadastro-checkout/spec.md` (perguntas em aberto a confirmar antes do design).
> Correlação com o git: `git log --oneline -i --grep='cadastro-checkout'`.

## O que foi feito

- Nada ainda: só a spec.

## Por que

O cadastro aberto e gratuito (AD-155) passa a acontecer junto do pagamento da assinatura no Asaas (AD-230).

## Como

A definir no `design.md`.

## Como testar

A definir no `tasks.md`.

## Pendências

- [ ] Confirmar a tabela "Assumptions & Open Questions" da spec (teste de R$ 6, valores dos planos, vencimento).
- [ ] `design.md` e `tasks.md` (skill `ethica-spec-driven`).
- [ ] Conta e chaves do Asaas (sandbox e produção) e webhook cadastrado no Asaas.
- [ ] Implementação, validação e UAT.

## Histórico

- 2026-11-18 — Spec criada (`.specs/features/cadastro-checkout/spec.md`), AD-230 proposta.

## Referências

- Spec (congelada): `.specs/features/cadastro-checkout/`
