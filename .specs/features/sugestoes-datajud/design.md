# Sugestões do Datajud no serviço e no financeiro — Design

**Spec**: `.specs/features/sugestoes-datajud/spec.md` (questões confirmadas pela perita em 2026-11-27). **Decisões**:
AD-304 (papel das fontes), AD-268 a AD-280 (regras e aprovação), AD-305 e AD-306 (fases que encerram).
Prefixo `SGD`. Lido contra o código de 2026-11-27, com outra sessão mexendo em status e fases do serviço: o design
cita fases e listas **pelo nome do símbolo** (`CASE_CLOSED_PHASES`, `casePhases`), nunca pelos valores de hoje.

## Divergências em relação à spec

| Spec | Design | Por quê |
| --- | --- | --- |
| SGD-05.2/05.4: sugerir "Honorários recebidos" | Perícia: `fees_received`; assistência técnica: `assistance_closed` ("Finalizado") | AD-306 tirou o encerramento de `fees_received`; o usuário escolheu esta saída em 2026-11-27 |
| SGD-07: preencher vara, ajuizamento **e objeto** pela automação | Só vara e data de ajuizamento | `subject` é obrigatório no serviço (`packages/contracts/src/schemas/case.schema.ts`): nunca está vazio depois de salvo. O objeto vem só na busca na hora, no cadastro |
| SGD-06.3: dizer se é "não encontrado" ou "segredo de justiça" | Uma resposta só: "não encontrado ou em segredo de justiça" | O processo em segredo é descartado no client (AD-271) e nunca sai dele; separar os dois exigiria carregar o segredo até a API |
| SGD-03.3: sem honorário em aberto, abrir o Financeiro filtrado pelo serviço | Abre o serviço (a seção Financeiro dele) | O detalhe do serviço já mostra os lançamentos; um filtro novo na lista seria outro caminho para o mesmo lugar |
| SGD-05.3/05.4: decidir no movimento novo e encadear no aceite do recebimento | O worker avalia o **estado** do processo a cada consulta (D3), sem encadeamento na API | Cobre recebimento rejeitado, expirado ou parcial (o TRT24 traz 16 alvarás num dia) num lugar só; a sugestão de encerrar chega até um dia depois do recebimento |
| SGD-07.1: só na primeira consulta | Em qualquer consulta que encontra o processo, uma vez por serviço | A busca na hora que falha promete a sugestão também para serviço já acompanhado |

## D1. Regras pela TPU (SGD-04, SGD-05) — `packages/contracts/src/schemas/automation-rules.ts`

- `case_suspended` (versão 2): todo filho ativo de 25 "Suspensão ou Sobrestamento" (movimento do magistrado), de
  11025 "Suspensão ou Sobrestamento" (despacho), 12274 "Sobrestado" (deliberado em sessão) e 245 "Arquivamento
  provisório".
  Saem 14975, 14984 e 14985. A lista fica escrita no arquivo com o comentário da fonte (TPU baixada em
  2026-11-27), sem ler a TPU em tempo de execução.
- `case_resumed` (versão 2): 12066, 14974 e seus filhos ativos (14975 a 14985, 15414, 15416), 849 "Reativação" e 893
  "Desarquivamento".
- Novas constantes ao lado de `PAYMENT_INTENT_CODES`: `FEES_COLLECTION_CODES = [848, 11384, 11385]` e
  `CASE_FINISHED_CODES = [246, 22, 196]`.
- Nova regra `case_finished` (versão 1): `propose(serviceType)` devolve `{ target: 'case_phase', value:
  'fees_received' }` na perícia e `'assistance_closed'` na assistência técnica. Diferente das outras, não sai de
  `matchRules` por movimento: o worker a aplica pelo estado do processo (D3).
