---
feature: Automação Datajud (premium)
slug: automacao-datajud
descricao: Módulo premium que acompanha os processos no Datajud e gera avisos e sugestões que só valem com a aprovação da pessoa
data: 2026-11-22
status: em-andamento
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-268, AD-269, AD-270, AD-271, AD-274, AD-275, AD-276, AD-277]
spec: [.specs/features/automacao-datajud]
---

# Automação Datajud (premium)

**Status**: em-andamento · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Ainda não implementado: a intenção está em `.specs/features/automacao-datajud/`.
> Correlação com o git: `git log --oneline -i --grep='automacao-datajud'`.

## O que foi feito

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
- `apps/api/src/modules/automation/` — `GET /automation/cases/:id/court-process` com `requireAutomation`.
- `apps/web/src/routes/_private/expert-cases/details/@components/case-court.tsx`.

Fases 5 e 6 a fazer.

## Como testar

A definir.

## Pendências

- [ ] Usuário: confirmar o estudo do pagamento (AD-274, `.specs/features/automacao-datajud/context.md`).
- [ ] Fixture de TJ para incluir as perícias cíveis (TJMS e TJSP recusaram em 2026-11-22).

## Histórico

- 2026-11-22 — Fase 4: acompanhamento no tribunal só com TRT e TRF (AD-277). Rodado de verdade no banco local: o TRT24 trouxe um processo real e gravou a linha de base; 429 do TRT2, TRT4 e TRT15 voltaram para a fila e o TRF3 passou na segunda tentativa.
- 2026-11-22 — Fase 3: planos com Automação, `automationUntil`, modo upgrade da tela de planos, oferta na Central e aviso de vencimento (AD-276). O pagamento real não foi testado (cobrança no Asaas).
- 2026-11-22 — Estudo do pagamento na TPU do CNJ e em processos reais: intenção = 12548 e requisição 12165; dinheiro disponível = alvará 60 + 73 e RPV/precatório "Paga" 12176/12169 (AD-274). Preço do usuário: base R$ 60, premium R$ 80 (AD-275, leitura a confirmar).
- 2026-11-22 — Fixture do TRF3: o alvará é o mesmo movimento 60 com o complemento 73 do TRT24; TJ ainda recusa (504/429).
- 2026-11-22 — Fase 0: descoberta no Datajud (TRT24 responde; TRT2, TRF3 e TJMS recusaram), documentação e ADs.

## Referências

- Spec (congelada): `.specs/features/automacao-datajud/`
- Planos em execução: `.specs/plans/2026-11-22-automacao-datajud-notificacoes.md`, `.specs/plans/2026-11-22-prospeccao-worker-datajud.md`
