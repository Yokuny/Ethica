---
feature: Central de notificações
slug: central-notificacoes
descricao: Notification única (prazo, alerta, sugestão, aviso) no lugar do Deadline, Central no app e worker de lembretes e entrega
data: 2026-11-22
status: em-andamento
areas: [apps/api, apps/web, packages/contracts, packages/db, docs]
decisoes: [AD-263, AD-264, AD-265, AD-266, AD-267]
spec: [.specs/features/central-notificacoes]
---

# Central de notificações

**Status**: em-andamento · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `docs`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='central-notificacoes'`.

## O que foi feito

- Fase 0: spec, design e tasks; decisões AD-263 a AD-267; glossário com `Notification` e os quatro tipos.

## Por que

O sistema não foi lançado, e prazos, lembretes, avisos e as sugestões do Datajud precisavam de uma casa e de um motor de entrega só. A troca do `Deadline` por `Notification` é feita de uma vez, sem shim (AD-263). Não desfazer sem ler a AD-263 e a AD-267.

## Como

A definir na Fase 1 (`.specs/features/central-notificacoes/design.md`).

## Como testar

A definir na Fase 1.

## Pendências

- [ ] Fases 1, 2 e 6 (push) — `.specs/features/central-notificacoes/tasks.md`.
- [ ] Usuário: há prazos reais em produção (D8)?
- [ ] Perita: confirmar a tabela "Assumptions" da spec.

## Histórico

- 2026-11-22 — Fase 0: documentação, ADs e glossário. Absorve `avisos-notificacoes` e substitui a entidade de `prazos-alertas`.

## Referências

- Spec (congelada): `.specs/features/central-notificacoes/`
- Plano em execução: `.specs/plans/2026-11-22-automacao-datajud-notificacoes.md`
