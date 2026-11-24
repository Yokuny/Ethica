# Diagnóstico das falhas do Datajud (429, tempo esgotado, resposta parcial)

**Data**: 2026-11-24 · **Feature**: `automacao-datajud` · **Decisão**: AD-287 · **Estado**: coleta de logs em andamento; voltar aqui para decidir a correção.

## Por que existe

As consultas ao Datajud falham com frequência: o lote do TRT16 levou 429 cinco vezes em 20 minutos em produção (2026-11-23, AD-286); no banco local TRT2, TRT4 e TRT15 recusaram e o TRF3 passou na segunda tentativa (2026-11-22); o TJ responde 504/429. A AD-286 só deu mais tentativas ao lote; não sabemos **por que** a recusa acontece. Este plano instala os logs para descobrir e lista o que fazer com cada resposta.

## O que foi instalado (2026-11-24)

Uma linha JSON por chamada, `datajud.request` (`apps/worker/src/datajud/client.ts`), e métricas no `/metrics` do worker:

| Campo | Serve para |
| --- | --- |
| `court`, `index`, `numbers`, `size` | qual tribunal e o tamanho do lote |
| `outcome` | `ok`, `rate_limited` (429), `server_error` (5xx), `auth` (401/403), `client_error`, `timeout`, `network`, `partial` (shard recusado ou `timed_out`), `invalid_body` |
| `status`, `durationMs` | resposta e quanto demorou (recusa rápida = fila cheia na porta; lenta = consulta que morreu lá dentro) |
| `headers` | `retry-after`, `x-ratelimit-*`, `ratelimit-*`, `server`, `via`, `x-kong-*`, `cf-*`, `date`: aparece se existe um gateway com limite por cliente |
| `errorTypes`, `node`, `poolSize`, `activeThreads`, `queuedTasks`, `queueCapacity`, `ewmaMs`, `body` (300 caracteres) | lidos do erro do Elasticsearch: qual nó recusou e a carga da fila de busca dele |
| `waitMs`, `gapMs`, `courtGapMs`, `lastMinute`, `lastHour`, `inFlight` | nosso ritmo: quanto esperamos, o intervalo desde a chamada anterior (qualquer tribunal e o mesmo), quantas chamadas no último minuto e hora, chamadas simultâneas |
| `instance`, `keyId` | qual processo e qual chave (8 caracteres do sha256, nunca a chave) |
| `took`, `timedOut`, `shards`, `hits`, `total`, `truncated`, `secret`, `found`, `missing` | no sucesso: tempo do Elasticsearch, shards, quantos vieram, se o `size` cortou resultados, sigilosos descartados, encontrados e faltantes |
| `errorName`, `errorCode`, `cause` | erro de rede: `ECONNRESET`, `ETIMEDOUT`, `UND_ERR_*`, DNS |

Além disso: `worker.started` com região e deployment da Railway e o IP público; `worker.court_refresh` com o IP do dia e os casos por tribunal; `worker.court_refresh_batch` com dia, casos e `notFound`; `worker.job_failed` / `worker.job_done` com `dedupeKey` (dia, tribunal e lote), tentativa, máximo, tempo na fila, duração, classe do erro e quando tenta de novo (`retryAt`, `final`). Métricas: `datajud_requests_total{court,outcome}` e `datajud_request_duration_seconds{court,outcome}`.

## Primeira evidência (2026-11-24, 01:08 de Brasília, máquina local, não a Railway)

Três chamadas, uma por tribunal, sem nenhuma chamada nossa no minuto anterior:

- TRT16: 429 depois de 33 s; `search_phase_execution_exception` → `es_rejected_execution_exception`, nó `instance-0000000010`, 10/10 threads ativas, 1000 tarefas na fila (capacidade 1000).
- TRT2: tempo esgotado aos 60 s.
- TRT24: 429 em 181 ms; nó `instance-0000000011`, 10/10 threads, 1001 na fila, EWMA 910 ms.
- Nenhum cabeçalho de limite (`retry-after`, `x-ratelimit-*`) nem de gateway (`via`, `server`): quem responde é o próprio Elasticsearch.

Leitura: o 429 é a fila de busca do cluster do CNJ cheia, compartilhada por todos os usuários da API pública, e não um limite sobre o nosso IP ou a nossa chave. Precisa ser confirmado com a Railway e em vários horários antes de decidir.

