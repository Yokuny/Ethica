# Processos acompanhados com a situação de cada um — Specification

**Origem**: investigação em produção de 2026-11-23 (`docs/features/automacao-datajud/feature.md`, Histórico; AD-286). Evolui a página Automação Datajud (`automacao-datajud`, AD-277, AD-281). Prefixo de requisito: `PAC`. Feature média: design inline (seção "Design"), sem `design.md`.

## Problem Statement

"Processos acompanhados" (`/automation`) só mostra um processo depois que o Datajud devolve ao menos uma movimentação dele: a lista lê o `CaseCourtSync`, que o worker só cria nesse caso (`apps/worker/src/jobs/court-refresh.ts`). O worker consulta todo dia um processo que o Datajud não encontra, ou cuja consulta falhou, mas a perita não o vê na página e conclui que o sistema não acompanha o serviço. Foi o caso do 0017068-93.2025.5.16.0008 (TRT16) no escritório ETHICA: estava na lista do worker, o lote do dia levou 429 e a página ficou vazia.

## Goals

- [ ] Todo serviço que o worker acompanha aparece em "Processos acompanhados", com ou sem dado do tribunal.
- [ ] Cada linha diz, em linguagem da perita, em que pé está: aguardando a primeira consulta, não encontrado no tribunal ou consultado, com a data da última consulta.
- [ ] Uma regra só decide "quem é acompanhado", usada pelo worker e pela página (hoje ela vive só em `listTrackedCases` do `@ethica/db`).

## Out of Scope

| Feature | Reason |
| --- | --- |
| Diagnóstico técnico por processo (429, timeout, erro do lote) | Detalhe de operação; vai para o log e as métricas do worker, não para a perita. |
| Reconsultar um processo pela tela ("Consultar agora") | O Datajud tem defasagem de T+1 a T+7 e limite de uso; a consulta continua diária. Pode voltar como pedido próprio. |
| Mudar a seção "No tribunal" do serviço | Ela já mostra o vazio por serviço; ver Open Questions. |
| Perícias cíveis (TJ) | Continuam fora do acompanhamento (AD-277). |

---

## Assumptions & Open Questions

Confirmar com a perita antes do código (linguagem de rotina, sem termos técnicos).

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Três situações na linha | "Aguardando a primeira consulta", "Não encontrado no tribunal", "Consultado em DD/MM" | O que a perita pode fazer muda em cada uma (esperar, conferir o número, nada) | No |
| Consulta que falhou | Não vira situação própria: a linha continua com a data da última consulta que deu certo (ou "Aguardando a primeira consulta") | Falha de tribunal é passageira (AD-286) e a data velha já mostra o atraso, sem mais um conceito | No |
| Data velha | Quando a última consulta tem mais de 3 dias, a linha mostra "Sem resposta do tribunal desde DD/MM" | Distingue atraso real de um dia sem rodada; 3 dias cobre fim de semana com falha | No |
| "Não encontrado no tribunal" explica o porquê | Texto curto: número pode estar errado, processo sigiloso ou ainda não publicado no Datajud (até 7 dias) | São as três causas que se repetem; a perita confere o número no serviço | No |
| Ordem da lista | Primeiro os que pedem atenção (não encontrado, sem resposta), depois os consultados pela data mais recente | A página serve para achar o que está errado | No |
| Serviço encerrado ou cancelado | Sai da lista, mesmo com histórico no tribunal | A lista é "o que o worker acompanha hoje"; o histórico continua na seção No tribunal do serviço | No |
| Seção "No tribunal" do serviço | Mostra a mesma situação quando ainda não há movimentos | Mesma informação nos dois lugares; decidir se entra nesta entrega | No |

---

## User Stories

### P1: Ver todo processo acompanhado — PAC-01

1. WHEN o escritório tem o módulo e um serviço cumpre a regra de acompanhamento (número CNJ de TRT ou TRF, papel judicial, não cancelado, fase não encerrada) THEN the system SHALL listar esse serviço em "Processos acompanhados", com o tribunal e o link para o serviço.
2. WHEN o serviço deixa de cumprir a regra (encerrado, cancelado, número trocado para TJ ou apagado) THEN the system SHALL tirá-lo da lista.
3. WHEN o escritório não tem o módulo THEN the system SHALL mostrar só a oferta e não consultar a lista (AD-276, como hoje).

