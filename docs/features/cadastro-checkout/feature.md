---
feature: Cadastro com checkout
slug: cadastro-checkout
descricao: Criar conta termina na assinatura paga no Asaas; sem pagamento ou mensalidade vencida, o escritório fica suspenso
data: 2026-11-18
status: parcial
areas: [apps/api, apps/web, packages/contracts, packages/db, harness]
decisoes: [AD-230, AD-231, AD-155, AD-220, AD-098]
spec: [.specs/features/cadastro-checkout]
---

# Cadastro com checkout

**Status**: parcial · **Atualizado**: 2026-11-18 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `harness`

> Documento vivo. Requisitos e desenho em `.specs/features/cadastro-checkout/` (`spec.md`, `design.md`).
> Correlação com o git: `git log --oneline -i --grep='cadastro-checkout'`.

## O que foi feito

- Entrada com **Criar conta**: e-mail → chave → nome, escritório e CNPJ → passkey do aparelho. O escritório nasce sem acesso.
- Tela de conta suspensa vira a tela de planos: **teste** (R$ 6, 7 dias, uma vez), **mensal** (R$ 60) e **anual** (R$ 612) no cartão, e **mensalidade avulsa** (R$ 60) por boleto, PIX ou cartão. **Pagar** abre a fatura do Asaas; só o admin paga, os demais veem o aviso. Sair continua.
- Pagamento confirmado pelo Asaas libera o acesso até o fim do período, mais 5 dias de carência (o teste também, AD-231). Acabou o período, toda entrada volta à tela de planos.
- Feed iCal e aviso diário de prazos param junto com o acesso.

## Por que

O cadastro aberto e gratuito (AD-155) passa a acontecer junto do pagamento (AD-230). Uma data de acesso, em vez de status novo, resolve teste, carência e cadastro não pago sem rotina diária.

## Como

- Banco: `Tenant.accessUntil` e `Tenant.billing`; regra única `isTenantOpen`/`openTenantFilter` (`packages/db/src/models/tenant.model.ts`).
- Contrato: `packages/contracts/src/schemas/billing.schema.ts` (planos, valores, dias).
- API: `apps/api/src/modules/identity/billing.*` (`GET /billing`, `POST /billing/pay`, `POST /billing/webhook`), `validSession` em `apps/api/src/middlewares/authentication.middleware.ts`, cliente em `apps/api/src/providers/asaasClient.ts`. Variáveis `ASAAS_*` em `apps/api/src/config/env.config.ts` e `.env.example`.
- Web: `apps/web/src/routes/_public/auth/` (Criar conta) e `apps/web/src/routes/_public/suspended/` (planos e Pagar).

## Como testar

- Automático: `pnpm vitest run apps/api/src/modules/identity/billing apps/api/src/providers/asaasClient apps/web/src/routes/_public`.
- Manual (sandbox): `ASAAS_API_URL=https://api-sandbox.asaas.com/v3`, `ASAAS_API_KEY` do sandbox e `ASAAS_WEBHOOK_TOKEN`; no painel do Asaas, webhook para `<API>/billing/webhook` com os eventos de cobrança, envio sequencial e o mesmo token. Crie uma conta em `/auth` (CNPJ válido), pague a fatura com cartão de teste e confira que a tela de planos entra no sistema sozinha.

## Antes de ir ao ar

Sem estes passos, **todo cadastro novo fica sem acesso** e "Pagar" responde "indisponível":

- Railway: `ASAAS_API_URL`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` (`.env.example`).
- Painel do Asaas: webhook para `<API>/billing/webhook` com os eventos de cobrança, envio sequencial e o mesmo token.
- Opcional: domínio do Ethica em Minha Conta > Informações no Asaas e então `ASAAS_RETURN_URL` (volta automática da fatura).

## Pendências

- [ ] Conferir o webhook real chegando e liberando o acesso (`.specs/features/cadastro-checkout/validation.md`).
- [ ] Estorno e chargeback não tiram o acesso.
- [ ] Trocar de plano, cancelar a assinatura e ver faturas pelo Ethica (fora desta entrega).

## Histórico

- 2026-11-18 — Spec criada (`.specs/features/cadastro-checkout/spec.md`), AD-230 proposta.
- 2026-11-18 — Implementado (AD-230 ativa). Divergências da spec: o plano é escolhido na tela de planos (`/suspended`), depois da passkey, e não no formulário do escritório; o pagamento usa a fatura do Asaas, não o checkout (`/v3/checkouts` não aceita boleto nem o cliente já cadastrado). A cobrança fica no módulo `identity`, dono do `Tenant`.
- 2026-11-18 — Revisão: escritório suspenso pela plataforma não chega à tela de planos; a tela de planos reconsulta a cada 10 s e entra no sistema quando o pagamento é confirmado; o id da assinatura é gravado antes de buscar a fatura e apagar assinatura que não existe mais não é erro; pagamento ignorado pelo webhook vai ao log (`billing.paid_ignored`); fatura velha do teste paga depois de outro pagamento não vale. Pelo sandbox: retorno da fatura opcional (`ASAAS_RETURN_URL`, o Asaas recusa sem domínio cadastrado) e dígito do CNPJ conferido no cadastro.
- 2026-11-18 — Teste confirmado em 7 dias e passa a ter os 5 dias de carência (AD-231); na spec congelada o padrão era sem carência.

## Referências

- Spec, design, tasks e validação (congelados): `.specs/features/cadastro-checkout/`
