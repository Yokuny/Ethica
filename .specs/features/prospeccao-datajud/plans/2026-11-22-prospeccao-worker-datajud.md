# Plano — Worker do Datajud: prospecção processada fora do BFF

> **Arquivado em 2026-11-22 (AD-281)**: a base técnica do worker (fila, cliente Datajud, deploy) foi executada
> pela Automação Datajud (AD-277). A busca de prospecção foi abandonada e a Prospecção saiu do produto; a
> descoberta de nomeações fica para o DJEN, no roadmap.

> **Prioridade revisada (2026-11-22, mais tarde)**: o foco passou a ser a Automação Datajud (premium) e a
> Central de Notificações (`.specs/plans/2026-11-22-automacao-datajud-notificacoes.md`).
>
> Daqui continuam valendo como base técnica:
>
> - D1, D3, D4, D6 e D7;
> - a fila (seção 4);
> - o cliente Datajud (seção 6);
> - deploy e operação (seção 13).
>
> A ordem de fases e o "objetivo principal" (DJEN) abaixo ficam para depois daquele plano.

- **Data**: 2026-11-22
- **Status**: proposta (aguardando as decisões da seção 1)
- **Feature (slug sugerido)**: `prospeccao-worker`
- **Áreas**: `apps/worker` (novo), `apps/api`, `apps/web`, `packages/db`, `packages/contracts`, `tests/structural`, deploy (Railway)
- **ADs afetadas**: AD-105 (superseded), AD-039 (esclarecida, não muda), AD-147 (ajuste no escopo), AD-010/`tenantScoped` (exceção nova), AD-038 (fronteira estendida a um segundo app)

## 0. Resumo

Toda chamada ao Datajud sai do `apps/api` (BFF) e vai para um serviço novo, o `apps/worker`, com deploy próprio. Os dois serviços **só se comunicam pelo banco**, no mesmo cluster Atlas.

- O worker consulta o Datajud, normaliza os dados e grava resultados, cópias de processos, correspondências de buscas salvas, estatísticas e notificações.
- O BFF nunca chama o Datajud. Ele **lê** o que o worker gravou e **registra a intenção do usuário**: pedido de busca, busca salva, oportunidade, conversão em serviço e leitura de notificação.
- O pedido de busca vira um documento na fila (`DatajudJob`). A tela acompanha o resultado por polling.

Isso também cobre o que foi sugerido na análise anterior:

- robustez do cliente (retry, sigilo, shards com falha);
- presets por código TPU;
- busca em vários tribunais;
- acompanhamento de oportunidades e serviços;
- buscas salvas com aviso;
- painel de varas;
- spike do DJEN para "fui nomeado?".

> **Objetivo principal (revisado em 2026-11-22)**: o perito cadastra o próprio nome e o sistema encontra,
> no Diário de Justiça Eletrônico Nacional (DJEN), as publicações em que ele foi nomeado, no mesmo dia da
> publicação. A seção 1A detalha isso e as Fases 0, 1 e 2 passam a servir a esse objetivo. A prospecção pelo
> Datajud (busca por tribunal e movimento, acompanhamento, painel de varas) continua, mas depois.

---

## 1A. Nomeações pelo DJEN (objetivo principal)

### O que foi validado em 2026-11-22 (API pública `https://comunicaapi.pje.jus.br/api/v1/comunicacao`)

- **Acesso**: sem autenticação, resposta em cerca de 0,25 s, `x-ratelimit-limit: 20` por janela (o tamanho da janela ainda não foi medido) e cache de 120 s.
- **Busca por nome**: `texto=<nome>` com `dataDisponibilizacaoInicio`/`Fim`.
  - Busca **em todos os tribunais numa chamada** (`siglaTribunal` é opcional).
  - Os termos são combinados com E: um termo inexistente zera o resultado.
  - Não diferencia acento nem maiúsculas.
  - Janela de 1 ano aceita.
  - Paginação com `itensPorPagina=100` e `pagina`.
- **Conteúdo**: texto integral da decisão, mais `numeroprocessocommascara`, `siglaTribunal`, `nomeOrgao` (vara), `data_disponibilizacao`, `tipoComunicacao`, `tipoDocumento`, `link`, `hash`, `destinatarios` e `destinatarioadvogados`. Já vem com o número na máscara CNJ, o mesmo formato que o Ethica grava.
- **Exemplo real** (TRT2, 19/11/2026): "determino a realização de perícia contábil. Nomeio perito o sr. [nome], que deverá apresentar o laudo no prazo de 20 dias".
- **Amostra de um perito, 30 dias**: 285 publicações (todas `Intimação`) em 147 processos. Uma classificação simples por regex (verbo de nomeação e "perit" nos 200 caracteres antes do nome) deu:
  - 101 nomeações prováveis, em **51 processos distintos**;
  - 92 publicações sobre honorários;
  - 22 sobre laudo ou esclarecimentos;
  - 70 outras.

  A mesma decisão é publicada mais de uma vez, para cada destinatário. Os números servem para dimensionar o volume, não para medir a precisão do classificador.

### O que isso entrega e o que não entrega

- **Entrega**: a nomeação aparece no Ethica **no dia em que é disponibilizada no DJEN**, já com o número, o tribunal, a vara e o trecho da decisão. Isso acontece sem o perito ler o diário e sem esperar o e-mail da vara ou a intimação no PJe. Para comparação, o Datajud tem defasagem de T+1 a T+7 e **não tem o texto das decisões**, então não serve para busca por nome.
- **Não é previsão no sentido estrito**: a publicação **é** a nomeação. O ganho está em detectar mais cedo e de forma automática, e em converter em serviço com um clique.
- **Um sinal antecipado de verdade** (antes de o juiz nomear) é possível só de forma indireta: publicações e movimentos de "determino a realização de perícia" **sem nome**, nas varas onde o perito atua. Isso fica como extensão (seção 1A, "Depois").

