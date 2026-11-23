---
feature: Prospecção no Datajud (removida)
slug: prospeccao-datajud
descricao: Busca de processos no Datajud e oportunidades convertidas em serviço; removida e substituída pela página Automação Datajud
data: 2026-11-22
status: revertido
areas: [apps/api, apps/web, packages/contracts, packages/db]
decisoes: [AD-105, AD-281]
spec: [.specs/features/prospeccao-datajud]
---

# Prospecção no Datajud (removida)

**Status**: revertido · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. A Prospecção não existe mais no código. Correlação com o git:
> `git log --oneline -i --grep='prospec'`.

## O que foi feito

- A Prospecção (busca no Datajud por tribunal e movimento, oportunidades salvas e convertidas em serviço) saiu inteira do produto em 2026-11-22.
- O item de menu virou a página **Automação Datajud** (`docs/features/automacao-datajud/feature.md`).

## Por que

O Datajud não traz o perito nomeado, então a busca manual não achava nomeações. O Datajud ficou para acompanhar os processos que o escritório já tem; a descoberta de nomeações virá do DJEN, construída do zero depois (AD-281, que supersede a AD-105).

## Como

Nada no código. Os dados de produção (collection `opportunities`, campo `Opportunity` nos serviços, `permissions.prospecting` dos usuários e o diário de bordo do módulo) são apagados à mão depois do deploy, com cópia e confirmação do usuário (plano `.specs/features/automacao-datajud/plans/2026-11-22-pagina-automacao-fim-prospeccao.md`, seção "Dados de produção").

## Como testar

Nada a testar: `rg -il "prospect|opportunit" apps packages tests` só acha o cliente do worker (`createDatajudClient`).

## Pendências

- [ ] Apagar os dados da Prospecção em produção, com cópia e confirmação do usuário.

## Histórico

- 2026-11-22 — Removida inteira, sem shim (AD-281): web, API, contrato, banco, testes estruturais e docs. O plano do worker (`.specs/features/prospeccao-datajud/plans/2026-11-22-prospeccao-worker-datajud.md`) foi arquivado: a base técnica serviu à Automação Datajud e a busca foi abandonada.
- 2026-10-29 — Busca no Datajud pela API e oportunidades (AD-105).

## Referências

- Spec (congelada): `.specs/features/prospeccao-datajud/`
- Planos: `.specs/features/prospeccao-datajud/plans/2026-11-22-prospeccao-worker-datajud.md`
