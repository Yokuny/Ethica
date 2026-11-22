# Plano — Notificações como entidade única e Automação Datajud (módulo premium)

- **Data**: 2026-11-22
- **Status**: em execução desde 2026-11-22 (decisões da seção 1 tomadas pelo usuário; progresso na seção 13)
- **Features (slugs sugeridos)**:
  - `central-notificacoes`: base do produto; substitui `prazos-alertas` e absorve `avisos-notificacoes`;
  - `automacao-datajud`: módulo premium.
- **Áreas**: `apps/worker` (novo), `apps/api`, `apps/web`, `packages/db`, `packages/contracts`, `packages/mail` (novo)
- **Relação com outros planos**:
  - Este plano **muda a prioridade** de `.specs/plans/2026-11-22-prospeccao-worker-datajud.md`. Daquele plano continuam valendo como base técnica:
    - a arquitetura do worker e a comunicação só pelo banco (D1, D3, D4, D6, D7);
    - a fila `DatajudJob` (seção 4);
    - o cliente Datajud robusto (seção 6);
    - deploy e operação (seção 13).
  - A busca de prospecção e o DJEN ficam para depois deste plano.

## 0. Resumo

O sistema ainda não foi lançado. Por decisão do usuário em 2026-11-22, este é o momento de chegar ao formato final **sem carregar estruturas antigas**:

1. **`Notification` passa a ser a entidade única** de tudo o que pede a atenção de alguém no escritório. Ela tem quatro tipos: **prazo**, **alerta**, **sugestão** e **aviso**.
   - O `Deadline` **deixa de existir** (model, módulo, rotas, página e `source` da agenda).
   - A página `/deadlines` é substituída pela **Central de Notificações**.
   - Um único motor de lembretes e entrega atende tela, e-mail e, depois, push.
2. **Automação Datajud (premium, cobrada à parte).** Acompanha os processos dos serviços no Datajud. Toda movimentação nova vira um **aviso**. Quando uma regra reconhece o movimento, vira também uma **sugestão** de alteração em:
   - status ou fase do serviço;
   - movimentação do serviço;
   - recebimento de honorário;
   - prazos.

   **Nada muda nos dados antes da aprovação do usuário.** Na aprovação, o BFF aplica pelo service dono, com as mesmas validações e eventos da edição manual.

Regras pedidas pelo usuário:

- **o Datajud nunca escreve** no serviço, no financeiro nem nos prazos;
- pagamento **só** é sugerido no movimento de **expedição de alvará eletrônico**, e mesmo assim o usuário confirma valor e data, porque o Datajud não informa nenhum dos dois.

---

## 1. Decisões a confirmar (com recomendação)

### D1 — `Notification` única no lugar de `Deadline` (decidido pelo usuário; detalhe recomendado)

| `kind` | O que é | Status | Origem |
| --- | --- | --- | --- |
| `deadline` | Prazo processual (o que era `Deadline` com `kind: 'deadline'`) | `pending`, `filed` (com `filedDate`), `missed`, `canceled` | pessoa, cadastro do serviço (prazo do laudo) |
| `alert` | Lembrete com data (o que era `Deadline` com `kind: 'alert'`, AD-189) | `pending`, `done`, `canceled` | pessoa |
| `suggestion` | Alteração proposta pelo Datajud, à espera de aprovação | `pending`, `accepted`, `rejected`, `superseded`, `expired` | worker (premium) |
| `notice` | Aviso informativo, sem ação: movimentação nova, pagamento em andamento, vencimento financeiro, módulo vencendo | sem status; lido ou não lido por pessoa | worker |

- **Uma regra de validade** por tipo (`validNotificationStatus(kind, status)`, que generaliza o `validDeadlineStatus`). O servidor recusa um status de outro tipo.
- **`canceled`** é novo para prazo e alerta: é o que a sugestão de encerramento aplica quando o processo acaba em acordo ou extinção. Também pode ser usado à mão. A confirmação fica com a perita (seção 12).
- O que a AD-189 garantiu continua valendo: criticidade, Adiar, Concluir, títulos aprovados por tipo de serviço e "a entrega do laudo nunca protocola um alerta". Muda só a casa.
- Uma AD nova **supersede a AD-189 e a AD-109** na entidade (`Deadline` → `Notification`).

