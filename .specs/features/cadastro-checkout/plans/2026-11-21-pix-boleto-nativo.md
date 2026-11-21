# PIX e boleto na tela do Ethica e conferência do pagamento sem webhook — plano

**Data**: 2026-11-21 · **Pedido**: usuário — "roteamento para tela nativa para pix e boleto dentro da nossa própria
plataforma"; "cartão de crédito e débito faz no checkout do Asaas"; "crie o `ASAAS_WEBHOOK_TOKEN`"; "não usarei túnel
(…) deixe isso apenas para produção"; "implemente a opção b de uma forma que fique otimizada para dev e sirva para a
produção, porém sem criar algo que gere gargalo".

## Problema

- Pagar sempre abre a fatura do Asaas, mesmo para PIX e boleto, que podem ser mostrados no próprio Ethica.
- O acesso só abre com o webhook. Em dev o Asaas não alcança `localhost` (e não havia webhook nem token configurados:
  verificado no painel do sandbox e de produção), então a tela de planos espera para sempre; em produção, um webhook
  atrasado ou com a fila pausada (15 falhas seguidas) deixa o escritório pago sem acesso.

## Requisitos

- **CHK-11** Teste e mensalidade avulsa perguntam a forma de pagamento: **PIX** e **boleto** abrem a tela do Ethica
  `/billing/payment/<id>`; **cartão** (crédito ou débito) abre a fatura do Asaas. Mensal e anual seguem no cartão, na
  fatura do Asaas.
- **CHK-12** Tela do PIX: valor, QR Code, código copia e cola com botão de copiar e validade. Tela do boleto: valor,
  vencimento, linha digitável com botão de copiar e link do PDF. As duas dizem que o acesso abre sozinho quando o
  pagamento for confirmado e voltam aos planos.
- **CHK-13** Só a cobrança do próprio escritório é mostrada (cliente do Asaas igual ao do escritório), senão
  `not_found`. PIX indisponível na conta do Asaas (sem chave Pix) responde `pix_unavailable`.
- **CHK-14** Com o acesso fechado, `GET /billing` confere no Asaas as cobranças recentes do escritório (cliente do
  Asaas) e libera o acesso pelas mesmas regras do webhook para cada uma confirmada ou recebida. Só confere quando
  o escritório tem cliente no Asaas e ainda não pagou nenhuma vez, ou criou uma cobrança nos últimos 7 dias
  (`billing.pendingSince`, gravado ao pagar e apagado quando o acesso é liberado). No máximo uma consulta a cada
  30 s por escritório, com espera curta (10 s); falha do Asaas não quebra a tela e não gera log por consulta.
- **CHK-15** O webhook continua o caminho principal em produção; `ASAAS_WEBHOOK_TOKEN` gerado no `.env` local (não
  versionado) e o mesmo valor vai à Railway e ao webhook do painel do Asaas.

## Design

- **Contrato** (`packages/contracts/src/schemas/billing.schema.ts`): `BILLING_METHODS = ['card', 'pix', 'boleto']`;
  `billingPaySchema` ganha `method` (padrão `card`; mensal e anual só `card`). Resposta do pagar:
  `BillingCharge = { paymentId, url }`. Tela: `BillingPaymentView = { id, valueCents, dueDate, paid, pix?, boleto? }`
  e `billingPaymentQuerySchema = { method: 'pix' | 'boleto' }`.
- **Asaas** (`apps/api/src/providers/asaasClient.ts`): `getPayment(id)`, `listPayments(customer)`, `pixQrCode(id)`,
  `boletoLine(id)`;
  `firstInvoiceUrl` vira `firstPayment` (id e fatura da primeira cobrança da assinatura). As cobranças avulsas seguem
  `UNDEFINED` (o mesmo pagamento serve PIX, boleto e cartão; o teste reaproveita a cobrança como hoje).
- **API** (`billing.*`):
  - `pay` grava `billing.pendingSince` e devolve `{ paymentId, url }` (o teste reaproveitado também).
  - `GET /billing/payments/:id?method=` (admin): confere o dono, busca a cobrança e só a parte pedida (QR Code ou
    linha digitável).
  - `receiveWebhook` e a conferência do `GET /billing` usam `periodOf` + `extendAccess`; `extendAccess` apaga
    `pendingSince`. Asaas: `listPayments(customer)` (últimas 10) com espera de 10 s.
  - Gargalo: nenhum trabalho em segundo plano nem varredura; a conferência acontece só com a tela de planos aberta
    (a web consulta a cada 10 s e não consulta com a aba escondida), limitada a uma a cada 30 s por escritório
    (memória do processo).
- **Web**: diálogo "Como você quer pagar?" (PIX, Boleto, Cartão de crédito ou débito) para teste e avulsa; rota
  `apps/web/src/routes/_public/billing/payment/$paymentId/` com `method` na URL; a tela consulta a cobrança uma vez e
  o `billingQuery` a cada 10 s, e entra no sistema quando o acesso abre (como a tela de planos).
- Glossário: **Forma de pagamento** = `method`; **Cobrança** = `payment` (Asaas).

## Tarefas

1. AD-251, glossário, chave `pix_unavailable` em `API_MESSAGE_KEYS` e no dicionário.
2. Contrato + model (`pendingSince`) + cliente do Asaas (+ teste unitário).
3. Serviço, controller e rota; e2e: pagar com método, tela de PIX/boleto, dono errado, conferência libera o acesso (inclusive
   cobrança antiga do teste) e respeita os 30 s, webhook tira a pendência.
4. Web: diálogo de forma de pagamento, tela do PIX/boleto, testes unitários.
5. `ASAAS_WEBHOOK_TOKEN` no `.env`; prints; registro (feature.md, roadmap: chave Pix e aprovação do sandbox, webhook e
   token em produção, domínio no Asaas).