### Desenho

| Collection | Tenant? | Grava | Conteúdo |
| --- | --- | --- | --- |
| `NominationWatch` | sim (por `User`) | BFF | Variações do nome a buscar (por exemplo, com e sem "Filho", com e sem nome do meio), tribunais opcionais para filtrar homônimos, `active`. O nome é dado pelo próprio usuário, para essa finalidade (base legal: consentimento e execução do serviço). |
| `NominationAlert` | sim | worker (cria), BFF (status) | `User`, `publicationId` (id do DJEN), `processNumber`, `court`, `courtUnit`, `availableAt`, `classification` (`nomination`, `fees`, `report`, `other`), **trecho** de cerca de 400 caracteres em volta do nome (não o texto inteiro), `link`, `reportDeadlineDays` extraído ("prazo de 20 dias"), `status` (`new`, `confirmed`, `dismissed`), `Case` quando convertido. Índice único `{Tenant, User, publicationId}`. |

- **Job `djen_scan`** (worker):
  - Agendado 3×/dia: o DJEN disponibiliza ao longo do dia útil. Um por `NominationWatch` ativa e por variação de nome.
  - Janela dos **últimos 3 dias**, com sobreposição. O índice único define o que é novo.
  - Paginação até o fim.
  - **Limite global** de cerca de 15 requisições por janela de rate limit (abaixo dos 20), com backoff em 429.
  - Com 1 chamada por variação e por execução, 300 peritos com 2 variações dão cerca de 1.800 chamadas por dia. É viável dentro do limite, a confirmar na Fase 0.
- **Classificação**: regras sobre o texto, sem IA, no mesmo espírito da AD-114 (extração da ata). Testes com fixtures reais anonimizadas. Publicações repetidas da mesma decisão (mesmo processo, mesma data e mesmo `hash` ou texto) viram um alerta só.
- **Homônimos**: o alerta mostra a vara e o trecho. O perito confirma ou descarta, e um descarte pode virar uma regra ("ignorar este tribunal").
- **Tela**: "Nomeações" no hub de prospecção, com a lista de alertas `new` e o trecho destacado. **"Converter em serviço"** reaproveita o `convertOpportunity` com o número, o tribunal, a vara, `nominationDate = availableAt` e o prazo do laudo sugerido.
- **Aviso**: este é o aviso de maior valor. A recomendação é avisar na hora: e-mail curto ("Nova nomeação no TRT2 · 23ª Vara do Trabalho") e push, quando `avisos-notificacoes` existir. Isso traz o envio de e-mail para o worker **ou** exige que a varredura do BFF rode com frequência maior que a diária. A decisão entra na D5, e o padrão sugerido é **o worker enviar** este aviso (o provedor Resend é um `fetch` de cerca de 50 linhas e pode ir para um pacote compartilhado).
- **Já cadastrado**: se o número já for um `Case` do tenant, o alerta vem marcado "já cadastrado" e não incomoda.

### Depois (extensões)

- Sinal antecipado: publicações "determino a realização de perícia" sem nome de perito, nas varas do perito (uma `CourtDivision` do tenant), como oportunidade.
- Acompanhar, pelo DJEN, as publicações seguintes dos processos convertidos (honorários, esclarecimentos), alimentando prazos.

### LGPD e termos de uso

- O texto das intimações traz nomes de partes. Guardar **só o trecho** e o `link` oficial, e aplicar TTL aos alertas descartados (por exemplo, 90 dias).
- Na Fase 0: ler os termos de uso da API Comunica e confirmar que o uso automatizado nesse volume é permitido.

---

## 1. Decisões a confirmar (cada uma com recomendação)

### D1 — "Projeto à parte": app novo no monorepo, deploy separado (recomendado)

| Opção | Prós | Contras |
| --- | --- | --- |
| **`apps/worker` no monorepo, serviço Railway próprio** (recomendado) | Mesmos models do `@ethica/db` (único dono do `mongoose`, AD-010) e mesmos schemas do `@ethica/contracts`, então não há como os dois serviços divergirem sobre o formato da collection. Um CI só (`pnpm run check`). O teste estrutural garante que um app não importa o outro. | O repo cresce um app. |
| Repositório separado | Isolamento total de código. | Models Mongoose **duplicados** sobre o mesmo banco: qualquer campo novo precisa mudar nos dois repos ao mesmo tempo, e um esquecimento corrompe dados. Exigiria publicar `@ethica/db` e `@ethica/contracts` como pacotes versionados. Dois CIs. |

Com banco compartilhado, o contrato entre os serviços **é o schema das collections**. Ele precisa ter um dono só, que é o `packages/db`. O que torna o worker um microserviço é ter **processo, deploy, escala e falha independentes**, e isso a opção recomendada entrega.

**Nome**: `apps/worker`, e não `apps/datajud`. Assim, outra rotina de fundo que saia do BFF no futuro (ver D5) entra no mesmo deploy sem criar um terceiro serviço. Neste plano, o único domínio dele é o Datajud.

### D2 — O que o BFF ainda grava ("apenas consulta" na prática)

"Apenas consulta" não pode ser literal. O `convertOpportunity` precisa chamar `caseService.createCase` de forma síncrona e devolver o `caseId` (AD-038), e salvar ou descartar uma oportunidade é decisão do usuário sobre dado do tenant. A regra proposta:

- **O BFF nunca chama o Datajud** e não tem `DATAJUD_API_KEY`.
- **O BFF grava só a intenção do usuário**: `DatajudJob` do tipo `search` (pedido de busca), `SavedSearch`, `Opportunity` (CRUD e conversão, como hoje), `Notification.readAt` e `Opportunity.seenAt`.
- **O worker grava todo dado derivado do Datajud**: resultado de busca, `CourtProcess`, `SearchMatch`, `CourtUnitStat`, `Notification` e `WorkerHeartbeat`.

### D3 — A camada `apps/api/src/events` não serve para isso (resposta à sugestão)