### D2 — O que é base e o que é premium (recomendado)

| Base (assinatura atual) | Premium "Automação Datajud" |
| --- | --- |
| Central, sino, preferências por tipo e canal | Acompanhamento dos processos no Datajud |
| Prazos e alertas (tudo o que existe hoje) | Linha do tempo do tribunal no serviço |
| Lembretes de prazo e de vencimento financeiro (AVS-02) | Avisos de movimentação nova |
| Push (AVS-03), numa fase posterior | Sugestões de status, fase, movimentação, financeiras e de prazos |

**Quando o premium vence**:

- o acompanhamento para;
- as sugestões `pending` viram `expired` e continuam visíveis só para leitura;
- a linha do tempo mostra os dados até a última atualização, com a data.

Reativar refaz a linha de base (seção 5, invariante 2).

### D3 — "Aprovado" no tribunal é só aviso; pagamento só pelo alvará (recomendado)

- O status do honorário continua **derivado das parcelas** (AD-111). Não há estado `approved`.
- Homologação, liberação ou "aprovado" geram o `notice` **"Pagamento em andamento no tribunal"**, ligado ao serviço e ao lançamento.
- Só a **expedição de alvará eletrônico** gera a `suggestion` **"Registrar recebimento"**.
  - Na aprovação, a pessoa escolhe o lançamento de receita em aberto do serviço, com o honorário fixado já marcado, e confirma **valor** (preenchido com o saldo), **data** (preenchida com a do movimento) e **conta**.
  - A aplicação chama `transactionService.addInstallment`.
  - Sem nenhum lançamento em aberto, a aprovação oferece criar a receita (`createTransaction`) junto com a parcela.
- A sugestão avisa que o alvará pode ser **de outra parte do processo**, porque o Datajud não informa o beneficiário.

### D4 — Lembretes e entregas rodam no worker (recomendado)

- `apps/api/src/providers/mail/` vira `packages/mail` (log, nodemailer, Resend). O BFF continua usando o pacote para os e-mails imediatos (chave de acesso, convite, aviso às partes).
- Saem do BFF o `setTimeout` de `apps/api/src/server.ts` e o `agenda/deadlineReminder.service.ts`.
- É preciso uma AD que supersede a AD-147 no local da varredura (do processo da API para o worker) e que corrige o escopo de `avisos-notificacoes`: a central no app e o serviço de jobs separado passam a fazer parte.

### D5 — Visibilidade e permissão

- Cada `Notification` tem um `module` (`expert_cases` ou `finance`). A lista e o contador filtram pelo que a pessoa pode **ver**:
  - prazo, alerta, movimentação e sugestão de serviço → `expert_cases`;
  - vencimento, pagamento em andamento e sugestão de recebimento → `finance`.
- **Aprovar** exige poder **alterar** o alvo (`expert_cases:update` ou `finance:update`), conferido no BFF e na tela (skill `ethica-permissions`).
- **Lido** é por pessoa (`readBy`). O status de prazo, alerta e sugestão é do escritório: uma pessoa aprova e vale para todos.
- Usuário inativo e escritório fechado (`openTenantFilter`, AD-098 e AD-230) não recebem entregas.

### D6 — Cobrança do premium: segunda assinatura no Asaas (recomendado)

- `Tenant.automationUntil` (instante, mesmo padrão da AD-230) e `Tenant.billing.automationSubscriptionId`.
- O webhook distingue pela `externalReference` (por exemplo, `automation_monthly`).
- É preciso uma AD que supersede a CHK-08 ("uma assinatura viva") **só para o módulo**.
- O preço fica com o usuário.

### D7 — Quem escreve o quê

| Collection | Worker | BFF |
| --- | --- | --- |
| `Notification` | **insere** `suggestion` e `notice`; muda `suggestion` de `pending` para `superseded`/`expired` | todo o resto: CRUD de prazo e alerta, aprovar/rejeitar, `readBy` |
| `NotificationDelivery` | cria (trava de entrega) | — |
| `CourtProcess` (global), `CaseCourtSync` | cria e atualiza | lê |
| `Case`, `Transaction`, `Tenant`, `User` | **só lê** | dono, como hoje |

O Atlas não restringe por campo, então a regra "o worker só insere esses tipos e só faz essas transições" fica no código e num teste estrutural, que impede o worker de usar `updateOne` ou `findOneAndUpdate` em `Notification` fora de `queue/notification-writes.ts`.