## Hipóteses e como os logs respondem

| # | Hipótese | Confirma se… | Descarta se… |
| --- | --- | --- | --- |
| H1 | Cluster do CNJ sobrecarregado (fila de busca cheia) | `errorTypes` com `es_rejected_execution_exception`, `queuedTasks` ≈ `queueCapacity`, de qualquer IP, sem cabeçalho de limite | 429 sem esses campos, ou só da Railway |
| H2 | Bloqueio ou limite pelo IP da Railway | 429 só com o IP da Railway (`ip` do `worker.court_refresh`), local passa no mesmo minuto; cabeçalhos de limite; corpo de gateway | o mesmo 429 do Elasticsearch de outro IP (já visto em 2026-11-24) |
| H3 | Limite pela chave pública | `outcome: auth` ou 429 com `keyId` antigo; muda quando a chave do CNJ muda | outras chaves recebem o mesmo |
| H4 | Horário de pico (todos consultam de madrugada) | `rate_limited` concentrado entre 03:00 e 07:00, `ok` em outro horário | taxa igual o dia todo |
| H5 | Nosso ritmo (1 s entre chamadas, rajada às 03:00) | 429 cresce com `lastMinute`/`gapMs` curto; some com intervalo maior | 429 com `lastMinute: 0` (já visto) |
| H6 | Lote grande pesa na busca | `durationMs`/`took` sobe com `numbers`; recusa mais nos lotes de 50 | lote de 1 número também recusado (já visto) |
| H7 | Índice de um tribunal específico lento ou quebrado | um `court` concentra `timeout`/`partial` | falha espalhada entre tribunais |
| H8 | Rede da Railway (DNS, reset) | `network` com `errorCode` | nenhum `network` |
| H9 | Mais de um worker consultando junto | `instance` diferentes no mesmo minuto; `inFlight` > 0 | uma instância só |
| H10 | `size` corta resultados (falso "não encontrado") | `truncated: true` com `missing` > 0 | `truncated` sempre falso |

## Possíveis soluções (escolher depois dos logs)

1. **Insistir melhor no mesmo dia** (H1, H4): espalhar os lotes pela madrugada e manhã em vez de todos às 03:00; backoff mais longo com jitter por tribunal; continuar no dia seguinte do ponto onde parou. Barato, sem infra nova.
2. **Respeitar a carga** (H1, H5): disjuntor por tribunal (depois de N recusas seguidas, pausa de X minutos); intervalo maior entre chamadas; lotes menores (`BATCH_SIZE` 10–20) se H6 se confirmar.
3. **Outro horário** (H4): rodar fora do pico observado (por exemplo 10:00–16:00), aceitando o aviso um pouco mais tarde.
4. **Trocar o IP a cada execução** (só se H2 se confirmar): consultar por AWS Lambda (cada execução fria pode sair por outro IP; o worker enfileira e a Lambda consulta e grava), por um proxy com rotação de IP ou por um serviço separado em outro provedor. Não ajuda contra H1: a fila do cluster é a mesma para todos.
5. **Infra própria só para a consulta** (H2, H8): um serviço pequeno noutro servidor ou região (Lambda, Fly.io, uma VM) que só consulta o Datajud e grava no banco, isolado do worker. Faz sentido se o problema for o endereço ou a rede da Railway.
6. **Falar com o CNJ** (H1, H3): pedir chave própria ou orientação de uso (horário e volume); acompanhar se há API paga ou acordo para quem consulta todo dia.
7. **Corrigir o `size`** (H10): pedir mais resultados por número ou paginar quando `truncated` aparecer.

## Como voltar aqui

1. Depois de uns 7 dias com o worker novo na Railway, filtrar os logs por `datajud.request` (Railway → serviço do worker → Logs, busca `datajud.request`) e por `worker.job_failed` com `court_refresh_batch`.
2. Contar `outcome` por tribunal e hora; olhar `errorTypes`, `queuedTasks`, `headers`, `ip`, `lastMinute` dos 429.
3. Marcar na tabela de hipóteses o que se confirmou e escolher a solução; registrar como AD nova (supersede a AD-287 se mudar o desenho) e tirar o item do roadmap.