A camada `events/` é um `EventEmitter` **dentro do processo do BFF** (AD-039): fire-and-forget, sem retry e sem garantia de entrega. Uma falha só vai para o log, e um restart perde o que estava em andamento.

Colocar as operações do Datajud ali deixaria o processamento **no mesmo processo do BFF**, que é o oposto do objetivo, e perderia buscas a cada deploy.

O papel de "evento entre serviços" fica com a **collection `DatajudJob`**, que é persistente, tem retry e sobrevive a restart. A camada `events/` continua como está, para efeitos internos do BFF.

### D4 — Fila e agendamento: collection própria no Mongo (recomendado)

| Opção | Infra nova | Avaliação |
| --- | --- | --- |
| **Collection `DatajudJob` com claim atômico (`findOneAndUpdate`) e lease** (recomendado) | nenhuma | Cerca de 150 linhas. É o mesmo padrão de "trava por índice único" da AD-147, já aceito no projeto. Dá prioridade, retry, dedupe e TTL. Escala para mais réplicas sem duplicar trabalho. |
| Agenda.js / Pulse (fila sobre Mongo) | nenhuma | Resolve, mas é uma dependência pouco mantida e traz conceitos próprios. Vale reconsiderar só se a fila caseira crescer além do previsto. |
| BullMQ | **Redis** | Quebra a regra de "só um cluster de banco" e acrescenta infra. Descartado. |
| Railway Cron (serviço que sobe no horário) | um serviço por cron | Bom para tarefa pontual, mas a busca interativa exige um processo sempre de pé. Pode substituir o agendador interno no futuro. |
| Change streams para acordar o worker | nenhuma (o Atlas suporta) | Reduz a latência de cerca de 1 s para quase zero, ao custo de lidar com resume token e reconexão. **Fica como otimização opcional**: polling a cada 1 s com backoff até 5 s quando ocioso já basta, porque o próprio Datajud leva de 1 a 40 s. |

**Agendamento**: um laço no worker com intervalo fixo (por exemplo, a cada 5 min) que **só enfileira** jobs com `dedupeKey` determinística, como `refresh_tracked:2026-11-22`. O índice único impede que um mesmo período rode duas vezes, mesmo com duas réplicas ou com restart.

### D5 — Notificações

- **O worker grava `Notification`** (in-app, por tenant). O BFF lista e marca como lida, e a tela ganha um sino.
- **E-mail e push**: recomendo **não** trazer o provedor de e-mail para o worker agora. A varredura de avisos da feature `avisos-notificacoes` (AD-147, ainda não implementada) passa a ler também as `Notification` de prospecção e as inclui no consolidado diário. Assim:
  - um único lugar envia e-mail e respeita as preferências por pessoa (AD-110);
  - o worker continua dedicado ao Datajud;
  - nada de `providers/mail` duplicado.
- **O sino precisa ser confirmado com a perita**: a spec de `avisos-notificacoes` lista a "central de notificações dentro do app" como **fora do escopo** ("não pedido"). Se a perita recusar, a `Notification` continua sendo o registro que o consolidado de e-mail lê, e as marcas "nova movimentação" e "novos processos" aparecem só nas telas de prospecção, sem sino.
- **Evolução possível**: quando a varredura de avisos for implementada, ela pode nascer no `apps/worker` em vez de no processo da API, o que tira o cron do BFF (exige mover `providers/mail` para um pacote). Isso é uma AD nova que ajusta o escopo da AD-147 e fica para a feature `avisos-notificacoes`.

### D6 — Índices e migrações com dois serviços no mesmo banco

- Cada serviço chama `createIndexes` **só dos models que ele possui**: `syncIndexes` em `packages/db/src/index.ts` passa a receber a lista de models por dono (`apiModels`, `workerModels`).
- **Migrações de dados** (`migrateCases`, `backfillCalendarEntries`) e `provisionSearchIndexes` continuam **só no `apps/api`**.
- Ordem de deploy: o model novo entra no `packages/db` no mesmo commit em que o serviço dono passa a usá-lo.

### D7 — Collections globais (fora do `tenantScoped`)

`CourtProcess`, `CourtUnitStat` e o resultado de `DatajudJob` do tipo `search` são **dados públicos do CNJ**, iguais para todo tenant. Guardá-los por tenant multiplicaria chamadas ao Datajud e cópias.

É preciso uma **AD de exceção** à regra "todo filtro passa por `tenantScoped`". Ela vale só para essas collections, que **não podem ter nenhum dado de tenant**. O vínculo com o tenant fica sempre do lado do tenant (`Opportunity`, `Case`, `SavedSearch`, `SearchMatch`, `Notification`).

---

## 2. Arquitetura alvo

```
apps/web ──HTTP──▶ apps/api (BFF)                               apps/worker
                    │  lê: CourtProcess, resultado do job,        │  laço da fila (claim + lease)
                    │      SearchMatch, CourtUnitStat,            │  agendador (só enfileira)
                    │      Notification, WorkerHeartbeat          │  cliente Datajud robusto
                    │  grava: DatajudJob(search), SavedSearch,    │  grava: CourtProcess, SearchMatch,
                    │      Opportunity, Notification.readAt       │      CourtUnitStat, Notification,
                    ▼                                              ▼      resultado do job, heartbeat
              ┌──────────────── MongoDB Atlas (um cluster, um banco) ────────────────┐
              └───────────────────────────────────────────────────────────────────────┘
                                                                   │
                                                                   ▼
                                                   API Pública do Datajud (CNJ)
```

Os dois apps importam só `@ethica/db` e `@ethica/contracts`. Nenhum importa o outro, e isso é verificado por teste estrutural.

### Fluxo da busca interativa