### D8 — Dados existentes de `Deadline`

O sistema não foi lançado.

- **Recomendado**: se em produção só há dados de teste, **nenhuma migração**. O `Deadline` é apagado e os seeds (`seed-demo`, `seed-volume`) são refeitos.
- **Se houver dado real**: um script avulso em `apps/api/scripts/` copia `Deadline` para `Notification` uma vez e é apagado no commit seguinte, sem shim no código.

---

## 2. Visão do fluxo

```
pessoa ──▶ BFF: cria/edita prazo e alerta ──▶ Notification(deadline/alert) ──▶ agenda (evento AD-169)
                                                     │
worker: varredura de lembretes (a cada hora) ────────┤ lê dueDate, vencimentos de Transaction
                                                     ▼
                         NotificationDelivery (trava por pessoa × dia × canal) ──▶ e-mail / push; o sino lê direto

Datajud ──▶ worker (só premium): refresh → diff contra CaseCourtSync → CourtProcess
                 │ regras versionadas (@ethica/contracts)
                 ├──▶ Notification(notice: court_movement)  — sempre
                 └──▶ Notification(suggestion, pending)      — quando uma regra reconhece
                                   │ pessoa aprova na Central ou no serviço
                                   ▼
                 BFF: revalida → service dono (case / finance / notifications) → eventos de sempre → accepted
```

## 3. Modelo de dados (`packages/db`)

### `Notification` (tenant)

| Campo | Tipos | Descrição |
| --- | --- | --- |
| `Tenant`, `kind`, `module`, `status` | todos | `status` validado por tipo (D1). `notice` não tem status. |
| `Case?`, `Transaction?` | todos | Vínculo com serviço e lançamento. |
| `title` | `deadline`, `alert` | Texto da pessoa, como hoje (título aprovado ou "Escrever outro", AD-190). |
| `topic`, `params` | `suggestion`, `notice` | Chave de tradução e parâmetros: o banco não guarda frase pronta; a tela traduz por `t()` e o e-mail pelo dicionário de e-mail. |
| `dueDate` | `deadline`, `alert` | `YYYY-MM-DD` (AD-103). |
| `filedDate` | `deadline` | Obrigatório com `filed` (a regra de hoje). |
| `notes` | `deadline`, `alert` | — |
| `severity` | todos | `info`, `warning`, `critical`. A criticidade de prazo e alerta continua **derivada** da data na tela, como hoje. |
| `source` | todos | `user`, `system` (prazo do laudo, lembretes), `datajud`. |
| `proposal` | `suggestion` | `{ target, payload }`, validado por um schema Zod por `target` (seção 4). |
| `evidence` | `suggestion`, `notice` do tribunal | `{ court, movementKey, movementCode, movementName, movementAt, complements }`. |
| `ruleKey`, `ruleVersion` | `suggestion` | — |
| `decidedBy`, `decidedAt`, `applied`, `rejectReason` | `suggestion` | — |
| `readBy` | todos | Lista de `User`. |
| `dedupeKey` | gerados pelo sistema | Por exemplo, `suggestion:<Case>:<ruleKey>:<movementKey>`, `finance_due:<Transaction>:<bucket>`, `court_movement:<Case>:<runId>`. |
| `expireAt` | `notice` | 180 dias. |

Índices:

- `{Tenant, kind, status, dueDate}` (Central e contadores);
- `{Tenant, Case, kind, dueDate}` (detalhe do serviço);
- `{status, dueDate}` para a varredura entre escritórios, no lugar do índice equivalente do `Deadline`;
- `{Tenant, dedupeKey}` único e parcial;
- TTL em `expireAt`.

Um schema Mongoose só, com campos opcionais. A forma por tipo é garantida por uma **união discriminada em Zod** em `@ethica/contracts` (`notification.schema.ts`), usada no BFF e no worker. Sem discriminators do Mongoose, para manter um conceito só.

### Demais models

