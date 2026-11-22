# Automação Datajud — Design

Base: `.specs/features/automacao-datajud/spec.md`, o plano de 2026-11-22 e o plano do worker (seções 4, 6 e 13). Decisões: AD-267 a AD-271 (`.specs/STATE.md`).

## 1. Descoberta no Datajud (Fase 0, 2026-11-22)

API pública `https://api-publica.datajud.cnj.jus.br/api_publica_<tribunal>/_search`, com a chave do `.env`. Fixtures em `apps/worker/src/datajud/fixtures/` (dados públicos, `nivelSigilo` 0, sem `partes`, que a API não devolve):

| Fixture | O que prova |
| --- | --- |
| `trt24-process-alvara.json` | Processo completo (280 movimentos), com alvarás |
| `trt24-batch-by-number.json` | Consulta em lote `terms` em `numeroProcesso` (4 números, 1 shard, 28 s); movimentos cortados em 3 |
| `trt2-partial-shards.json` | Resposta 200 com `_shards.failed: 1` (`es_rejected_execution_exception`) e zero hits: **não é "nenhum processo"** |
| `trt2-rejected-429.json` | Recusa total (429 `search_phase_execution_exception`) |

Achados:

1. **Disponibilidade.** TRT24 responde (20–50 s por consulta). TRT2, TRF3 e TJMS recusaram toda consulta de 2026-11-22 (429, 504 ou shard recusado). Sem fixture de TJ e TRF: os códigos deles **não estão validados** (porta da Fase 4).
2. **Formato de `movimentos`**: `{ codigo, nome, dataHora (UTC ISO), complementosTabelados?: [{ codigo, descricao, valor, nome }], orgaoJulgador }`. Não é `nested` (plano anterior, seção 6, item 7). Um processo tem **um documento por grau** (`G1`, `G2`…): `id` = `<TRIBUNAL>_<GRAU>_<número>`. `numeroProcesso` vem só com dígitos.
3. **Por que "alvará" em `movimentos.nome` deu 0**: o alvará não é um movimento próprio. É o movimento **60 "Expedição de documento"** com o complemento tabelado **4 `tipo_de_documento` = 73 "Alvará"** (996 ocorrências na amostra do TRT24). A busca tem de olhar `movimentos.complementosTabelados`. Não aparece "eletrônico" nem "automatizado" no Datajud: esse texto provavelmente vem do PJe ou do diário (pergunta ao usuário, spec).
4. **Alvará em rajada**: no mesmo dia, o mesmo processo tem até 15 alvarás (um por beneficiário: partes, advogados, perito). A sugestão de recebimento é **uma por serviço e dia**, nunca uma por movimento.
5. **Defasagem**: o processo mais recente do TRT24 tinha `dataHoraUltimaAtualizacao` de 2026-11-04 consultado em 2026-11-22. Não foi possível medir a defasagem por processo (sem processo conhecido nosso no tribunal).
6. **Pagamento da União na justiça gratuita**: não verificado; o movimento 787/334 "Gratuidade da Justiça" aparece, o pagamento pela União não foi achado na amostra.

### Códigos candidatos (TRT24, a confirmar com TJ e TRF na Fase 4)

| Família (seção 4 do plano) | Códigos vistos no TRT24 |
| --- | --- |
| Suspensão | 272, 898, 14973, 14975, 14984, 14985 |
| Fim da suspensão | 12066 |
| Acordo homologado | 466, 14099, 277, 11013 |
| Desistência, extinção sem julgamento | 463, 454, 458, 459, 461, 473 |
| Sentença | 219, 220, 221 |
| Arquivamento definitivo | 246, 22 |
| Alvará | 60 com complemento 4 = 73 |
| Homologação / liberação de valores | não identificado (candidato: 12176 "Paga"; a confirmar) |

## 2. Modelo (`packages/db`)

| Model | Tenant? | Escreve | Conteúdo | Índices |
| --- | --- | --- | --- | --- |
| `CourtProcess` | não (AD-271) | worker | `court`, `processNumber` (máscara CNJ), `degree`, classe, assuntos, órgão julgador, `sourceUpdatedAt`, `movements[]` (`key`, `code`, `name`, `at`, `complements`), `fetchedAt` | `{court, processNumber, degree}` único |
| `CaseCourtSync` | sim | worker | `Case`, `court`, `processNumber`, `seenMovementKeys`, `baselineAt`, `syncedAt` | `{Tenant, Case}` único |
| `Tenant` | — | BFF | + `automationUntil`, `billing.automationSubscriptionId` | — |

`movement.key` = hash de `code + at + complements` (o Datajud não dá id de movimento).

## 3. Regras (`packages/contracts/src/schemas/automation-rules.ts`)

Cada regra: `ruleKey`, `version`, `match(movement)` (códigos e complementos), fase de destino por papel (`casePhases(role)`), `target` e se gera `notice`, `suggestion` ou os dois. Uma regra só entra **ligada** com códigos confirmados por fixture; a do alvará fica `enabled: false` até o usuário confirmar o gatilho (AD-269).

## 4. Aprovação (AD-268)

Invariantes da seção 5 do plano, sem mudança: o worker nunca aplica; linha de base por serviço; revalida na aprovação (`superseded`, 409 `suggestion_outdated`); update condicional `pending` → `accepted` antes de aplicar e volta a `pending` se o service falhar; ordem por data do movimento; motivo da rejeição guardado; trilha no `activityLog`.

## 5. Cobrança (AD-270)

Segunda assinatura no Asaas (`externalReference: automation_monthly`), webhook que distingue pela referência, `automationUntil` estendido com `$max` como o `accessUntil` (AD-230). `requireAutomation` (403 `automation_required`) e a flag `automation` na sessão. Preço do usuário: o valor fica em `packages/contracts/src/schemas/billing.schema.ts` só depois da resposta. Criar a assinatura e o webhook no Asaas real é do usuário.

## 6. Worker

Jobs `court_refresh` (1×/dia, agrupa por tribunal e enfileira lotes de até 100 números) e `court_refresh_batch` (consulta, upsert de `CourtProcess`, diff contra `CaseCourtSync`, regras, insere `notice` e `suggestion`), `suggestions_expire` (1×/dia). Cliente Datajud do plano anterior, seção 6: retry com backoff e jitter, rate limit, `_shards.failed` como falha recuperável, sigilo descartado, tribunal pelo número CNJ (`courtUnitFromNumber` vai para `@ethica/contracts`).