- **Processo encerrado no tribunal** (`isCourtFinished(movements)` em `automation-rules.ts`): ordenando os movimentos
  de todos os graus pela data, o último entre os de encerrar e os de retomada (`case_resumed`) é de encerrar. A baixa
  definitiva (22) só conta no primeiro grau (`G1`, `JE`): no segundo grau é o recurso voltando à origem. Visto nos
  processos reais: no TRF3 uma baixa em 2011 vem seguida de reativação (849) e redistribuição, e o processo só
  termina na baixa de 2023.
- A página Regras (`apps/web/src/routes/_private/automation/rules/@utils/rule-items.ts`) ganha os itens novos a
  partir dessas constantes.

## D2. Proposta nova `case_fill` (SGD-07)

- `CaseProposal` ganha `{ target: 'case_fill'; division?: string; docketingDate?: string }`; `proposalModule` →
  `expert_cases`.
- `proposalFits` recebe também `division` e `docketingDate` do serviço: `already` quando nenhum dos campos da
  proposta continua vazio; senão `apply`. Serviço encerrado não bloqueia (é só cadastro).
- Criada pelo worker em **qualquer** consulta que encontra o processo, se o serviço tem vara ou data de ajuizamento
  vazias, uma vez por serviço (`dedupeKey: suggestion:<caseId>:case_fill`). Evidência: o movimento mais recente do
  processo; a data da sugestão é a dele, como nas outras.
- Vara: o nome como o tribunal escreve; todo em maiúsculas ("VARA DO TRABALHO DE BATAGUASSU", TRT24) vira
  maiúscula só no início das palavras, com "de", "do", "da" em minúscula. O contato da vara (VAR-03) já casa o nome
  sem diferenciar maiúsculas.
- Aceitar (`apps/api/src/modules/notifications/notification.service.ts`, `apply`): `caseService.updateCase` só com
  os campos que **continuam vazios** no serviço naquele momento.

## D3. Worker: honorário em aberto, cobrar e encerrar pelo estado (SGD-05) — `apps/worker/src/jobs/court-refresh.ts`

- `packages/db/src/workerReads.ts` ganha `incomeOf(tenantId, caseIds)`: por serviço, o id da receita em aberto mais
  antiga (`expected` ou `partial`, a mesma regra do diálogo de recebimento) e se há ao menos uma receita `settled`.
  Cancelada não conta. Uma consulta `$in` por lote.
- **Recebido** = nenhuma receita em aberto **e** ao menos uma liquidada. Serviço sem receita lançada não é recebido
  nem em aberto: não gera cobrança nem encerramento.
- Em toda consulta de um serviço que já tem linha de base (a primeira só grava o que viu, AD-268), depois das regras
  de hoje e do pagamento, o worker olha o **estado** do processo, não só os movimentos novos:
  - **Cobrar**: há no histórico um movimento de `FEES_COLLECTION_CODES` e uma receita em aberto → aviso
    `fees_collection` (`module: 'finance'`, `transactionId`), `dedupeKey: fees_collection:<caseId>` sem dia: uma vez
    por serviço.
  - **Encerrar** (`isCourtFinished`), sem sugestão de recebimento pendente do serviço (inclusive a criada neste lote):
    - recebido → sugestão `case_finished` (se `proposalFits` = `apply`), `dedupeKey` com a chave do movimento de
      encerrar (reativado e encerrado de novo, vem de novo);
    - receita em aberto → aviso `fees_open_finished` (`module: 'finance'`, `transactionId`), uma vez por movimento de
      encerrar.
  - Com recebimento pendente, nada: quando ele for aceito (inteiro ou em parte), rejeitado ou expirar, a consulta do
    dia seguinte decide pelo estado. Cobre o TRT24, em que a RPV paga vem **depois** do arquivamento.
- A sugestão de recebimento (`payment_available`) passa a levar o `transactionId` da receita em aberto, quando há,
  para o botão "Abrir lançamento" (D9).
- `NOTICE_TOPICS` ganha `fees_collection` e `fees_open_finished` (chaves de tradução no dicionário do web; entram no
  resumo do dia, sem e-mail na hora).

## D4. (sai) Encadeamento na API

