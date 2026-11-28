# Painel da Automação Datajud — Design

Spec: `.specs/features/painel-automacao/spec.md`. Decisões ativas da área relidas: AD-038/039 (módulos e grafo acíclico, MOD-06), AD-010 (tenant do servidor), AD-028 e AD-193 (tabela em modo servidor e filtro), AD-137 (sugestões de dinheiro só para quem vê o Financeiro), AD-255/256 (painel, só meses completos, 25 meses), AD-270/276 (módulo pago), AD-277/286/287 (worker e lotes), AD-313 (hierarquia tipográfica).

## Divergências da spec (confirmadas com o usuário em 2026-11-28)

1. **Avisos não ganham 25 meses de vida (PAT-07 sai).** Aviso não lido fica aberto no sino e na Central até alguém ler (`countDue`, `stateFilter` em `apps/api/src/modules/notifications/notification.repository.ts`). Com 25 meses, um aviso esquecido ficaria lá por dois anos. O registro diário (PAT-06) já guarda quantos avisos o worker criou em cada dia, por módulo, e o painel conta por ele. `COURT_NOTICE_DAYS` fica em 180.
2. **Movimentações e avisos contam a partir da entrega.** "Movimentações detectadas" são as movimentações **novas** que o worker viu (as da linha de base não contam: são o passado do processo, não trabalho da automação). Vêm do registro diário, que começa a ser gravado na entrega. Até o primeiro mês completo, a faixa e o gráfico mostram zero com a nota "Contando desde DD/MM". Sugestões contam desde sempre (não expiram).
3. **Dias com consulta numa fileira sob o gráfico.** No mês são cerca de 30; movimentações e sugestões são poucas, e no mesmo eixo as linhas achatariam. O gráfico tem as duas linhas e, alinhada ao eixo dos meses, uma fileira de células com "dias completos / dias com rodada" de cada mês: verde com todas as rodadas respondidas, âmbar com algum dia sem resposta, cinza sem rodada (opção B, desenhada para o usuário).
4. **Rosca "Situação dos processos" ao lado da rosca das sugestões.** Composição do que é acompanhado hoje (consultado, não encontrado, sem resposta, aguardando); cada parte filtra a lista abaixo. Fecha a linha de duas roscas como no Dashboard.

## Dados (`packages/db`)

### `CourtSyncDay` (novo, collection `court_sync_days`)

Uma linha por escritório e por dia de rodada (`day` no fuso de exibição, o mesmo `day` do lote).

| Campo | Tipo | Quem grava |
| --- | --- | --- |
| `Tenant` | ObjectId | — |
| `day` | `YYYY-MM-DD` | — |
| `tracked` | number | `enqueueCourtRefresh`: processos do escritório na rodada (`$set`, roda uma vez por dia) |
| `answeredCases` | ObjectId[] | lote: serviço com resposta do tribunal (conjunto, para contar uma vez) |
| `found`, `notFound` | number | lote, junto com `answeredCases` |
| `newMovements` | number | lote: movimentos fora de `seenMovementKeys`, depois de gravar as chaves vistas |
| `notices` | `{ expert_cases, finance }` | `insertCaseNotice`/aviso de movimentação, só quando o aviso é novo (o `dedupeKey` já impede o repetido) |

Índice único `{ Tenant, day }`. Sem TTL: uma linha pequena por escritório por dia.

**Contar uma vez com lote repetido (PAT-06.2):** por serviço, um `updateOne({ Tenant, day, answeredCases: { $ne: caseId } }, { $addToSet: { answeredCases: caseId }, $inc: { found | notFound: 1 } })`, sem upsert (a linha nasce no enfileiramento), nas três saídas do laço (não encontrado, linha de base, já acompanhado). `newMovements` e `notices` contam onde o efeito acontece de fato (chaves vistas gravadas, aviso inserido), então a nova tentativa não soma de novo. Lote que desiste no dia (AD-286) deixa o serviço fora de `answeredCases`: "sem resposta" = `tracked − answeredCases.length`.

### `CaseCourtSync` (campos novos)

`lastMovementAt?: Date` e `lastMovementName?: string`: o movimento mais recente do processo, gravado em toda consulta que trouxe movimentos (o lote já calcula `newest`). Ordena a lista sem carregar a cópia do processo. Os registros de hoje ganham os campos na rodada seguinte.

Glossário: "Dia de acompanhamento" → `CourtSyncDay`.

## API

### Checagem do módulo pago sobe para `identity`

`automationService.ensureAutomation` vira `billingService.ensureAutomation` (`apps/api/src/modules/identity/billing.service.ts`, ao lado de `hasAutomationNow`). `notifications` passa a chamá-la direto e deixa de depender de `automation`; assim `automation → notifications` entra sem ciclo (MOD-06). Grafo: `automation → case, identity, notifications`; `notifications → case, finance, identity`.

### `GET /automation/dashboard`

Guarda: `validToken`, `tenantAssignmentCheck`, `requireAutomation`, `can('expert_cases', 'view')`.

```ts
AutomationDashboard = {
  since?: string;                    // primeiro dia registrado (nota "Contando desde")
  tracked: { total: number; byState: Record<TrackedCaseStatus, number> };
  pending: number;                   // sugestões aguardando, dos módulos que a pessoa vê (o mesmo número da Central)
  byMonth: {                         // 25 meses, do mais antigo ao atual (o web corta o mês em andamento)
    month: string;                   // YYYY-MM
    movements: number; notices: number; roundDays: number; completeDays: number;
    suggestions: number;
    byStatus: Partial<Record<'accepted' | 'rejected' | 'expired' | 'superseded' | 'pending', number>>;
  }[];
}
```