1. A tela envia `POST /prospecting/searches` com os filtros e o cursor.
2. O BFF valida e aplica o rate limit por tenant e IP (o atual `datajudSearchRateLimit`).
3. O BFF faz upsert de um `DatajudJob` com `kind: 'search'`, `priority: 0` e `dedupeKey = hash(filtros + cursor)`. A mesma busca de outro tenant nos últimos 10 min reaproveita o job, o que funciona porque o dado é público. O BFF devolve `{ id }`.
4. O worker faz o claim, chama o Datajud e grava `result: { items, cursor, partial }` no próprio job.
5. A tela consulta `GET /prospecting/searches/:id` com `refetchInterval` de cerca de 1,5 s enquanto o status for `queued` ou `running`.
   - O BFF marca os itens que já são oportunidade do tenant (o mesmo `findIdsByNumbers` de hoje).
   - Com `partial: true`, a tela avisa: "o tribunal respondeu parcialmente".
   - Se o heartbeat estiver velho e o job ainda estiver em `queued`, a tela mostra "serviço de busca indisponível" em vez de girar para sempre.
6. "Carregar mais" cria um job novo com o cursor.

---

## 3. Modelo de dados (`packages/db`)

| Collection (model) | Tenant? | Grava | Lê | Conteúdo | Índices / TTL |
| --- | --- | --- | --- | --- | --- |
| `DatajudJob` | não | BFF (só `search`), worker (demais tipos, status e resultado) | worker, BFF (status e resultado da busca) | `kind` (`search`, `refresh_tracked`, `refresh_process_batch`, `run_saved_search`, `court_unit_stats`, `djen_scan`), `payload`, `priority`, `status` (`queued`, `running`, `done`, `failed`), `attempts`, `runAt`, `lockedUntil`, `lockedBy`, `error`, `result`, `dedupeKey`, `finishedAt` | `{status, priority, runAt}`; `dedupeKey` único e parcial (`status ∈ queued, running` **ou** janela do agendador); TTL de 24 h em `finishedAt` para `search` e de 30 dias para o resto |
| `CourtProcess` | **não** (D7) | worker | BFF | `processNumber`, `court`, classe (código e nome), assuntos (código e nome), órgão julgador (código, nome, IBGE), `filingDate`, `sourceUpdatedAt` (`dataHoraUltimaAtualizacao`), `movements[]` (código, nome, data e hora, complementos), `fetchedAt`. **Nunca grava processo com `nivelSigilo > 0`. Nunca grava `partes`.** | `{court, processNumber}` único |
| `SavedSearch` | sim | BFF | worker | `name`, `filters` (mesmo schema da busca, mais `preset` e `courts[]`), `notify`, `User` (autor), `active` | `{Tenant, active}` |
| `SearchMatch` | sim | worker | BFF | `SavedSearch`, `processNumber`, `court`, resumo do processo, `matchedAt`, `seenAt` | `{SavedSearch, processNumber}` único (a dedupe é o que define "novo") |
| `CourtUnitStat` | **não** (D7) | worker | BFF | `court`, `preset`, `period`, `courtUnitCode`, `courtUnitName`, `count` | `{court, preset, period}` |
| `Notification` | sim | worker (cria), BFF (`readAt`) | BFF | `kind` (`process_updated`, `saved_search_matches`), `title`, `link`, `refs`, `readAt` | `{Tenant, readAt, createdAt}`; TTL de 90 dias |
| `WorkerHeartbeat` | não | worker | BFF | `instance`, `beatAt`, `version`, `queueDepth` | `instance` único |
| `Opportunity` (existe) | sim | BFF | worker (lê o que acompanhar) | + `seenAt` (quando o usuário viu o processo pela última vez) | — |

Destinatários da notificação: por tenant, mostrada a quem tem `can('prospecting','view')`. Isso é pergunta em aberto (seção 10).

**Contrato entre os serviços em `@ethica/contracts`**:

- Um schema Zod por `kind` para o `payload` e para o `result` do `DatajudJob`. O BFF valida ao gravar o pedido e ao ler o resultado; o worker valida ao fazer o claim.
- O tipo do processo normalizado (hoje `DatajudProcess`, dentro do `datajudClient.ts` e importado por `opportunity.schema.ts`) vai para lá, porque o BFF continua precisando dele depois que o client sai.
- **Formato único de `processNumber`**: a máscara CNJ (`processNumberSchema`), que é o que `Opportunity` e `Case` já gravam. O worker converte os dígitos do Datajud na leitura (`formatCnjNumber`) e volta a dígitos só ao montar a query. Sem isso, as junções `$in` entre `CourtProcess` e `Opportunity`/`Case` não batem.

**Termos novos no `docs/glossary.md` antes do código** (AD-140): `CourtProcess` (processo no tribunal, cópia do Datajud), `SavedSearch` (busca salva), `SearchMatch` (processo encontrado por busca salva), `CourtUnitStat`, `Notification` e `DatajudJob`.

---

## 4. Fila (detalhe do D4)

- **Claim**: `findOneAndUpdate({status:'queued', runAt:{$lte:now}} ou {status:'running', lockedUntil:{$lt:now}}, {$set:{status:'running', lockedBy, lockedUntil: now+lease}, $inc:{attempts:1}}, {sort:{priority:1, runAt:1}})`. Um job com lease vencido (worker que morreu) volta a ser pego.
- **Prioridade**: `search` = 0 (a pessoa está esperando); o resto ≥ 10. Há uma vaga reservada para `search`: com concorrência N, no máximo N−1 jobs de fundo rodam ao mesmo tempo, então uma busca nunca espera um `refresh` de 40 s.
- **Retry**: falha recuperável (timeout, 429, 5xx, `es_rejected_execution_exception`, `_shards.failed` em job de fundo) volta para `queued` com `runAt = now + backoff exponencial com jitter`, até um máximo de tentativas, depois `failed`. Para `search`, o máximo é 2 tentativas rápidas, porque a pessoa está esperando. Falha não recuperável (400, query inválida) vai direto para `failed`.
- **Circuit breaker por tribunal**: em memória no worker. Depois de X falhas seguidas no tribunal, os jobs de fundo daquele tribunal são adiados por Y minutos.
- **Encerramento**: no SIGTERM, o worker para de fazer claim, espera os jobs em curso até um limite de tempo e devolve os demais para `queued`.

