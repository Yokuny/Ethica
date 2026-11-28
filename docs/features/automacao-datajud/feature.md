---
feature: Automação Datajud (premium)
slug: automacao-datajud
descricao: Módulo premium que acompanha os processos no Datajud e gera avisos e sugestões que só valem com a aprovação da pessoa
data: 2026-11-23
status: parcial
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-268, AD-269, AD-270, AD-271, AD-274, AD-275, AD-276, AD-277, AD-278, AD-279, AD-280, AD-281, AD-286, AD-287, AD-303, AD-314]
spec: [.specs/features/automacao-datajud]
---

# Automação Datajud (premium)

**Status**: parcial · **Atualizado**: 2026-11-28 · **Áreas**: `apps/api`, `apps/web`, `apps/worker`, `packages/contracts`, `packages/db`

> Documento vivo. A intenção está em `.specs/features/automacao-datajud/`.
> Correlação com o git: `git log --oneline -i --grep='automacao-datajud'`.

## O que foi feito

- **Página Automação Datajud** (`/automation`, no lugar da Prospecção, que saiu inteira): painel do que a automação fez no período e a lista paginada dos processos acompanhados (feature `painel-automacao`, AD-314) e, no menu "…" do cabeçalho, a página **Regras** (`/automation/rules`) com o que cada movimento traz, em texto da perita. Sem o módulo, a oferta. Está no menu, no início, no tour e no celular pelo Menu.
- **Pagamento no tribunal** (Fase 6): a requisição ou a ordem de pagamento vira o aviso "Pagamento em andamento no tribunal"; o alvará emitido ou a RPV/precatório paga vira a sugestão "Registrar o recebimento", com e-mail na hora. Aprovar abre o formulário com o honorário em aberto, o saldo e a data do movimento para a pessoa confirmar.
- Depois de aprovar um acordo ou uma desistência, vem a sugestão de cancelar os prazos e alertas pendentes do serviço; a suspensão traz o aviso para revisar os prazos.
- **Sugestões para aprovar** (Fase 5): suspensão, retomada, acordo, desistência ou extinção e sentença no tribunal viram uma sugestão de situação ou fase na aba **Para aprovar** da Central e na seção No tribunal do serviço. Nada muda até alguém com permissão de alterar serviços clicar em Aprovar; se o serviço já estiver assim, a sugestão se encerra sozinha.
- **Acompanhamento no tribunal** (Fase 4, perícias trabalhistas e federais): uma vez por dia o worker consulta no Datajud os processos dos escritórios com o módulo. A primeira vez só registra o que viu; depois, toda movimentação nova vira um aviso "Movimentação nova no tribunal" no sino, com link para o serviço. A seção **No tribunal** do serviço mostra os movimentos mais recentes; sem o módulo, a oferta.
- **Planos com Automação** (Fase 3): Mensal + Automação (R$ 80/mês) e Anual + Automação (R$ 816/ano) na mesma assinatura do Asaas; o pagamento libera o acesso e o módulo juntos. Quem já tem acesso assina por "Ver planos" na página Notificações ou na Automação Datajud (`/billing?upgrade=true`, só o admin; AD-282).
- Faltando 7 dias para o módulo vencer, aviso no sino e e-mail na hora a quem vê o Financeiro.
- Fase 0: consultas reais ao Datajud e fixtures (`packages/datajud/src/fixtures/`); spec, design e tasks; AD-268 a AD-271.

## Por que

A perita descobre tarde que o processo foi suspenso, acabou em acordo ou teve alvará. O Datajud só **sugere**: nada muda sem a aprovação da pessoa (AD-268), e pagamento só pelo alvará, com valor, data e conta confirmados (AD-269).

## Como