- `movements`, `roundDays` (dias com rodada) e `completeDays` (dias em que todo processo da rodada teve resposta) vêm de `CourtSyncDay` (repository do `automation`). `notices` soma só os módulos que a pessoa vê.
- `suggestions`/`byStatus`: `notificationService.suggestionActivity(tenantId, permissions, since)` (novo), agregação por mês de `createdAt` no fuso de exibição, `kind: 'suggestion'`, `module ∈ visibleModules`. Toda sugestão é `source: 'datajud'` hoje, então a rosca e o "Para aprovar" contam a mesma população. `pending` sai da mesma função.
- Schema em `packages/contracts/src/schemas/court-process.schema.ts`, junto de `TrackedCase`.

### `GET /automation/cases` (paginada)

Query: `page`, `limit`, `search` (número), `state` (lista), `sort` (`lastMovementAt` | `syncedAt` | `caseLabel`), `order`. Resposta no formato das outras listas (`{ items, total }`).

- `TrackedCase` ganha `lastMovementAt?`, `lastMovementName?` e o status `stale` (consulta que deu certo há mais de 3 dias, hoje calculado no web): o filtro por situação é do servidor, então a situação também é.
- O service monta a lista do escritório (`caseService.listTrackedCasesOf` + `findCourtSyncs` com os campos novos), filtra, ordena e pagina em memória: a lista de um escritório é de centenas, e a regra de quem é acompanhado (`courtUnitFromNumber`) não vira consulta. Padrão: `lastMovementAt` desc; sem movimento, no fim, pela ordem de atenção (não encontrado e sem resposta, aguardando, consultado); desempate final por `caseId`.

## Web

### Período compartilhado

`PERIODS`, `PERIOD_LABEL`, `PERIOD_SCOPE`, o schema de `months` e `splitPeriod`/`percentChange`/`direction` saem de `apps/web/src/routes/_private/dashboard/@{interface,utils}/` para `apps/web/src/lib/helpers/period.helper.ts` (import entre módulos de `routes/` é proibido). O Dashboard passa a importar de lá; `rankTypes` fica no Dashboard.

### Página `apps/web/src/routes/_private/automation/`

Sem o módulo, só a oferta, sem chamada (como hoje). Com o módulo, do macro ao micro:

1. **Cabeçalho**: título, descrição do período, `ToggleGroup` 6/12 meses (`?months=`) e o menu "…" com Regras.
2. **Faixa** (`@components/automation-kpis.tsx`, `RecordStats variant="band"`): Processos acompanhados (hoje; descrição com quantos pedem atenção), Movimentações detectadas, Avisos enviados, Sugestões feitas (descrição: quantas aprovadas) — os três com `sparkline`, `trend` e variação contra o período anterior — e Para aprovar (hoje, `dot` âmbar quando > 0, link para `/notifications`). Nota "Contando desde DD/MM" sob a faixa enquanto o registro não cobre o período.
3. **Atividade da automação** (`@components/automation-activity-chart.tsx`): linhas de movimentações e sugestões por mês (recharts, eixo a partir de 0, `chart-1`/`chart-2`: identidade de série, não estado), legenda com os totais do período e, sob o gráfico, a fileira de consultas por mês (item 3 das divergências), alinhada às colunas do eixo; "Ver mês a mês" recolhido com a tabela por mês (`MonthDetails` sobe para `src/components/`, usado pelo Dashboard e pela Automação).
4. **Duas roscas** (`CompositionDonut`): "O que aconteceu com as sugestões" (aprovadas verde, recusadas vermelho, aguardando âmbar, vencidas e substituídas cinza: aqui a cor é estado) e "Situação dos processos" (consultado verde, não encontrado vermelho, sem resposta âmbar, aguardando cinza), cada parte com `render` que aplica `?state=` na lista.
5. **Processos acompanhados**: `DataTable` com busca pelo número e filtro de situação (`options`), `@components/tracked-cases-table.tsx` com `TableIdentity` (processo → serviço), Tribunal, Última movimentação (`TableStack`: nome e data), Situação (`TableStatus`) e Última consulta; colunas ordenáveis (AD-192); `TablePagination`. Busca, filtro, ordem e página na URL (`@interface/automation.interface.ts`, `@hooks/use-tracked-cases-search.ts`).

Sai: o bloco "Para aprovar" e `@components/tracked-cases.tsx`. `trackedCaseState` sai de `apps/web/src/components/tracked-case-labels.ts` (a situação vem da API); rótulos e variantes ficam.

## Testes

- Worker: integração do lote com o registro diário (conta uma vez na nova tentativa; não encontrado, linha de base, movimento novo; aviso por módulo; última movimentação).
- API: e2e de `GET /automation/dashboard` (meses, permissão do Financeiro nas sugestões e avisos, 403 sem módulo) e de `GET /automation/cases` (página, busca, filtro, ordem); estrutural do grafo continua verde.
- Web: teste da página (oferta sem módulo; faixa, roscas e tabela com o módulo); o Dashboard segue verde depois da troca de import do período.