Substituído pela avaliação do estado em D3: nenhuma mudança no `acceptSuggestion` além do `case_fill`.

## D5. Client do Datajud num pacote (SGD-06) — `packages/datajud`

A API passa a consultar o Datajud na hora (AD-304) e não pode importar o worker. O client vai de
`apps/worker/src/datajud/` para um pacote novo `packages/datajud` (cliente, `parseAnswer`, métricas, fixtures e
testes), no mesmo padrão do `packages/mail`, usado pelos dois. Sem shim: o worker passa a importar do pacote e a
pasta antiga sai.

- `CourtProcessData` (e o model `CourtProcess`) ganham `filedAt` (de `dataAjuizamento`, `20251106173840` →
  `2025-11-06`, data do tribunal sem fuso) e `subjects` (nomes de `assuntos`).
- `DATAJUD_API_KEY` e `DATAJUD_BASE_URL` voltam ao `env.config` da API (revê o item 2 da AD-281). Sem a chave, a
  busca responde `court_unavailable`.
- O pacote entra como o `packages/mail`: `COPY` do `package.json` e da pasta em `Dockerfile`, `Dockerfile.dev` e
  `Dockerfile.worker`, referências do TypeScript e projeto do vitest, e uma linha no mapa do monorepo do `AGENTS.md`.

## D6. Busca no tribunal na hora (SGD-06) — API e web

**API** (`apps/api/src/modules/automation/`):

- `GET /automation/court-lookup?processNumber=…` com o guard do módulo (`requireAutomation`) e
  `can('expert_cases', 'view')`. O número precisa passar `isTrackedNumber`.
- Serviço: tribunal e esfera por `courtUnitFromNumber`; se o `CourtProcess` desse número foi buscado hoje, usa a
  cópia; senão chama o Datajud **uma vez** (sem as tentativas do worker), tempo limite de 110 s, e grava a cópia
  (`upsert`, como o worker). Resposta: `{ courtType, court, division?, docketingDate?, subject? }` (`subject` = os
  assuntos juntos por vírgula).
- Tempo: o `fetch` do web (`apps/web/src/lib/api/client.api.ts`) não tem limite e o Node aceita requisição de até
  300 s; conferir o limite do proxy da Railway no deploy (T11). "Não encontrado" não grava cópia: cada clique
  consulta de novo, só por ação da pessoa.