| Model | Tenant? | Conteúdo | Índices |
| --- | --- | --- | --- |
| `NotificationDelivery` | sim | `User`, `channel` (`email`, `push`), `key` (`digest:<dia>` ou `immediate:<Notification>`), `sentAt`, `error` | `{User, channel, key}` único: é a trava contra duplicidade (AD-147) |
| `CourtProcess` | não (dado público do CNJ; exceção ao `tenantScoped`, D7 do plano anterior) | `court`, `processNumber` (máscara CNJ), classe, assuntos, órgão julgador, `sourceUpdatedAt`, `movements[]` (`key`, `code`, `name`, `at`, `complements`), `fetchedAt` | `{court, processNumber}` único |
| `CaseCourtSync` | sim | `Case`, `court`, `processNumber`, `seenMovementKeys`, `baselineAt`, `syncedAt` (linha de base **por serviço**; o `CourtProcess` é global e não serve para isso) | `{Tenant, Case}` único |
| `Tenant` (existe) | — | + `automationUntil`, `billing.automationSubscriptionId` | — |
| `User.preferences` (existe) | — | `deadlineReminderEmail` vira um mapa tipo × canal: `deadlines.email`, `finance.email`, `court.email`, `suggestions.email`, `*.push` | — |
| `DatajudJob`, `WorkerHeartbeat` | — | como no plano anterior, seções 3 e 4 | — |

Sai: `packages/db/src/models/deadline.model.ts` e o `Deadline.createIndexes()` de `syncIndexes`. Em `CALENDAR_ENTRY_SOURCES`, `deadline` vira `notification`.

**Processos acompanhados**: `Case` de escritório premium com `processNumber` válido, papel em `JUDICIAL_CASE_ROLES` e não encerrado (`isCaseClosed`). A lista é derivada a cada execução.

**Glossário antes do código** (AD-140): notificação `Notification` (com prazo `deadline`, alerta `alert`, sugestão `suggestion` e aviso `notice` como **tipos**), processo no tribunal `CourtProcess` e movimentação do tribunal `courtMovement`, para não colidir com o `movement` do serviço. O termo "prazo `Deadline`" sai do glossário.

## 4. Catálogo de regras (os códigos entram na Fase 0, com evidência)

As regras ficam em `packages/contracts/src/schemas/automation-rules.ts`, cada uma com `ruleKey`, `version`, códigos TPU, condição, **fase de destino por papel** (perícia e assistência técnica têm listas próprias, `casePhases(role)`) e alvo. Hoje o `updateCase` não confere a fase pelo papel, então a aprovação confere antes de aplicar.

| Família de movimento (Datajud) | `proposal.target` | Sugestão | Observação |
| --- | --- | --- | --- |
| Suspensão do processo | `case_status` → `suspended` | "Processo suspenso: suspender o serviço?" | Mais um `notice` para revisar os prazos pendentes (o Datajud não dá nova data). |
| Fim da suspensão, retomada | `case_status` → `active` | "Processo retomado: reativar o serviço?" | — |
| Acordo homologado | `case_phase` → `settlement` | "Acordo no processo: encerrar como Acordo?" | O sinal mais valioso: evita vistoria em processo encerrado. |
| Desistência, extinção sem julgamento | `case_phase` → `withdrawal` | — | — |
| Sentença, encerramento da instrução | `case_phase` → `awaiting_judge` / `evidence_closed` | — | Só sugere avanço; nunca volta a fase. |
| Arquivamento definitivo | só `notice` (seção 12) | — | — |
| Esclarecimentos ou laudo complementar, se houver código TPU específico | `case_movement` (`MOVEMENT_TYPES`) e `case_phase` → `clarifications` | — | Provavelmente vem do DJEN, mais tarde. |
| Homologação, liberação, "aprovado" de valores | só `notice` (D3) | "Pagamento em andamento no tribunal" | Não muda o financeiro. |
| **Expedição de alvará eletrônico (automatizado)** | `transaction_installment` (alvo: `Case`) | "Alvará expedido: registrar recebimento?" | Único gatilho de pagamento (D3). |
| Acordo ou extinção já aprovados (efeito em cadeia) | `notifications_cancel` | "Cancelar os N prazos e alertas pendentes deste serviço?" | Aplica `canceled` (D1). |

**Limites do Datajud, para comunicar na tela e na venda**:

- não traz valor nem beneficiário em movimentos de pagamento;
- não traz datas de prazo (a automação de prazos se limita a revisar e cancelar os que já existem);
- tem defasagem de T+1 a T+7;
- os códigos variam por tribunal (validar na Fase 0).