### P1: Situação de cada processo — PAC-02

1. WHEN o worker ainda não consultou o processo com sucesso THEN the system SHALL mostrar "Aguardando a primeira consulta ao tribunal" e que a consulta é diária, de madrugada.
2. WHEN a última consulta deu certo e o Datajud não trouxe o processo THEN the system SHALL mostrar "Não encontrado no tribunal", a data da consulta e as causas prováveis.
3. WHEN a última consulta trouxe o processo THEN the system SHALL mostrar "Consultado em DD/MM" (como hoje).
4. WHEN a última consulta que deu certo tem mais de 3 dias THEN the system SHALL mostrar "Sem resposta do tribunal desde DD/MM".
5. WHEN o Datajud passa a trazer um processo antes não encontrado THEN the system SHALL gravar a linha de base sem aviso, como na primeira sincronização (AD-277, item 2).

### P2: Uma regra de acompanhamento — PAC-03

1. WHEN o worker monta os lotes e a página monta a lista THEN the system SHALL usar a mesma regra de "quem é acompanhado", definida num lugar só.

---

## Design

### Dado: o worker registra toda consulta que deu certo

- `CaseCourtSync` passa a existir para todo serviço consultado com sucesso, e não só para o que tem movimentos: `baselineAt` fica opcional e só é gravado quando o Datajud traz o processo; `syncedAt` continua sendo a data da última consulta que deu certo.
- Em `refreshCourtBatch`: serviço sem movimentos faz upsert de `{ Tenant, Case, court, processNumber, syncedAt }` sem `baselineAt`. Serviço com movimentos e registro sem `baselineAt` grava a linha de base (as chaves vistas e `baselineAt`), sem aviso. O `if (!sync)` de hoje vira `if (!sync?.baselineAt)`.
- Consulta que falha não grava nada: o lote volta para a fila (AD-286) e a data antiga mostra o atraso.
- Sem migração: os registros de hoje já têm `baselineAt`.

### Regra única de acompanhamento

- O filtro de `Case` de `listTrackedCases` (`packages/db/src/workerReads.ts`) vira uma função de leitura que aceita um escritório (`listTrackedCases(now, tenantId?)`); o worker chama sem escritório, como hoje.
- Na API, o `case` (dono do `Case`) expõe a lista do escritório pelo service; o `automation` só fala com `caseService` (`apps/api/CLAUDE.md`).

### API

- `GET /automation/cases` (mesma rota, `requireAutomation`) devolve todo serviço acompanhado, cruzado com o `CaseCourtSync` em uma consulta `$in`:
  `TrackedCase = { caseId, caseLabel, court, status: 'waiting' | 'not_found' | 'synced', syncedAt? }` em `packages/contracts/src/schemas/court-process.schema.ts`. `not_found` = registro sem `baselineAt`; `synced` = com `baselineAt`; `waiting` = sem registro.
- "Sem resposta desde" é calculado na tela a partir de `syncedAt` (não é um quarto status).

### Web

- `apps/web/src/routes/_private/automation/@components/tracked-cases.tsx`: a linha ganha a situação (badge e texto) e a ordem de PAC-02; textos por `t()`, reaproveitando `last_court_query` e o que já existir no dicionário.
- Seção "No tribunal" do serviço: só se a pergunta em aberto for aceita.

---

## Success Criteria

- [ ] Um escritório com o módulo e um serviço do TRT que o Datajud não encontra vê o serviço na página como "Não encontrado no tribunal", com a data da consulta.
- [ ] Um serviço recém-cadastrado aparece na hora como "Aguardando a primeira consulta".
- [ ] O worker e a página contam os mesmos serviços acompanhados (teste com o mesmo seed).
- [ ] Nenhum aviso de movimentação nasce quando um processo antes não encontrado aparece no Datajud.
