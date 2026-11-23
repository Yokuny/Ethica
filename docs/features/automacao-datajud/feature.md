---
feature: Automação Datajud (premium)
slug: automacao-datajud
descricao: Módulo premium que acompanha os processos no Datajud e gera avisos e sugestões que só valem com a aprovação da pessoa
data: 2026-11-22
status: parcial
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-268, AD-269, AD-270, AD-271, AD-274, AD-275, AD-276, AD-277, AD-278, AD-279, AD-280, AD-281]
spec: [.specs/features/automacao-datajud]
---

# Automação Datajud (premium)

**Status**: parcial · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. A intenção está em `.specs/features/automacao-datajud/`.
> Correlação com o git: `git log --oneline -i --grep='automacao-datajud'`.

## O que foi feito

- **Página Automação Datajud** (`/automation`, no lugar da Prospecção, que saiu inteira): o número de sugestões para aprovar (link para a aba da Central), os processos acompanhados no tribunal com a data da última consulta (link para o serviço) e as regras do que cada movimento traz, em texto da perita. Sem o módulo, a oferta. Está no menu, no início, no tour e no celular pelo Menu.
- **Pagamento no tribunal** (Fase 6): a requisição ou a ordem de pagamento vira o aviso "Pagamento em andamento no tribunal"; o alvará emitido ou a RPV/precatório paga vira a sugestão "Registrar o recebimento", com e-mail na hora. Aprovar abre o formulário com o honorário em aberto, o saldo e a data do movimento para a pessoa confirmar.
- Depois de aprovar um acordo ou uma desistência, vem a sugestão de cancelar os prazos e alertas pendentes do serviço; a suspensão traz o aviso para revisar os prazos.
- **Sugestões para aprovar** (Fase 5): suspensão, retomada, acordo, desistência ou extinção e sentença no tribunal viram uma sugestão de situação ou fase na aba **Para aprovar** da Central e na seção No tribunal do serviço. Nada muda até alguém com permissão de alterar serviços clicar em Aprovar; se o serviço já estiver assim, a sugestão se encerra sozinha.
- **Acompanhamento no tribunal** (Fase 4, perícias trabalhistas e federais): uma vez por dia o worker consulta no Datajud os processos dos escritórios com o módulo. A primeira vez só registra o que viu; depois, toda movimentação nova vira um aviso "Movimentação nova no tribunal" no sino, com link para o serviço. A seção **No tribunal** do serviço mostra os movimentos mais recentes; sem o módulo, a oferta.
- **Planos com Automação** (Fase 3): Mensal + Automação (R$ 80/mês) e Anual + Automação (R$ 816/ano) na mesma assinatura do Asaas; o pagamento libera o acesso e o módulo juntos. Quem já tem acesso assina por "Ver planos" na aba Avisos da Central (`/billing?upgrade=true`, só o admin).
- Faltando 7 dias para o módulo vencer, aviso no sino e e-mail na hora a quem vê o Financeiro.
- Fase 0: consultas reais ao Datajud e fixtures (`apps/worker/src/datajud/fixtures/`); spec, design e tasks; AD-268 a AD-271.

## Por que

A perita descobre tarde que o processo foi suspenso, acabou em acordo ou teve alvará. O Datajud só **sugere**: nada muda sem a aprovação da pessoa (AD-268), e pagamento só pelo alvará, com valor, data e conta confirmados (AD-269).

## Como

- `packages/contracts/src/schemas/billing.schema.ts` — planos, preços, `hasAutomation`; `packages/db/src/models/tenant.model.ts` — `automationUntil`.
- `apps/api/src/modules/identity/billing.service.ts` — cobrança e webhook estendendo o módulo; a sessão leva `tenant.automationUntil`.
- `apps/worker/src/jobs/reminders-sweep.ts` — aviso `automation_expiring`.
- `apps/web/src/routes/_public/billing/` (modo upgrade) e `apps/web/src/routes/_private/notifications/@components/automation-offer.tsx`.

- `apps/worker/src/datajud/client.ts` (cliente, fixtures reais ao lado), `apps/worker/src/jobs/court-refresh.ts`; `packages/db/src/models/{court-process,case-court-sync}.model.ts`.
- `apps/api/src/modules/automation/` — `GET /automation/cases` (processos acompanhados) e `GET /automation/cases/:id/court-process`, com `requireAutomation`.
- `apps/web/src/routes/_private/automation/` (página; regras em `@utils/rule-items.ts`).
- `apps/web/src/routes/_private/expert-cases/details/@components/case-court.tsx`.

- `packages/contracts/src/schemas/automation-rules.ts` (regras e `proposalFits`), `apps/worker/src/jobs/suggestions-expire.ts`, `apps/api/src/modules/notifications/notification.service.ts` (`acceptSuggestion`), `apps/web/src/components/suggestions-list.tsx`.

- `apps/web/src/components/suggestion-receipt-dialog.tsx` (recebimento).

- Métrica `automation_suggestions_decided_total` por regra e decisão, com painel em `ops/grafana/api-dashboard.json`.

Fica para depois: descoberta de nomeações pelo DJEN (AD-281), perícias cíveis (TJ), criar a receita junto com o recebimento, circuit breaker por tribunal.

## Como testar

A definir.

## Pendências

- [ ] Usuário: conferir a página Automação Datajud no navegador (com e sem o módulo).
- [ ] Usuário: confirmar o estudo do pagamento (AD-274, `.specs/features/automacao-datajud/context.md`).
- [ ] Fixture de TJ para incluir as perícias cíveis (TJMS e TJSP recusaram em 2026-11-22).

## Histórico

- 2026-11-22 — Página Automação Datajud no lugar da Prospecção, removida inteira, sem shim (AD-281, supersede a AD-105): o Datajud acompanha os processos do escritório e a descoberta de nomeações fica para o DJEN. Página coberta por teste de tela; a conferência no navegador ficou para o usuário (o acesso local exige passkey). Dados da Prospecção apagados em produção com a confirmação do usuário (collection vazia e um convite).
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