## 5. Aprovação: invariantes

1. **O worker nunca aplica.** `POST /notifications/:id/accept` no BFF chama o service dono:
   - `caseService.updateCase` e `caseService.addMovement`;
   - `transactionService.addInstallment` e `transactionService.createTransaction`;
   - o próprio `notificationService` (cancelar prazos).

   Validações e eventos (agenda, `case:fixed_fees`, `syncAgenda`) são os de sempre.
2. **Linha de base por serviço**: a primeira sincronização (e a reativação do premium) grava `CaseCourtSync.seenMovementKeys` e **não gera nada**.
3. **Revalidar na aprovação**:
   - o serviço já no estado proposto → `superseded`;
   - transição impossível (fase do papel ou fase anterior) → 409 `suggestion_outdated`.
4. **Idempotência**: um update condicional `pending` → `accepted` antes de aplicar, com o resultado em `applied`. Se o service falhar, volta para `pending`.
5. **Ordem**: sugestões do mesmo serviço aparecem por data do movimento. Aprovar um encerramento marca como `superseded` as sugestões de fase anteriores.
6. **Rejeitar** guarda o motivo, que serve de métrica de qualidade por `ruleKey` (Fase 6).
7. **Trilha**: aprovação e rejeição entram no `activityLog`, com a evidência.

## 6. Motor de lembretes e entrega

| Gatilho | Gera | Módulo | Entrega padrão |
| --- | --- | --- | --- |
| `deadline` ou `alert` `pending` com `dueDate` em 15 dias, hoje ou ontem (regras da AD-110) | nada novo: o consolidado lê direto | `expert_cases` | e-mail diário |
| `Transaction` `expected` ou `partial` vencendo em 7 dias, hoje ou atrasada (AVS-02) | `notice` `finance_due` (dedupe por lançamento e faixa) | `finance` | sino e e-mail diário |
| Movimentação nova no tribunal (premium) | `notice` `court_movement`, agrupado por serviço e por execução | `expert_cases` | sino e e-mail diário |
| Sugestão nova (premium) | a própria `suggestion` | conforme o alvo | sino e e-mail diário; o **alvará** é `critical`: e-mail na hora |
| Homologação ou liberação (premium) | `notice` `payment_in_progress` | `finance` | sino |
| Premium vence em 7 dias | `notice` `automation_expiring` | admin | sino e e-mail |

- **E-mail consolidado**: o job `email_digest` roda de hora em hora a partir das 07:00 (America/Sao_Paulo, AD-036). Para cada pessoa sem `NotificationDelivery` `digest:<hoje>`, ele junta os prazos e alertas das faixas, os avisos e sugestões novos visíveis a ela e conforme as preferências, envia e grava a trava. Isso recupera o dia perdido e não duplica com duas réplicas (AVS-01).
- **Imediato**: `critical` gera o job `email_immediate`, com a trava `immediate:<Notification>`.
- **Push**: Fase 6 (AVS-03), sem valor nem nome de parte no texto.
- **Leituras do worker**: rótulo do serviço (`caseLabel`), destinatários com preferência e permissão, e escritório aberto. Essas leituras viram **funções de leitura em `packages/db`** (como `groupStats` e `dailyTrend`), usadas pelo api e pelo worker. Assim, o worker não importa services do api.

## 7. BFF (`apps/api`)

### Módulo novo `notifications` (dono de `Notification`), no lugar de `case/deadline.*`

- **Prazos e alertas**:
  - `GET /notifications` (filtros: `kind`, `status`, `Case`, lido; ordem por vencimento como a AD-189);
  - `POST /notifications` (cria prazo ou alerta);
  - `PATCH /notifications/:id` (editar, Adiar, protocolar, concluir, cancelar);
  - `DELETE /notifications/:id`.