- `packages/contracts/src/schemas/billing.schema.ts` — planos, preços, `hasAutomation`; `packages/db/src/models/tenant.model.ts` — `automationUntil`.
- `apps/api/src/modules/identity/billing.service.ts` — cobrança e webhook estendendo o módulo; a sessão leva `tenant.automationUntil`.
- `apps/worker/src/jobs/reminders-sweep.ts` — aviso `automation_expiring`.
- `apps/web/src/routes/_public/billing/` (modo upgrade) e `apps/web/src/routes/_private/notifications/@components/automation-offer.tsx`.

- `packages/datajud/src/client.ts` (cliente, fixtures reais ao lado; era `apps/worker/src/datajud/`, AD-309), `apps/worker/src/jobs/court-refresh.ts`; `packages/db/src/models/{court-process,case-court-sync}.model.ts`.
- Diagnóstico das falhas (AD-287): cada chamada ao Datajud escreve `datajud.request` no log do worker (resultado, tempo, ritmo, cabeçalhos, carga do Elasticsearch, encontrados e faltantes) e alimenta `datajud_requests_total` e `datajud_request_duration_seconds` no `/metrics`; `worker.court_refresh` traz o IP público do dia; `worker.job_failed` traz o lote (`dedupeKey`), a tentativa e o `retryAt`. Campos, hipóteses e soluções: `.specs/features/automacao-datajud/plans/2026-11-24-diagnostico-falhas-datajud.md`.
- `apps/api/src/modules/automation/` — `GET /automation/cases` (processos acompanhados) e `GET /automation/cases/:id/court-process`, com `requireAutomation`.
- `apps/web/src/routes/_private/automation/` (página; regras em `rules/`, com `rules/@utils/rule-items.ts`).
- `apps/web/src/routes/_private/expert-cases/details/@components/case-court.tsx`.

- `packages/contracts/src/schemas/automation-rules.ts` (regras e `proposalFits`), `apps/worker/src/jobs/suggestions-expire.ts`, `apps/api/src/modules/notifications/notification.service.ts` (`acceptSuggestion`), `apps/web/src/components/suggestions-list.tsx`.

- `apps/web/src/components/suggestion-receipt-dialog.tsx` (recebimento).

- Métrica `automation_suggestions_decided_total` por regra e decisão, com painel em `ops/grafana/api-dashboard.json`.

Fica para depois: descoberta de nomeações pelo DJEN (AD-281), perícias cíveis (TJ), criar a receita junto com o recebimento, circuit breaker por tribunal.

## Como testar

A definir.

## Pendências

- [ ] Conferir nos logs `datajud.request` que a rodada das 05:00 (AD-303) passa nas primeiras tentativas; se não passar, espalhar os lotes pela manhã ou criar o disjuntor por tribunal (plano de 2026-11-24, AD-287). Só o TRT16 roda hoje: observar também quando houver mais tribunais.
- [ ] Usuário: confirmar o estudo do pagamento (AD-274, `.specs/features/automacao-datajud/context.md`).
- [ ] Fixture de TJ para incluir as perícias cíveis (TJMS e TJSP recusaram em 2026-11-22).

## Histórico

