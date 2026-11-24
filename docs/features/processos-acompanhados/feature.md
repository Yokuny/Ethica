---
feature: Processos acompanhados com a situação de cada um
slug: processos-acompanhados
descricao: Página da Automação lista todo processo acompanhado, mesmo sem dado do tribunal, com a situação de cada um
data: 2026-11-24
status: concluido
areas: [apps/web, apps/api, apps/worker, packages/contracts, packages/db]
decisoes: [AD-277, AD-286]
spec: [.specs/features/processos-acompanhados]
---

# Processos acompanhados com a situação de cada um

**Status**: concluido · **Atualizado**: 2026-11-24 · **Áreas**: `apps/web`, `apps/api`, `apps/worker`, `packages/contracts`, `packages/db`

> Documento vivo. Intenção, requisitos (PAC-01 a PAC-03) e design inline em
> `.specs/features/processos-acompanhados/spec.md`.
> Correlação com o git: `git log --oneline -i --grep='processos-acompanhados'`.

## O que foi feito

- "Processos acompanhados" (`/automation`) lista todo serviço que o worker acompanha, com ou sem resposta do tribunal (PAC-01). Serviço encerrado ou cancelado sai da lista.
- Cada linha mostra a situação em selo e texto (PAC-02): **Aguardando a primeira consulta**, **Não encontrado no tribunal** (com a data da consulta e as causas prováveis), **Sem resposta do tribunal desde DD/MM** (última consulta com mais de 3 dias) ou **Consultado** (com a data). A ordem põe primeiro o que pede atenção (não encontrado, sem resposta), depois os que aguardam e por fim os consultados, do mais recente ao mais antigo.
- A seção "No tribunal" do serviço mostra a mesma situação enquanto não há movimentos.
- O worker grava toda consulta que deu certo: o processo não encontrado fica com a data e sem linha de base; quando ele aparece no Datajud, vira linha de base sem aviso (PAC-02.5). Consulta que falha não grava nada.
- Uma regra de "quem é acompanhado" para o worker e a página (PAC-03).

## Por que

"Processos acompanhados" só mostrava um processo depois que o Datajud devolvia movimentos dele. Em 2026-11-23 um processo do TRT16 acompanhado pelo worker ficou fora da página porque a consulta do dia falhou (AD-286), e a perita concluiu que o sistema não o acompanhava.

## Como

- Regra única: `listTrackedCases(now, tenantId?)` em `packages/db/src/workerReads.ts`; o worker chama sem escritório, a API com (`caseService.listTrackedCasesOf` em `apps/api/src/modules/case/case.service.ts`).
- Dado: `CaseCourtSync.baselineAt` é opcional (`packages/db/src/models/case-court-sync.model.ts`); `refreshCourtBatch` em `apps/worker/src/jobs/court-refresh.ts` faz upsert só com `syncedAt` quando o processo não vem e grava a linha de base quando o registro ainda não tem `baselineAt`.
- API: `GET /automation/cases` (`apps/api/src/modules/automation/automation.service.ts`) cruza os acompanhados com o `CaseCourtSync` numa consulta `$in` e devolve `TrackedCase` (`packages/contracts/src/schemas/court-process.schema.ts`): sem registro = `waiting`, sem `baselineAt` = `not_found`, com = `synced`; `syncedAt` ausente enquanto aguarda.
- Web: a situação "sem resposta" (`stale`) é derivada na tela de `syncedAt`, em `apps/web/src/components/tracked-case-labels.ts`, usado pela lista (`apps/web/src/routes/_private/automation/@components/tracked-cases.tsx`, que ordena) e pela seção No tribunal (`apps/web/src/routes/_private/expert-cases/details/@components/case-court.tsx`, que procura o serviço na mesma lista).

## Como testar

- `pnpm vitest run --project integration workerReads court-refresh` — regra com e sem escritório; não encontrado → linha de base sem aviso; falha não grava nada.
- `pnpm vitest run --project e2e automation.router` — os três status e o serviço encerrado ou cancelado fora.
- `pnpm vitest run --project unit automation case-court` — situação, texto e ordem na lista; seção No tribunal.
- Manual: com o plano com Automação, `/automation` mostra todo serviço trabalhista ou federal; depois da rodada das 03:00 o "Aguardando" vira "Consultado" ou "Não encontrado".

## Pendências

- [ ] Conferir no navegador `/automation` e a seção No tribunal (o login local exige passkey; o agente não conseguiu entrar no painel).
- [ ] Depois do deploy do worker na Railway e da rodada das 03:00, conferir o ETHICA em produção.

## Histórico

- 2026-11-24 — Implementado (T1 a T6). Perguntas da spec respondidas com os padrões da tabela "Assumptions & Open Questions"; a seção No tribunal (fora do escopo na spec) foi aceita pela perita e entrou. Divergências do plano: T3 e T4 num commit só, porque o contrato novo quebra o web sem a tela; um processo não encontrado com a última consulta de mais de 3 dias mostra "Sem resposta do tribunal desde", como o consultado (a data velha vale para qualquer situação); "Aguardando" fica entre o que pede atenção e os consultados. Tela coberta por teste; a conferência no navegador local não foi feita (passkey).
- 2026-11-24 — Spec e tasks escritas depois da investigação do TRT16 em produção (AD-286).

## Referências

- Spec e tasks (congeladas): `.specs/features/processos-acompanhados/`
- Origem: `docs/features/automacao-datajud/feature.md` (Histórico de 2026-11-23)