- **Sugestões**: `POST /notifications/:id/accept` (corpo só para as que pedem dados) e `POST /notifications/:id/reject`.
- **Leitura**: `GET /notifications/unread-count`, `POST /notifications/:id/read` e `POST /notifications/read-all`.
- **Grafo**: `notifications` → `case` e `finance`.
  - Rótulos e validação do serviço passam por `caseService`.
  - Aplicar uma sugestão financeira passa por `transactionService`.
  - `documents` → `notifications`: `fileReportDelivery`, que protocola o prazo do laudo na entrega (a regra de hoje).
  - `agenda` → `notifications`: o feed iCal lê os prazos pendentes.
  - **`case` não depende de `notifications`** (sem ciclo):
    - o prazo do laudo informado no cadastro (`reportDeadline`) é criado por um evento novo `case:created` (AD-039), com um subscriber em `notifications`;
    - `case:deleted` já existe e passa a apagar as notificações do serviço;
    - a coluna "Próximo prazo" da lista de serviços e os contadores do serviço (`case.repository`, que hoje lê `Deadline` direto) passam a usar uma **função de leitura em `packages/db`** (seção 6). A alternativa é a tela pedir esses números a `/notifications`. A escolha fica para o design.
- **Sai**:
  - `apps/api/src/modules/case/deadline.{controller,repository,schema,service}.ts` e as rotas `/expert-cases/deadlines` e `/expert-cases/:id/deadlines`;
  - `agenda/deadlineReminder.service.ts` e `scheduleDeadlineNotices`;
  - `apps/api/src/providers/mail/` (vira `packages/mail`).

  O `DB_OWNERSHIP` do teste estrutural troca `Deadline` → `case` por `Notification` → `notifications`.

### Módulo novo `automation` (premium)

- `GET /automation/cases/:id/court-process` (linha do tempo) e `GET /automation/status` (ativo até, última atualização, heartbeat).
- O middleware `requireAutomation` (403 `automation_required`) e a flag `automation` na sessão.
- A cobrança fica em `identity/billing` (D6).

As preferências (tipo × canal) ficam em `identity/preferences`.

## 8. Web (`apps/web`)

- **`/notifications` (Central)** substitui `/deadlines`, com abas:
  - **Para aprovar** (premium): cartões com a evidência, o "antes → depois", Aprovar e Rejeitar. O recebimento abre o formulário de parcela preenchido.
  - **Prazos e alertas**: a tabela de hoje (criticidade, Adiar, protocolar, concluir), agora com Cancelar.
  - **Avisos**: lido e não lido.
- `deadline-dialog`, `deadline-labels`, `useDeadlineForm` e `query/deadline.ts` viram componentes de notificação. São **renomeados e adaptados, não duplicados**; os antigos saem.
- Menu, início (`home-access`), `case-columns` e o detalhe do serviço apontam para a nova API.
- **Sino** no layout `_private`.
- **Detalhe do serviço**: a seção "Prazos e alertas" (da nova API) e a seção **"No tribunal"** (premium) com a linha do tempo e as sugestões pendentes do serviço.
- **Detalhe do lançamento**: a marca "pagamento em andamento no tribunal" e a sugestão de recebimento pendente.
- **Oferta premium** na Central e no serviço para quem não tem o módulo, e assinatura no `/billing`.
- **Conta → Notificações**: a matriz tipo × canal.
- Chaves de tradução: consultar o dicionário antes. Erros novos em `API_MESSAGE_KEYS`: `automation_required`, `suggestion_outdated`, `invalid_notification_status`. Este último substitui `invalid_deadline_status`.
- **Relatório de prazos** (`/reports/deadlines`) e exportação de dados (DOC-04): passam a ler `Notification` `deadline`/`alert`.

## 9. Worker (`apps/worker`): jobs

Base do plano anterior (seções 4 e 9): fila, claim, lease, heartbeat e `/health`.

| Job | Quando | O que faz |
| --- | --- | --- |
| `reminders_sweep` | a cada hora | Cria `finance_due` e `automation_expiring` (com `dedupeKey`). |
| `email_digest` | a cada hora, a partir das 07:00 | Consolidado por pessoa, com a trava `NotificationDelivery`. |
| `email_immediate` | ao criar uma `critical` | E-mail na hora. |
| `court_refresh` | 1×/dia, só escritórios premium | Agrupa os processos acompanhados por tribunal e enfileira os lotes. |
| `court_refresh_batch` | enfileirado | Consulta o Datajud em lote, atualiza `CourtProcess`, faz o diff contra `CaseCourtSync`, aplica as regras e insere `notice` e `suggestion`. |
| `suggestions_expire` | 1×/dia | Marca `expired` (sem premium) e `superseded` (estado atual já resolve). |

## 10. Fases

