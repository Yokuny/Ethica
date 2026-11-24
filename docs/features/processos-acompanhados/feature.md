---
feature: Processos acompanhados com a situação de cada um
slug: processos-acompanhados
descricao: Página da Automação lista todo processo acompanhado, mesmo sem dado do tribunal, com a situação de cada um
data: 2026-11-24
status: planejado
areas: [apps/web, apps/api, apps/worker, packages/contracts, packages/db]
decisoes: [AD-277, AD-286]
spec: [.specs/features/processos-acompanhados]
---

# Processos acompanhados com a situação de cada um

**Status**: planejado · **Atualizado**: 2026-11-24 · **Áreas**: `apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/db`

> Documento vivo. Ainda não implementado: a intenção, os requisitos e o design inline estão em
> `.specs/features/processos-acompanhados/spec.md` (perguntas em aberto a confirmar com a perita antes do código).
> Correlação com o git: `git log --oneline -i --grep='processos-acompanhados'`.

## O que foi feito

- Nada ainda: só a spec e as tasks.

## Por que

"Processos acompanhados" só mostra um processo depois que o Datajud devolve movimentos dele. Em 2026-11-23 um processo do TRT16 acompanhado pelo worker ficou fora da página porque a consulta do dia falhou (AD-286), e a perita concluiu que o sistema não o acompanhava. A lista passa a mostrar todo serviço acompanhado, com a situação de cada um.

## Como

A definir na implementação; o design está na seção "Design" da `spec.md`.

## Como testar

A definir.

## Pendências

- [ ] Perita: confirmar a tabela "Assumptions & Open Questions" da spec.
- [ ] Implementar as tasks T1 a T6.

## Histórico

- 2026-11-24 — Spec e tasks escritas depois da investigação do TRT16 em produção (AD-286).

## Referências

- Spec e tasks (congeladas): `.specs/features/processos-acompanhados/`
- Origem: `docs/features/automacao-datajud/feature.md` (Histórico de 2026-11-23)