## 5. Agendamentos (o laço do agendador só enfileira, com `dedupeKey`)

Os horários seguem `America/Sao_Paulo` (AD-036).

| Job | Quando | O que faz |
| --- | --- | --- |
| `refresh_tracked` | 1×/dia (madrugada) | Lista os números acompanhados: `Opportunity` com status `new` ou `under_review` mais `Case` ativo com número CNJ (critério exato no design). Agrupa por tribunal, tirando o tribunal do número CNJ, e enfileira `refresh_process_batch` com até 100 números por consulta (`terms` em `numeroProcesso`, a validar na Fase 0). Pula tenant suspenso (AD-098). |
| `refresh_process_batch` | enfileirado pelo anterior | Faz upsert de `CourtProcess`. Quando `sourceUpdatedAt` muda, cria `Notification(process_updated)` para cada tenant que acompanha o processo. |
| `run_saved_search` | 1×/dia (06:00), um por `SavedSearch` ativa | Roda os filtros com uma janela que **cobre a defasagem do Datajud**: os últimos 10 dias (configurável), e não "desde a última execução", senão um movimento indexado com atraso de T+7 fica fora para sempre. O que define "novo" é só o índice único de `SearchMatch`. As inserções novas geram **uma** `Notification(saved_search_matches)` por busca e por execução. |
| `court_unit_stats` | 1×/semana | Agregação `terms` por órgão julgador × preset × tribunal no período, gravada em `CourtUnitStat`. |
| `djen_scan` | 1×/dia, **só se a Fase 7 aprovar** | Procura publicações com o nome ou o documento do perito. |
| limpeza | — | O TTL do Mongo cuida disso; não há job. |

Volume e frequência ficam configuráveis por env. O Datajud tem defasagem de T+1 a T+7 dias, então mais de uma atualização por dia não traz ganho.

## 6. Cliente Datajud no worker (o que vem do `mcp-juridico-brasil` e o que é novo)

O ponto de partida é `apps/api/src/providers/datajudClient.ts` (movido, não reescrito do zero). A ele se somam:

1. **Retry com backoff e jitter e rate limit global** (requisições por segundo e concorrência por env), no padrão de `mcp-juridico-brasil/src/mcp_juridico_brasil/_core/http.py`. Timeout de 60 s.
2. **`_shards.failed > 0`** vira `partial: true` na busca interativa e falha recuperável no job de fundo. Hoje isso aparece como "nenhum processo encontrado", o que é falso.
3. **Sigilo**: descarta todo hit com `nivelSigilo > 0` e não grava nem loga dados dele (padrão de `datajud/client.py`).
4. **Tribunal pelo número CNJ**: o Ethica **já tem** essa regra em `courtUnitFromNumber` (`apps/api/src/modules/case/import.service.ts`, usada na importação). Ela vai para `@ethica/contracts`, porque o worker não pode importar `apps/api` e o formulário web também precisa dela. Uma função auxiliar converte o resultado (`TRT2`) no alias do índice (`trt2`). Não se porta a versão Python do MCP. Na busca por número, o seletor de tribunal deixa de ser obrigatório.
5. **Leitura completa**: todos os movimentos com `codigo` e `complementosTabelados`, códigos de assunto, classe e órgão julgador. A tradução de nomes do Datajud fica no client (regra do `AGENTS.md`).
6. **Presets por código TPU**: `DATAJUD_PRESETS` em `@ethica/contracts`, com `key`, `movementCodes`, `subjectCodes` e `courtTypes`. A query usa `terms` em `movimentos.codigo` / `assuntos.codigo`. **Os códigos saem da Fase 0, com evidência**, e não da memória.
7. **Janela de datas com pós-filtro**: `movimentos` **não é nested** (testado em 2026-11-22: a query `nested` em `api_publica_trt2` falha com "failed to find nested object under path [movimentos]"). Um `range` em `movimentos.dataHora` combinado com um código de movimento pode juntar movimentos diferentes do mesmo processo. O worker então pede um pouco a mais e confere no próprio processo se o **mesmo** movimento tem o código e a data.
8. **Vários tribunais**: a busca recebe `courts[]` (no máximo 6 na interativa e sem limite nas de fundo), com fan-out de concorrência limitada. O cursor vira um mapa `{court: sort}`.
9. **Fixtures reais** gravadas na Fase 0 (resposta normal, parcial, sigilosa e com assunto em lista aninhada) para os testes unitários.

---

## 7. Reestruturação do `apps/api` (BFF)

### Sai (no mesmo commit da virada, sem shim)

- `apps/api/src/providers/datajudClient.ts` e `datajudClient.unit.test.ts` são apagados (a versão reforçada já está no `apps/worker` desde a Fase 1).
- A injeção de `datajud` em `apps/api/src/app.ts` e `ProspectingRouterDeps.datajud`.
- `DATAJUD_API_KEY` e `DATAJUD_BASE_URL` em `apps/api/src/config/env.config.ts`, `.env.example` e `RUN_BOOK.md` (passam a ser env do worker).
- `opportunityService.searchDatajud` e a rota `POST /prospecting/datajud/search`.
- Os testes de `searchDatajud` em `opportunity.service.unit.test.ts`.

### Fica

- O CRUD de `Opportunity`, `convertOpportunity` (síncrono com `caseService`), `opportunityStats` e `listForExport` (DOC-04).
- O rate limit, agora aplicado a `POST /prospecting/searches`. A entrada em `activityLog.middleware.ts` muda para o novo caminho.

### Entra