- 2026-11-28 — A página `/automation` virou o painel do que a automação fez no período, com a lista paginada no fim; detalhe na feature `painel-automacao` (AD-314).
- 2026-11-27 — Produção: dados do Datajud apagados a pedido do usuário, sem cópia (MVP), para validar do zero depois da `sugestoes-datajud`: 1 `CourtProcess` (TRT16, 83 movimentos), 1 `CaseCourtSync` e 9 jobs `court_refresh`/`court_refresh_batch`; não havia aviso nem sugestão do Datajud. O worker segue ligado e recria a linha de base na rodada das 05:00. Página de revisão das questões para a perita: `.specs/features/sugestoes-datajud/revisao-perita.html`.
- 2026-11-27 — Spec da evolução `sugestoes-datajud` (AD-304, proposta): Datajud fica com o estado do processo em código e o preenchimento pelo número; o DJEN, com o conteúdo e as nomeações. Achado na TPU: 14975, 14984 e 14985 da regra de suspensão são filhos de 14974 "Levantamento da causa suspensiva" (retomada); a correção está na spec (SGD-04).
- 2026-11-25 — Revisão de volume e escala do worker (só leitura). Logs da Railway de 25/11: uma rodada (`courts: {TRT16: 1}`, 1 lote, 1 número) e 9 chamadas, todas o mesmo lote tentado de novo depois do 429 do CNJ; não há excesso de chamadas nosso. As chamadas por dia crescem com tribunais × lotes de 50 processos, não com usuários. Achado para quando houver lotes cheios: a resposta truncada (`truncated` no log) é tratada como `ok`, e os processos cortados cairiam como não encontrados naquele dia; o mesmo número em dois escritórios do mesmo tribunal também pode ir em lotes diferentes. Ambos no roadmap.
- 2026-11-25 — Primeira correção das falhas (AD-303): a consulta diária começa às 05:00 em vez de 03:00 e o tempo limite por chamada sobe para 120 s; as 12 tentativas continuam. Os logs da AD-287 seguem para confirmar se a rodada passa nas primeiras tentativas.
- 2026-11-25 — Primeiras rodadas com os logs da AD-287 (Railway, 24/11 e 25/11, um lote do TRT16 com 1 processo): nos dois dias as 8 primeiras tentativas falharam e a 9ª deu certo (04:47 e 05:09 de Brasília); sem a AD-286 (5 tentativas) os dois dias teriam falhado. Todo 429 foi `es_rejected_execution_exception` do Elasticsearch do CNJ com a fila de busca cheia (10/10 threads, 1000 a 1003 na fila), em nós diferentes (`instance-0000000003`, `-10`, `-11`), sem cabeçalho de limite, com `lastMinute: 0` e lote de 1 número; o IP da Railway mudou entre os dias (dois endereços diferentes) e a máquina local também levou 429. Conclusão: sobrecarga do cluster do CNJ (H1); descartados bloqueio por IP (H2), nosso ritmo (H5) e tamanho do lote (H6), então trocar de IP (Lambda, outro servidor) não resolve. Também visto: a busca que dá certo leva 32 a 38 s (`took`) e duas tentativas morreram no limite de 60 s. Em 24/11 o 0017068-93.2025.5.16.0008 ganhou a linha de base (aparece como consultado em Processos acompanhados).
- 2026-11-24 — Diagnóstico das falhas do Datajud (AD-287): logs e métricas por chamada, IP público, contexto do job na falha; resposta `timed_out` volta para a fila em vez de virar "não encontrado". Uma chamada real da máquina local à 01:08 recebeu 429 no TRT16 e no TRT24 com a fila de busca do Elasticsearch cheia (10/10 threads, 1000 na fila) e tempo esgotado no TRT2: indica sobrecarga do cluster do CNJ, não bloqueio do nosso IP. Hipóteses e soluções (espalhar no tempo, disjuntor, outro horário, Lambda ou serviço próprio com outro IP, falar com o CNJ) no plano de 2026-11-24, para decidir com os logs da Railway.
- 2026-11-24 — "Processos acompanhados" lista todo serviço acompanhado, mesmo sem resposta do tribunal, com a situação de cada um; o worker passa a gravar o `CaseCourtSync` também do processo não encontrado (sem `baselineAt`). Detalhe em `processos-acompanhados`.
- 2026-11-24 — As regras saíram da página principal e foram para `/automation/rules`, aberta pelo menu "…" do cabeçalho (só com o módulo ativo), no mesmo padrão de /expert-cases.
- 2026-11-23 — Produção: o processo 0017068-93.2025.5.16.0008 (TRT16) do ETHICA estava na lista do worker e o Datajud o devolve (84 movimentos), mas o lote do dia levou 429 cinco vezes em 20 minutos e desistiu até o dia seguinte; sem resposta não há `CaseCourtSync` e o processo não aparece em "Processos acompanhados". O lote do Datajud agora tenta 12 vezes no dia (AD-286). Na véspera não houve lote: o módulo entrou depois da rodada do dia 22. A lista com todo processo acompanhado e a situação de cada um virou a feature `processos-acompanhados` (spec em 2026-11-24).
- 2026-11-23 — Página Automação Datajud conferida no navegador local: com o módulo, as sugestões (0), o processo do TRT24 com a última consulta e o link para o serviço, e as oito regras com Aviso ou Sugestão; sem o módulo, só a oferta, sem chamada à API.
- 2026-11-22 — Página Automação Datajud no lugar da Prospecção, removida inteira, sem shim (AD-281, supersede a AD-105): o Datajud acompanha os processos do escritório e a descoberta de nomeações fica para o DJEN. Página coberta por teste de tela e conferida no navegador em 2026-11-23. Dados da Prospecção apagados em produção com a confirmação do usuário (collection vazia e um convite).
- 2026-11-22 — Produção: limpeza deixou só o escritório ETHICA (Bykonz e Tal apagados, cópia fora do repositório) e o ETHICA recebeu o plano Mensal + Automação gravado no banco, sem assinatura no Asaas, até 31/12/2027, para usar o Datajud.
- 2026-11-22 — Revisão final: o lote só marca os movimentos como vistos depois de gravar aviso e sugestões (uma falha no meio não perde o alvará); a seção No tribunal some nos serviços cíveis (TJ ainda não acompanhado); push só aceita endpoint `https:`. Worker conferido no docker-compose (`/health` 200).
- 2026-11-22 — Fim da Fase 6: métricas por regra (AD-280). Plano arquivado em `.specs/features/central-notificacoes/plans/`; o plano do worker da prospecção continua na caixa de entrada para depois.
- 2026-11-22 — Fase 6 (parte financeira e de prazos, AD-279). Conferido na tela local: a sugestão de alvará abriu o formulário com o saldo e a data do movimento, e aprovar liquidou o honorário de teste.
- 2026-11-22 — Fase 5: sugestões de situação e fase (AD-278). Conferido na tela local: a sugestão de suspensão aprovada pela Central mudou o serviço de teste para Suspenso.
- 2026-11-22 — Fase 4: acompanhamento no tribunal só com TRT e TRF (AD-277). Rodado de verdade no banco local: o TRT24 trouxe um processo real e gravou a linha de base; 429 do TRT2, TRT4 e TRT15 voltaram para a fila e o TRF3 passou na segunda tentativa.
- 2026-11-22 — Fase 3: planos com Automação, `automationUntil`, modo upgrade da tela de planos, oferta na Central e aviso de vencimento (AD-276). O pagamento real não foi testado (cobrança no Asaas).
- 2026-11-22 — Estudo do pagamento na TPU do CNJ e em processos reais: intenção = 12548 e requisição 12165; dinheiro disponível = alvará 60 + 73 e RPV/precatório "Paga" 12176/12169 (AD-274). Preço do usuário: base R$ 60, premium R$ 80 (AD-275, leitura a confirmar).
- 2026-11-22 — Fixture do TRF3: o alvará é o mesmo movimento 60 com o complemento 73 do TRT24; TJ ainda recusa (504/429).
- 2026-11-22 — Fase 0: descoberta no Datajud (TRT24 responde; TRT2, TRF3 e TJMS recusaram), documentação e ADs.

## Referências

- Spec (congelada): `.specs/features/automacao-datajud/`
- Planos: `.specs/features/central-notificacoes/plans/2026-11-22-automacao-datajud-notificacoes.md`, `.specs/features/automacao-datajud/plans/2026-11-22-pagina-automacao-fim-prospeccao.md`, `.specs/features/prospeccao-datajud/plans/2026-11-22-prospeccao-worker-datajud.md` (arquivado)
