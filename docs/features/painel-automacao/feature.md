---
feature: Painel da Automação Datajud
slug: painel-automacao
descricao: Página Automação como painel do que a automação fez no período, com a lista paginada dos processos acompanhados
data: 2026-11-28
status: parcial
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-314]
spec: [.specs/features/painel-automacao]
branches: [main]
---

# Painel da Automação Datajud

**Status**: parcial · **Atualizado**: 2026-11-28 · **Áreas**: `apps/api`, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`

> Documento vivo. Onde divergir de `spec.md`/`design.md` (congelados), **o código é a fonte da verdade**.
> Correlação com o git: `git log --oneline -i --grep='painel-automacao'`.

## O que foi feito

- `/automation` virou painel, do macro ao micro, com o período de 6 ou 12 meses do Dashboard (`?months=`).
- Faixa: Processos acompanhados (quantos pedem atenção), Movimentações detectadas, Avisos enviados, Sugestões feitas (quantas aprovadas) e Para aprovar, que leva à Central filtrada em sugestões. O antigo bloco "Para aprovar" saiu.
- Atividade da automação: linhas de movimentações novas e sugestões por mês e, embaixo, uma fileira com os dias em que todo processo teve resposta do tribunal, dos dias com consulta (verde completo, âmbar com falha, cinza sem rodada); o número exato em "Ver mês a mês".
- Duas roscas: o que aconteceu com as sugestões (aprovadas, recusadas, pendentes, expiradas, já aplicadas) e a situação dos processos, cada parte filtrando a lista.
- No fim, os processos acompanhados num `DataTable` paginado no servidor: busca pelo número, filtro de situação, colunas ordenáveis e, por padrão, a última movimentação no tribunal primeiro.
- O worker grava, por escritório e por dia, os processos da rodada, os que tiveram resposta (encontrados ou não), as movimentações novas e os avisos criados por módulo (`CourtSyncDay`).

## Por que

A automação trabalha sozinha e a perita não via quanto ela fez nem se a consulta diária estava acontecendo. Decisões do usuário em 2026-11-28 (AD-314): o painel fica no módulo `automation` da API, como cada área tem o próprio `/dashboard`; os avisos continuam expirando em 180 dias (um aviso não lido ficaria aberto no sino por dois anos com 25 meses), e o painel conta pelo registro diário; os dias com consulta ficam numa fileira sob o gráfico, não no mesmo eixo. Movimentações, avisos e consultas contam desde a entrega (a página escreve "contados desde"); sugestões contam desde sempre.

## Como

### `apps/api`

- `apps/api/src/modules/automation/automation.service.ts` — `automationDashboard` (25 meses, como o Dashboard) e `listTrackedCases` paginada; a situação `stale` (consulta há mais de 3 dias) é calculada aqui.
- `apps/api/src/modules/automation/automation.repository.ts` — `findSyncDays` (o dia com o tamanho do conjunto de respondidos) e `findCourtSyncs` com a última movimentação.
- `apps/api/src/modules/notifications/notification.{repository,service}.ts` — `suggestionActivity`, só dos módulos que a pessoa vê (AD-137).
- `apps/api/src/modules/identity/billing.service.ts` — `ensureAutomation`, chamado por `automation` e `notifications` (tirou o ciclo entre os dois).

### `apps/web`

- `apps/web/src/routes/_private/automation/` — página, faixa, gráfico com a fileira de consultas, tabela do mês a mês e lista.
- `apps/web/src/lib/helpers/period.helper.ts` e `apps/web/src/components/month-details.tsx` — período e "Ver mês a mês", compartilhados com o Dashboard.
- `apps/web/src/routes/_private/expert-cases/details/@components/case-court.tsx` — a situação do processo buscada pelo número na lista paginada.

### `apps/worker`

- `apps/worker/src/jobs/court-refresh.ts` — a linha do dia nasce no enfileiramento; o lote conta a resposta uma vez por processo (`$ne` + `$addToSet`), as movimentações novas depois de gravadas como vistas e os avisos quando são novos; grava a última movimentação no `CaseCourtSync`.

### `packages/db` e `packages/contracts`

- `packages/db/src/models/court-sync-day.model.ts` — o dia do acompanhamento; `case-court-sync.model.ts` ganhou `lastMovementAt`/`lastMovementName`.
- `packages/contracts/src/schemas/court-process.schema.ts` — `AutomationDashboard`, `TrackedCase` com `stale` e a última movimentação, ordens da lista.

## Como testar

```
pnpm vitest run apps/worker/src/jobs/court-refresh.int.test.ts apps/api/src/modules/automation apps/web/src/routes/_private/automation
```

- UAT: entrar como administrador com o módulo, abrir Automação em 6 e 12 meses; clicar numa parte da rosca da situação e conferir o filtro da lista; como operador, conferir que aviso e sugestão de dinheiro não entram nos números.

## Pendências

- [ ] Conferir no navegador a página logada (lista, filtros, links das roscas e a nota "contados desde"); os componentes do painel já foram conferidos isolados (ver Histórico).
- [ ] Deploy do worker e da API juntos: a linha do dia só começa a ser gravada com o worker novo.

## Histórico

- 2026-11-28 — Conferido com Playwright numa prévia isolada (componentes com dados fictícios, sem login), a 1280px e 390px e nos temas Claro e Escuro: faixa de cinco números numa linha, fileira de consultas alinhada aos meses em 6 e 12 (centro das células a até 2px dos meses) e as duas roscas. O `padding="gap"` do eixo não fazia nada no eixo de categorias (o recharts 3 só o aplica ao eixo numérico); trocado por `scale="band"`. No celular, o selo de tendência quebrava o rótulo no meio da palavra; agora desce para a linha de baixo (`RecordStat`, vale também para o Início e Serviços). Sem nenhuma linha do dia ainda, a página explica que a contagem começa na próxima consulta. "Contar desde a entrega" não foi perguntado ao usuário à parte: o design o lista entre as divergências confirmadas, mas as perguntas cobriram avisos, fileira e segunda rosca.
- 2026-11-28 — Entregue (AD-314). No caminho, dois commits corrigiram a `main`: o tipo literal no e2e do painel e a ordem dos exports do `@ethica/db`; a remoção da lista em cartões entrou um commit antes da página nova, deixando a `main` alguns minutos com a página antiga importando um arquivo apagado.

## Referências

- Spec, design e tasks: `.specs/features/painel-automacao/`
- Evolui `automacao-datajud` e `processos-acompanhados`; segue `dashboard` (AD-255, AD-256, AD-313).