| Rota | Permissão | O que faz |
| --- | --- | --- |
| `POST /prospecting/searches` | `prospecting:view` | Cria ou reaproveita o `DatajudJob` de busca e devolve `{ id }`. |
| `GET /prospecting/searches/:id` | `prospecting:view` | Status, itens (marcados com `opportunityId`), `cursor` e `partial`. |
| `GET /prospecting/processes/:court/:number` | `prospecting:view` ou `expert_cases:view` | `CourtProcess` com a linha do tempo dos movimentos (detalhe da oportunidade e do serviço). |
| `PATCH /prospecting/opportunities/:id/seen` | `prospecting:view` | Grava `seenAt`. |
| `GET/POST/PATCH/DELETE /prospecting/saved-searches` | view / create / update / delete | CRUD de `SavedSearch`. |
| `GET /prospecting/saved-searches/:id/matches`, `PATCH .../matches/:matchId/seen` | `prospecting:view` | Correspondências e "visto". |
| `GET /prospecting/court-units/stats` | `prospecting:view` | Leitura de `CourtUnitStat`. |
| `GET /notifications`, `PATCH /notifications/:id/read` | qualquer papel do tenant | Sino. O módulo dono fica para o design (provavelmente `identity` ou um módulo `notifications`). |
| `GET /prospecting/worker-status` | `prospecting:view` | `WorkerHeartbeat` (a tela avisa quando o worker cai). |

A listagem de oportunidades ganha a marca "nova movimentação" (`CourtProcess.sourceUpdatedAt > Opportunity.seenAt`), com uma consulta `$in` por lote (padrão da AD-038).

Os schemas novos entram em `@ethica/contracts` (os compartilhados com o web) ou em `modules/schema.registry.ts` (os locais), com o teste `schema-registry.structural.test.ts` cobrindo.

## 8. Mudanças no `apps/web`

- `apps/web/src/routes/_private/prospecting/search/@hooks/use-search-datajud.ts`: o `useMutation` vira "criar job" mais `useQuery` com `refetchInterval` até `done` ou `failed`. Mostra o aviso de resultado parcial e o de worker indisponível.
- Formulário de busca:
  - seletor de **preset** ("Possível nomeação de perito", "Laudo juntado"…), com nomes confirmados com a perita;
  - **janela de datas**;
  - **vários tribunais** (multiselect por região);
  - número CNJ **sem exigir tribunal**.
- `opportunities/`: marca "nova movimentação", detalhe com a linha do tempo de movimentos e `seenAt` ao abrir.
- Novo `prospecting/saved-searches/` (lista, criar a partir da busca atual, correspondências) e card no hub `prospecting/index.tsx`.
- Novo `prospecting/court-units/` (painel por vara, com `chart` do `packages/ui`). Ação "adicionar aos contatos" que cria a `CourtDivision` (AD-151), o que ajuda a pendência RSV-05.
- Detalhe do serviço (`expert-cases/details`): seção "Movimentações no tribunal" lendo `CourtProcess`.
- Sino de notificações no layout `_private`.
- Toda chave de tradução nova passa pelo dicionário antes (regras do `AGENTS.md`).

## 9. `apps/worker` — estrutura proposta

```
apps/worker/
  package.json            # deps: @ethica/db, @ethica/contracts, zod, prom-client
  src/
    server.ts             # env → connect → syncIndexes(workerModels) → health/metrics HTTP → fila → agendador
    config/env.config.ts  # MONGODB_URI, DATAJUD_API_KEY, DATAJUD_BASE_URL, WORKER_CONCURRENCY,
                          # DATAJUD_RPS, SCHEDULER_*; fail-fast como o do api
    queue/                # claim, laço, retry/backoff, registro de handlers por kind
    datajud/              # client.ts (movido do api), query.ts, parse.ts, courts.ts (CNJ → índice), fixtures/
    jobs/                 # search, refresh-tracked, refresh-process-batch, saved-search, court-unit-stats
                          # cada job → *.repository.ts para o banco (mesmo padrão do api)
    scheduler.ts          # laço que enfileira com dedupeKey
```

Sem Express: um `node:http` mínimo atende `/health` (Mongo ok e heartbeat recente) e `/metrics` (`prom-client`).

## 10. Perguntas em aberto para a perita (tabela "Assumptions" da spec)

| Assunto | Padrão proposto |
| --- | --- |
| Sino de notificações no app (a spec de `avisos-notificacoes` o deixou fora por "não pedido") | Sim, só para avisos de prospecção, ou nenhum sino (ver D5) |
| Quem vê a notificação de prospecção | Todos do tenant com `prospecting:view` |
| Aviso de busca salva | Diário, no consolidado de e-mail (quando `avisos-notificacoes` existir) e no sino |
| Processos acompanhados | Oportunidades `new`/`under_review` mais serviços ativos com número CNJ |
| Nomes dos presets | A definir com os códigos TPU da Fase 0 |
| Painel de varas | Contagem dos últimos 12 meses por preset |

---

## 11. Cobertura das sugestões anteriores

| Sugestão | Onde entra |
| --- | --- |
| Retry com backoff e rate limit | Fase 1 (seção 6, item 1) |
| Bloqueio por `nivelSigilo` | Fase 1 (seção 6, item 3) |
| Tribunal pelo número CNJ | Fase 1 (cliente) e Fase 2 (tela) |
| `_shards.failed` sem falso "nenhum resultado" | Fase 1 e Fase 2 |
| Leitura completa de movimentos | Fase 1 (cliente) e Fase 3 (`CourtProcess` e linha do tempo) |
| Acompanhar oportunidades e serviços | Fase 3 |
| Presets por código TPU e janela de datas com pós-filtro | Fase 4 |
| Busca em vários tribunais | Fase 4 |
| Buscas salvas com alerta | Fase 5 |
| Notificações (sino; e-mail pela varredura de avisos) | Fase 5 |
| Painel por vara | Fase 6 |
| "Fui nomeado?" (DJEN) — **objetivo principal** | Fase N (seção 1A), logo após a Fase 1 |