Estimativas em dias de uma pessoa, aproximadas. Cada fase fecha com `pnpm run check` verde, `(cd apps/web && pnpm run build)`, registro e push (protocolo do `AGENTS.md`).

### Fase 0 — Descoberta e documentação (3–4 d) · porta de entrada

1. **Datajud com dados reais.** Em 2026-11-22, os índices grandes recusaram consultas. No TRT24, a busca "alvará" em `movimentos.nome` voltou com 0 resultados e todos os shards OK, **sem explicação ainda**.
   - Gravar fixtures (TRT, TJ, TRF).
   - Confirmar o formato de `movimentos`, a defasagem e a consulta em lote por número.
2. **Códigos TPU de cada família da seção 4.** Em especial:
   - **"Expedição de alvará eletrônico automatizado"**: é código nacional ou local? Em quais índices aparece? A busca na web não achou o código nacional.
   - O pagamento pela **União na justiça gratuita** aparece no processo?
3. `spec.md`, `design.md` e `tasks.md` de `central-notificacoes` e `automacao-datajud`, com as perguntas da seção 12 confirmadas com a perita.
4. ADs:
   - `Notification` única no lugar de `Deadline` (supersede a AD-109 e a AD-189 na entidade; mantém as regras de tela da AD-189 e da AD-190);
   - motor no worker (supersede a AD-147 no local);
   - sugestão só aplicada com aprovação, pelo service dono;
   - D3;
   - premium e segunda assinatura (supersede a CHK-08 só para o módulo);
   - `packages/mail`;
   - evento `case:created`;
   - `CALENDAR_ENTRY_SOURCES` `deadline` → `notification` (ajusta a AD-169).
5. Glossário (sai `Deadline`, entra `Notification` com os tipos), `docs/architecture.md` e `docs/features/prazos-alertas/feature.md` (histórico: substituída por `central-notificacoes`).

### Fase 1 — `Notification` no lugar de `Deadline` (5–6 d) · um commit de virada, sem shim

- `Notification` no `packages/db`, a união Zod em `@ethica/contracts` e o módulo `notifications` no BFF (CRUD de prazo e alerta, leitura).
- Dependentes religados:
  - `case:created` (prazo do laudo);
  - `case:deleted`;
  - `fileReportDelivery`;
  - agenda (`source: 'notification'`) e feed iCal;
  - lista de serviços e contadores;
  - relatório de prazos e exportação;
  - importação;
  - seeds.
- Web: `/notifications` com as abas Prazos e alertas e Avisos, e o detalhe do serviço. `/deadlines` sai.
- **Sai tudo o que envolve `Deadline`** (model, módulo, rotas, chaves, testes; os testes são migrados com `git mv` para os arquivos novos). D8 para os dados.
- Neste commit, o timer de e-mail ainda roda no api, agora lendo `Notification`. Ele só sai na Fase 2.
- **Aceite**:
  - tudo o que a página e o detalhe do serviço faziam continua funcionando (criticidade, Adiar, protocolar, concluir, títulos aprovados);
  - a agenda e o iCal mostram os prazos;
  - a entrega do laudo protocola o prazo e nunca um alerta;
  - `rg -n "Deadline\b|deadlineService" apps packages` volta vazio (fora do histórico de docs).

### Fase 2 — Worker e entrega (5–6 d)

- Esqueleto do `apps/worker` (plano anterior, Fase 1), `packages/mail` e as funções de leitura em `packages/db`.
- `NotificationDelivery`, `email_digest`, `email_immediate` e `reminders_sweep` (`finance_due`), mais as preferências tipo × canal com migração da preferência atual.
- O sino e a matriz na conta.
- Saem do api `scheduleDeadlineNotices` e `deadlineReminder.service.ts`.
- **Aceite**:
  - um restart às 07:10 ainda envia o consolidado;
  - duas réplicas não duplicam;
  - o operador sem financeiro não vê nem recebe `finance_due`;
  - o e-mail de prazos traz os mesmos prazos para os mesmos destinatários de hoje.

### Fase 3 — Módulo premium (2–3 d)

- `automationUntil`, a assinatura no Asaas e o webhook.
- `requireAutomation`, a flag na sessão, a oferta na tela e `automation_expiring`.

### Fase 4 — Acompanhamento no tribunal (4–5 d)

