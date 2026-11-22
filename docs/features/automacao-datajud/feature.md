---
feature: Automação Datajud (premium)
slug: automacao-datajud
descricao: Módulo premium que acompanha os processos no Datajud e gera avisos e sugestões que só valem com a aprovação da pessoa
data: 2026-11-22
status: planejado
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-268, AD-269, AD-270, AD-271]
spec: [.specs/features/automacao-datajud]
---

# Automação Datajud (premium)

**Status**: planejado · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Ainda não implementado: a intenção está em `.specs/features/automacao-datajud/`.
> Correlação com o git: `git log --oneline -i --grep='automacao-datajud'`.

## O que foi feito

- Fase 0: consultas reais ao Datajud e fixtures (`.specs/features/automacao-datajud/fixtures/`); spec, design e tasks; AD-268 a AD-271.

## Por que

A perita descobre tarde que o processo foi suspenso, acabou em acordo ou teve alvará. O Datajud só **sugere**: nada muda sem a aprovação da pessoa (AD-268), e pagamento só pelo alvará, com valor, data e conta confirmados (AD-269).

## Como

A definir nas Fases 3 a 6.

## Como testar

A definir.

## Pendências

- [ ] Usuário: texto exato e origem de "expedição de alvará eletrônico automatizado" (no Datajud só há o movimento 60 com complemento "Alvará").
- [ ] Usuário: preço e escopo do premium.
- [ ] Fixtures de TJ e TRF (indisponíveis em 2026-11-22) antes da Fase 4.

## Histórico

- 2026-11-22 — Fase 0: descoberta no Datajud (TRT24 responde; TRT2, TRF3 e TJMS recusaram), documentação e ADs.

## Referências

- Spec (congelada): `.specs/features/automacao-datajud/`
- Planos em execução: `.specs/plans/2026-11-22-automacao-datajud-notificacoes.md`, `.specs/plans/2026-11-22-prospeccao-worker-datajud.md`
