# Processos acompanhados com a situação de cada um — Tasks

Porta: a tabela "Assumptions & Open Questions" da `spec.md` confirmada com a perita.
Gate de cada task: `pnpm run check`; na T4, também `(cd apps/web && pnpm run build)`. Um commit por task, com o registro no `feature.md`.

- [ ] T1 `@ethica/db`: `CaseCourtSync.baselineAt` opcional; `listTrackedCases(now, tenantId?)`. Teste da regra com e sem escritório (`pnpm vitest run --project integration workerReads`).
- [ ] T2 Worker: `refreshCourtBatch` registra o serviço consultado sem movimentos e grava a linha de base quando ele aparece, sem aviso (PAC-02.5). Testes em `apps/worker/src/jobs/court-refresh.int.test.ts`.
- [ ] T3 API e contrato: `TrackedCase` com `status` e `syncedAt` opcional; `caseService` expõe os acompanhados do escritório; `automationService.listTrackedCases` cruza com o `CaseCourtSync` em lote. e2e de `GET /automation/cases` com os três status e serviço encerrado fora (PAC-01, PAC-02).
- [ ] T4 Web: situação, texto e ordem na lista de `tracked-cases.tsx`; chaves no dicionário depois de consultar as que existem; teste de tela. Conferência no navegador local.
- [ ] T5 (se a pergunta for aceita) Seção "No tribunal" do serviço com a mesma situação.
- [ ] T6 Registro: `feature.md` desta feature e de `automacao-datajud`, roadmap, AD se o design mudar.