- Erros (chaves novas em `API_MESSAGE_KEYS` e no dicionário): `court_process_not_found` (404, "não encontrado ou em
  segredo de justiça") e `court_unavailable` (503, "o tribunal não respondeu agora; depois de salvar, a automação
  busca e traz como sugestão").

**Web** (`apps/web/src/routes/_private/expert-cases/@components/case-form-fields.tsx`):

- Botão "Buscar no tribunal" logo depois do campo do número, habilitado com `isTrackedNumber`. Sem o módulo, abre um
  diálogo com o `AutomationOffer` de hoje.
- Ao responder, grava no form **só os campos vazios** (`setValue` com `shouldDirty`) e mostra o mesmo aviso do
  preenchimento por PDF ("revise antes de salvar"); sem campo vazio, diz isso.
- Enquanto busca, o botão mostra o carregamento; o cadastro continua livre.

## D7. Botão de sugestão (SGD-01, SGD-02) — `apps/web/src/components/suggestion-button.tsx`

- Um componente: recebe as sugestões pendentes que valem para aquele lugar e mostra o botão com a borda animada
  (gradiente cônico roxo e rosa girando por `@property`; com `prefers-reduced-motion`, parado). Clicar abre um
  `Popover` com o texto de cada sugestão (`notificationText`), a data do movimento e o `SuggestionActions` de hoje
  (Aceitar/Rejeitar, com a regra de permissão D5 e o diálogo de recebimento).
- Dados: a mesma consulta que existe (`notificationsQuery({ caseId, kind: ['suggestion'], state: 'open' })`),
  filtrada por `proposal.target` em cada lugar **e por `proposalFits` contra o serviço carregado**: hoje a sugestão
  só se encerra ao ser decidida, então a pessoa que edita o dado à mão não vê mais o botão daquilo que já está
  como sugerido (SGD-01.6, SGD-07.3); ao clicar Aceitar, a API a encerra como `superseded`, como hoje. Aceitar ou
  rejeitar invalida a consulta e o botão some.
- Lugares:
  - Detalhe do serviço: ao lado do `RecordStatus` (`case_status`), ao lado da estatística da fase (`case_phase`),
    no grupo do tribunal ao lado da vara e da data de ajuizamento (`case_fill`) e, no `CardAction`, o botão com o
    número de todas as pendentes do serviço (no celular, dentro do `PageMenu`).
  - Detalhe do lançamento: ao lado da parcela em aberto e no `CardAction`, só as de recebimento
    (`transaction_installment`) do serviço do lançamento.
- O `SuggestionsList` sai da seção No tribunal (`case-court.tsx`): o botão do cabeçalho o substitui. A Central
  continua com a lista dela.

## D8. Detalhe do lançamento (SGD-02)

- API: `GET /finance/entries/:id` (`can('finance', 'view')`), pelo `transactionService.getTransaction` que já existe.
- Web: `apps/web/src/routes/_private/finance/details/index.tsx` no padrão de detalhe do front (`Card asPage`, cabeçalho
  com `CardAction`): tipo, categoria, descrição, serviço com link, valor, vencimento e o `installments-list` de hoje.
  Editar abre o `TransactionForm` de hoje; excluir, o `ConfirmDialog`.
- A linha da lista do Financeiro passa a abrir o detalhe (hoje abre o diálogo de edição); editar sai da linha.

## D9. Ações na notificação (SGD-03) — `apps/web/src/routes/_private/notifications/@components/notifications-table.tsx`

Ao lado do Aceitar/Rejeitar ou do Marcar como lido, um botão "Abrir": com `transactionId` → detalhe do lançamento;
senão, com `caseId` → detalhe do serviço. A mesma regra no e-mail do resumo, se o link já existir lá.

## D10. Lista No tribunal sem ruído (SGD-08) — `case-court.tsx`

Uma função pura em `apps/web/src/routes/_private/expert-cases/details/@utils/court-movement-rows.ts`, coberta por teste
de unidade: tira 1051, junta 92 e 1061 do mesmo minuto numa linha, agrupa o mesmo código e os mesmos complementos no
mesmo dia (`count`). A linha cujo código é de alguma regra (`AUTOMATION_RULES`, pagamento, cobrar, encerrar) ganha um
selo. As 30 linhas mostradas são contadas depois do agrupamento.

## Testes

- Contratos: `proposalFits` com `case_fill`; códigos das regras novas e corrigidas.
- Contratos: `isCourtFinished` com as sequências dos processos reais (TRF3 baixa → reativação → baixa; TRT24 extinção
  → arquivamento → paga; 22 no segundo grau).
- Worker (`court-refresh.int.test.ts`): cobrar uma vez só; encerrar recebido, em aberto e sem receita lançada;
  recebimento pendente segura o encerramento e, decidido, a consulta seguinte encerra ou avisa; preenchimento em
  serviço já acompanhado; `transactionId` no recebimento.
- API (e2e): `court-lookup` com cópia do dia, com o Datajud falso (encontrado, não encontrado, 429) e sem o módulo;
  aceitar `case_fill` só grava vazio; `GET /finance/entries/:id`.
- Produção depois da limpeza: a primeira rodada é linha de base silenciosa, então as regras novas são conferidas no
  banco local, rodando o lote com os movimentos de um processo real e tirando chaves do `seenMovementKeys` do
  `CaseCourtSync` para repetir movimentos (T11).
- Web: `court-movement-rows` (unidade); botão de sugestão e detalhe do lançamento renderizados (teste de tela);
  conferência no navegador local.