## 12. Fases

**Ordem de execução revisada (objetivo principal, seção 1A)**: Fase 0 (com o DJEN) → Fase 1 (esqueleto do worker) → **Fase N (nomeações pelo DJEN)** → Fase 2 → Fases 3 a 6. A antiga Fase 7 deixa de ser spike: a API foi validada em 2026-11-22.

Estimativas em dias de uma pessoa, aproximadas. Cada fase termina verde no `pnpm run check`, com registro (`feature.md`, `roadmap.md`, `pnpm docs:sync`) e push na `main`, conforme o `AGENTS.md`.

### Fase 0 — Descoberta e documentação (2–3 d) · **porta de entrada**

1. **Validar o Datajud com a API real** (em 2026-11-22 o cluster recusava consultas com `es_rejected_execution_exception` e respostas de cerca de 40 s, então nada do formato abaixo foi observado):
   - Gravar fixtures reais (TRT2, TJSP, TRF3) e confirmar a presença de `nivelSigilo`, `movimentos[].codigo`, `complementosTabelados` e `partes`.
   - Confirmar se `range` em `movimentos.dataHora` e `@timestamp` se comportam como esperado. Um teste com `now-30d` no TRT2 devolveu só 2 processos, o que é implausível.
   - Medir latência e erro por tribunal em horários diferentes.
   - Testar `terms` em `numeroProcesso` com 100 números (base do `refresh_process_batch`).
   - Testar uma agregação `terms` em `orgaoJulgador.codigo` sobre um tribunal inteiro com janela de 12 meses (base da Fase 6). A única medida até agora levou 41 s para 2 documentos. Se não for viável, o painel passa a ser calculado a partir dos `SearchMatch` e dos resultados já coletados, em vez de agregar no Datajud.
   - Ler os termos de uso da API Pública (limites de volume).
2. **Levantar os códigos TPU** de movimentos e assuntos ligados a perícia (SGT/TPU do CNJ) e conferir que aparecem nos índices de TRT, TJ e TRF. Correção do que foi dito antes: a busca por "perito" com 0 resultados foi feita com o cluster rejeitando shards e **não prova nada** sobre os nomes dos movimentos.
3. Escrever `spec.md`, `design.md` e `tasks.md` em `.specs/features/prospeccao-worker/` (skill `ethica-spec-driven`) e confirmar com a perita a tabela da seção 10.
4. ADs em `.specs/STATE.md` (próximo número livre, hoje AD-257):
   - serviço `apps/worker` e comunicação só pelo banco (supersede a AD-105 em "chamado só pelo `apps/api`" e "não persiste resultado");
   - fila `DatajudJob`;
   - exceção do `tenantScoped` para collections globais (D7);
   - índices por dono (D6);
   - notificações (D5).
5. Termos novos no `docs/glossary.md`. Atualizar `docs/architecture.md` (diagrama com o worker).

**Saída**: fixtures, códigos TPU com evidência, spec/design/tasks e ADs. Se o Datajud não sustentar `terms` em lote ou o pós-filtro de data, as Fases 3–5 são replanejadas antes de começar.

### Fase 1 — Esqueleto do worker e cliente robusto (3–4 d)

- Models `DatajudJob` e `WorkerHeartbeat` no `packages/db`, e `syncIndexes` por dono (D6).
- `apps/worker`: env, boot, fila (claim, lease, prioridade, retry, encerramento), heartbeat, `/health`, `/metrics`, agendador vazio.
- `datajud/client.ts` no worker, **copiado** do `apps/api/src/providers/datajudClient.ts` e reforçado (seção 6, itens 1–5). O handler `search` já funciona.
  - **Exceção consciente ao "sem estrutura antiga ao lado da nova"**: durante a Fase 1, o client existe nos dois apps, porque o BFF ainda o usa e cada fase precisa terminar verde. A cópia do api é **apagada no commit da Fase 2**, e o intervalo entre as duas fases deve ser curto.
  - Também na Fase 1: `courtUnitFromNumber`, o tipo do processo normalizado e os schemas de job vão para `@ethica/contracts` (seção 3), e o api passa a importá-los de lá.
- `vitest.config.ts`: `apps/worker` nos projects `unit` e `integration`.
- Teste estrutural: `apps/worker` não importa `apps/api` e vice-versa. O `mongoose-boundary` passa a varrer o worker. `DB_OWNERSHIP` ganha o dono `worker`.
- `Dockerfile.worker` (sem chromium nem fontes) e o serviço Railway. Serviço `worker` no `docker-compose.yml` e `pnpm dev:worker`.
- **Aceite**:
  - o job `search` inserido à mão no banco é processado;
  - um job com lease vencido é retomado;
  - um job duplicado (mesma `dedupeKey`) não é criado;
  - uma resposta com `_shards.failed` dá `partial`;
  - um hit sigiloso é descartado.

### Fase 2 — Virada da busca para o worker (3 d)

- BFF: `POST/GET /prospecting/searches` e `worker-status`; sai tudo o que a seção 7 lista ("Sai").
- Web: hook com polling, avisos de parcial e de indisponível, número CNJ sem tribunal.
- **Sequência**: o worker da Fase 1 já está em produção, e esta fase é **um commit só** (BFF, web e remoções). O rollback é reverter esse commit.
- **Aceite**:
  - busca de ponta a ponta local (compose com mongo, api e worker);
  - e2e do BFF com o job resolvido por um worker simulado no teste (grava o resultado direto na collection);
  - `DATAJUD_*` não existe mais no api.

### Fase 3 — Processos acompanhados (3–4 d)

