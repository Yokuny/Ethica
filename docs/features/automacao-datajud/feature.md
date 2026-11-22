---
feature: Automação Datajud (premium)
slug: automacao-datajud
descricao: Módulo premium que acompanha os processos no Datajud e gera avisos e sugestões que só valem com a aprovação da pessoa
data: 2026-11-22
status: em-andamento
areas: [apps/api, apps/web, apps/worker, packages/contracts, packages/db]
decisoes: [AD-268, AD-269, AD-270, AD-271, AD-274, AD-275, AD-276]
spec: [.specs/features/automacao-datajud]
---

# Automação Datajud (premium)

**Status**: em-andamento · **Atualizado**: 2026-11-22 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`

> Documento vivo. Ainda não implementado: a intenção está em `.specs/features/automacao-datajud/`.
> Correlação com o git: `git log --oneline -i --grep='automacao-datajud'`.

## O que foi feito

- **Planos com Automação** (Fase 3): Mensal + Automação (R$ 80/mês) e Anual + Automação (R$ 816/ano) na mesma assinatura do Asaas; o pagamento libera o acesso e o módulo juntos. Quem já tem acesso assina por "Ver planos" na aba Avisos da Central (`/billing?upgrade=true`, só o admin).
- Faltando 7 dias para o módulo vencer, aviso no sino e e-mail na hora a quem vê o Financeiro.
- Fase 0: consultas reais ao Datajud e fixtures (`.specs/features/automacao-datajud/fixtures/`); spec, design e tasks; AD-268 a AD-271.

## Por que

A perita descobre tarde que o processo foi suspenso, acabou em acordo ou teve alvará. O Datajud só **sugere**: nada muda sem a aprovação da pessoa (AD-268), e pagamento só pelo alvará, com valor, data e conta confirmados (AD-269).

## Como

- `packages/contracts/src/schemas/billing.schema.ts` — planos, preços, `hasAutomation`; `packages/db/src/models/tenant.model.ts` — `automationUntil`.
- `apps/api/src/modules/identity/billing.service.ts` — cobrança e webhook estendendo o módulo; a sessão leva `tenant.automationUntil`.
- `apps/worker/src/jobs/reminders-sweep.ts` — aviso `automation_expiring`.
- `apps/web/src/routes/_public/billing/` (modo upgrade) e `apps/web/src/routes/_private/notifications/@components/automation-offer.tsx`.

Fases 4 a 6 a fazer.

## Como testar

A definir.

## Pendências

- [ ] Usuário: confirmar o estudo do pagamento (AD-274, `.specs/features/automacao-datajud/context.md`).
- [ ] Fixture de TJ (TJMS e TJSP recusaram em 2026-11-22) antes da Fase 4, ou confirmar começar só com TRT e TRF.

## Histórico

- 2026-11-22 — Fase 3: planos com Automação, `automationUntil`, modo upgrade da tela de planos, oferta na Central e aviso de vencimento (AD-276). O pagamento real não foi testado (cobrança no Asaas).
- 2026-11-22 — Estudo do pagamento na TPU do CNJ e em processos reais: intenção = 12548 e requisição 12165; dinheiro disponível = alvará 60 + 73 e RPV/precatório "Paga" 12176/12169 (AD-274). Preço do usuário: base R$ 60, premium R$ 80 (AD-275, leitura a confirmar).
- 2026-11-22 — Fixture do TRF3: o alvará é o mesmo movimento 60 com o complemento 73 do TRT24; TJ ainda recusa (504/429).
- 2026-11-22 — Fase 0: descoberta no Datajud (TRT24 responde; TRT2, TRF3 e TJMS recusaram), documentação e ADs.

## Referências

- Spec (congelada): `.specs/features/automacao-datajud/`
- Planos em execução: `.specs/plans/2026-11-22-automacao-datajud-notificacoes.md`, `.specs/plans/2026-11-22-prospeccao-worker-datajud.md`