- O cliente Datajud robusto (plano anterior, seção 6), `CourtProcess`, `CaseCourtSync`, `court_refresh` e `court_refresh_batch`, e `notice` `court_movement`.
- A seção "No tribunal".
- **Aceite**:
  - a primeira sincronização não gera aviso;
  - um movimento novo gera um aviso agrupado;
  - um escritório sem premium não é consultado.

### Fase 5 — Sugestões de serviço (4–5 d)

- Regras de status e fase, a aba "Para aprovar", accept e reject pelo `caseService`, e as sugestões no detalhe do serviço.
- **Aceite**:
  - nada muda antes da aprovação;
  - aprovar aplica pelo service (a agenda reage);
  - a idempotência funciona;
  - `superseded` e 409 `suggestion_outdated` funcionam.

### Fase 6 — Sugestões financeiras e de prazos, qualidade e push (5–7 d)

- Regra do alvará (D3), `payment_in_progress`, `notifications_cancel` e o aviso para revisar prazos na suspensão.
- Métricas de aceite e rejeição por regra em `ops/grafana`.
- Push (AVS-03).
- **Aceite**:
  - "aprovado" e homologação **não** sugerem pagamento;
  - o alvará sugere, e a parcela só é gravada com valor confirmado;
  - `parcel_exceeds_balance` continua valendo.

**Depois deste plano**: a busca de prospecção pelo worker e as nomeações pelo DJEN (plano anterior). O DJEN também é a fonte provável dos eventos do perito (esclarecimentos, impugnação, honorários fixados), que entram como regras novas no mesmo motor.

## 11. Riscos

| Risco | Mitigação |
| --- | --- |
| A virada da Fase 1 quebra um dependente esquecido | Lista de dependentes desta seção 7, `rg` vazio como aceite e os testes migrados junto |
| Datajud instável ou com formato diferente do suposto | Porta da Fase 0, fixtures, linha de base e retry |
| Regra errada | Nada é aplicado sem aprovação, a evidência é mostrada, versão por regra e métrica de rejeição |
| Alvará de outra parte | Valor e lançamento confirmados pela pessoa, com aviso explícito |
| Pagamento da União fora do processo | Verificar na Fase 0 e comunicar |
| Excesso de avisos | Agrupamento, consolidado diário e preferências tipo × canal |
| Worker e BFF escrevendo em `Notification` | D7: tipos e transições do worker restritos por código e por teste estrutural |

## 12. Perguntas para a perita (tabela "Assumptions" das specs)

| Assunto | Padrão proposto |
| --- | --- |
| Nome da Central no menu | "Notificações" |
| Status `canceled` para prazo e alerta (acordo, extinção ou à mão) | Sim |
| Arquivamento definitivo | Só aviso |
| Quem aprova sugestão financeira | Quem tem `finance:update` |
| Alvará: e-mail na hora ou no consolidado | Na hora |
| Frequência da atualização no tribunal | 1×/dia |
| Há dados reais de prazos em produção? (D8) | Não: seeds refeitos, sem migração |
| O que o premium inclui e o preço | D2; o preço é do usuário |

## 13. Progresso

| Fase | Situação | Registro |
| --- | --- | --- |
| 0 — Descoberta e documentação | concluída em 2026-11-22 | specs em `.specs/features/{central-notificacoes,automacao-datajud}/`, AD-263 a AD-271, fixtures do TRT24 e do TRT2. TJ e TRF indisponíveis (429/504); alvará = movimento 60 com complemento 73 (pergunta ao usuário) |
| 1 — `Notification` no lugar de `Deadline` | concluída em 2026-11-22 | um commit `feat(central-notificacoes)`, `rg` de aceite vazio, AD-272 com os detalhes; sem migração (D8 a confirmar) |
| 2 — Worker e entrega | concluída em 2026-11-22 | `apps/worker`, `packages/mail`, e-mail do dia por pessoa, `finance_due`, sino e preferências (AD-273); serviço na Railway e usuário no Atlas com o usuário |
| 3 — Módulo premium | pendente | — |
| 4 — Acompanhamento no tribunal | pendente (porta: fixtures de TJ/TRF ou "só TRT") | — |
| 5 — Sugestões de serviço | pendente | — |
| 6 — Sugestões financeiras, prazos, push | pendente (regra do alvará desligada até a resposta) | — |