- Model `CourtProcess`, jobs `refresh_tracked` e `refresh_process_batch` e `Opportunity.seenAt`. Nesta fase, a novidade aparece só como a marca "nova movimentação" (comparação de `sourceUpdatedAt` com `seenAt`). A `Notification` entra na Fase 5, junto com o lugar onde ela é vista.
- BFF: `GET /prospecting/processes/...`, marca "nova movimentação" e `PATCH .../seen`.
- Web: linha do tempo na oportunidade e no serviço.
- **Aceite**:
  - uma mudança de `sourceUpdatedAt` acende a marca "nova movimentação", que some depois de `seen`;
  - um processo que vira sigiloso é apagado do `CourtProcess`.

### Fase 4 — Presets, janela de datas e vários tribunais (2–3 d)

- `DATAJUD_PRESETS` (códigos da Fase 0), pós-filtro de data e fan-out por tribunal com cursor em mapa. Formulário atualizado.
- **Aceite**: os testes do pós-filtro com fixture de processo em que o código e a data vêm de movimentos diferentes **não** dão match.

### Fase 5 — Buscas salvas e notificações (4–5 d)

- Models `SavedSearch`, `SearchMatch` e `Notification`, o job `run_saved_search`, a `Notification(process_updated)` no `refresh_process_batch`, e as rotas e telas da seção 7. O sino entra se a perita confirmar (D5).
- Integração com o consolidado de e-mail **quando** `avisos-notificacoes` for implementada (D5). Até lá, só o sino.
- **Aceite**:
  - a segunda execução no mesmo dia não duplica (`dedupeKey`);
  - um processo já visto não gera aviso de novo (índice único em `SearchMatch`).

### Fase 6 — Painel por vara (2–3 d)

- Job `court_unit_stats`, `CourtUnitStat`, rota, tela com gráfico e ação "adicionar aos contatos" (`CourtDivision`).

### Fase N — Nomeações pelo DJEN (4–6 d) · **executada logo depois da Fase 1**

- Desenho na seção 1A.
- **Fase 0, itens do DJEN**:
  - medir o tamanho da janela do rate limit;
  - ler os termos de uso;
  - gravar fixtures (nomeação, honorários, laudo, homônimo, publicação duplicada);
  - medir a precisão do classificador em cerca de 200 publicações rotuladas à mão;
  - confirmar com a perita as variações de nome e o aviso imediato.
- **Entregas**:
  - `NominationWatch` e `NominationAlert` no `packages/db`;
  - client DJEN e job `djen_scan` no worker, com limite global;
  - rotas no BFF (CRUD do watch, lista e status dos alertas, conversão);
  - tela "Nomeações" e configuração do nome na conta;
  - aviso imediato (D5).
- **Aceite**:
  - uma nomeação publicada hoje aparece no Ethica na execução seguinte do `djen_scan`;
  - a publicação repetida para vários destinatários gera um alerta só;
  - uma nova execução não duplica;
  - um 429 não perde a janela;
  - converter cria o serviço com número, vara, data da nomeação e prazo sugerido.
- O módulo `dje/` do `mcp-juridico-brasil` **não serve**: ele é o Domicílio Judicial Eletrônico, está em mock e exige certificado ICP-Brasil. A API Comunica do DJEN é outra e é pública.

## 13. Deploy e operação

- **Railway**: segundo serviço do mesmo repo com `Dockerfile.worker` e arquivo de configuração próprio (`railway.worker.json`, com healthcheck em `/health` e restart `ON_FAILURE`). Watch paths: `apps/worker/**`, `packages/db/**` e `packages/contracts/**`. Uma réplica basta; a fila e o agendador aceitam mais sem duplicar.
- **Atlas**: mesmo cluster e mesmo banco. Recomendo **um usuário de banco próprio para o worker**, com papel customizado:
  - `readWrite` em `datajudjobs`, `courtprocesses`, `searchmatches`, `courtunitstats`, `notifications` e `workerheartbeats`;
  - `read` em `opportunities`, `cases`, `savedsearches` e `tenants`.

  Assim, um bug no worker não toca dado de negócio. Use `maxPoolSize` pequeno (cerca de 10) no worker, para não disputar conexões com o BFF.
- **Observabilidade**: logs JSON no mesmo formato do api (`{event: ...}`). Métricas:
  - `worker_jobs_total{kind,status}`
  - `datajud_request_seconds{court}`
  - `datajud_errors_total{court,reason}`
  - `worker_queue_depth`

  Painel em `ops/grafana`. Alerta para heartbeat sem atualizar há mais de 5 min e para fila de `search` com mais de N itens.
- **Segredos**: `DATAJUD_API_KEY` só no worker.

## 14. Riscos

| Risco | Mitigação |
| --- | --- |
| Datajud sobrecarregado ou lento (observado em 2026-11-22) | Retry, circuit breaker por tribunal, `partial`, aviso na tela e prioridade para a busca interativa |
| Formato real diferente do suposto (`partes`, códigos, datas) | Porta da Fase 0 com fixtures reais |
| Cota ou termos de uso da API pública | Dedupe global da busca, lote de 100 números, 1 atualização por dia e limite por env |
| Defasagem de T+1 a T+7 do Datajud | Comunicar na tela ("dados do CNJ podem ter alguns dias de atraso") |
| Dois serviços escrevendo no mesmo banco | Dono único por collection (D2 e seção 3), usuário Atlas com papel restrito e teste estrutural |
| Crescimento de collections | TTL em `DatajudJob` e `Notification`; `CourtProcess` só para processos acompanhados (ou removido quando ninguém mais acompanha) |
| LGPD | Sem `partes`, sem processo sigiloso e só dados públicos do CNJ nas collections globais |

## 15. Registro ao concluir cada fase (protocolo do `AGENTS.md`)

- `docs/features/prospeccao-worker/feature.md` (novo) com histórico por fase. Atualizar `docs/architecture.md`, `RUN_BOOK.md` (rodar o worker local, env) e `docs/roadmap.md`.
- Mover este plano para `.specs/features/prospeccao-worker/plans/` ao concluir.
- Rodar `pnpm docs:sync`: este arquivo em `.specs/plans/` aparece como "plano não arquivado" no `docs/index.md`.
