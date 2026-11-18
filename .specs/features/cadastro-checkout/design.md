# Design — Cadastro com checkout

Spec: `.specs/features/cadastro-checkout/spec.md`. Decisão: AD-230.

## Ideia central: uma data de acesso

O escritório tem **`Tenant.accessUntil`** (instante UTC). Sem a data, nada muda (escritórios de teste,
seed, os criados pela plataforma). Com ela, o acesso vale só antes desse instante. O cadastro grava
`accessUntil = agora` (sem acesso) e cada pagamento confirmado **estende** a data. Não existe
status novo nem rotina diária: teste encerrado, mensalidade vencida e cadastro não pago são a mesma
regra, lida em toda requisição. `status: 'suspended'` (AD-098) continua valendo para a plataforma.

Regra única em `packages/db/src/models/tenant.model.ts`:
- `isTenantOpen(tenant, now)`: `status !== 'suspended'` e (`accessUntil` ausente ou `> now`).
- `openTenantFilter(now)`: o mesmo como filtro do Mongo.

Os três leitores passam a usá-las: `authenticateSession` (403 `tenant_suspended`), dono do feed iCal e
destinatários do aviso diário (`apps/api/src/modules/identity/account.repository.ts`).

## Pagamento no Asaas (fatura hospedada)

Tudo usa a **fatura do Asaas** (`invoiceUrl`): é a página de pagamento hospedada pelo Asaas. O
checkout do Asaas (`/v3/checkouts`) não serve porque não aceita boleto e não recebe o cliente já
cadastrado.

| Plano (`BILLING_PLANS`) | Valor | No Asaas | Forma | Período liberado |
| --- | --- | --- | --- | --- |
| `trial` | R$ 6 | cobrança avulsa | boleto, PIX ou cartão (`UNDEFINED`) | 7 dias, sem carência |
| `monthly` | R$ 60 | assinatura `MONTHLY` | cartão (`CREDIT_CARD`) | 1 mês + 5 dias |
| `yearly` | R$ 612 | assinatura `YEARLY` | cartão | 12 meses + 5 dias |
| `single_month` | R$ 60 | cobrança avulsa | boleto, PIX ou cartão | 1 mês + 5 dias |

Valores em centavos, dias e carência em `packages/contracts/src/schemas/billing.schema.ts` (o web
mostra, a API cobra). O cliente do Asaas é criado uma vez por escritório (nome e CNPJ do escritório,
e-mail de quem paga, `externalReference` = id do tenant). A assinatura é criada sem os dados do cartão:
a pessoa paga a primeira fatura com o cartão e o Asaas cobra as próximas nele.

`Tenant.billing` (só o que a conciliação precisa):

| Campo | Para quê |
| --- | --- |
| `customerId` | Achar o escritório pelo `payment.customer` do webhook (índice) |
| `subscriptionId`, `subscriptionPlan` | Uma assinatura viva (CHK-08) e o período das cobranças dela |
| `trialPaymentId`, `trialInvoiceUrl` | Teste uma vez: o segundo clique devolve a mesma fatura |
| `paidAt` | Já pagou alguma vez (tela "primeiro pagamento" × "acesso vencido"; teste some) |

## Webhook

`POST /billing/webhook`, público, conferido pelo header `asaas-access-token` contra
`ASAAS_WEBHOOK_TOKEN` (comparação em tempo constante; errado = 401). Corpo sem `.strict()`: o Asaas
acrescenta campos. Trata `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED`; todo o resto, cliente desconhecido
ou cobrança que não é do Ethica responde 200 sem fazer nada.

| Cobrança | Plano | Data de partida (fixa na cobrança) |
| --- | --- | --- |
| `payment.subscription === billing.subscriptionId` | `billing.subscriptionPlan` | `dueDate` |
| `payment.id === billing.trialPaymentId` | `trial` | `confirmedDate ?? paymentDate` |
| `externalReference === 'single_month'` | `single_month` | `confirmedDate ?? paymentDate` |

`accessUntil = início do dia (partida + período + carência)` em `America/Sao_Paulo` (AD-036), gravado
com `$max`, mais `billing.paidAt`. Repetir o evento dá a mesma data: idempotente sem guardar o id do
evento. `CONFIRMED` e `RECEIVED` da mesma cobrança também.

## API (`apps/api/src/modules/identity/billing.*`)

Fica no `identity`, dono do `Tenant`. Rotas em `/billing`:

| Rota | Guarda | Faz |
| --- | --- | --- |
| `GET /billing` | `validSession` | `{ firstPayment, trialAvailable, canPay, accessUntil? }` |
| `POST /billing/pay` `{ plan }` | `validSession`, admin | Cria a cobrança ou a assinatura e devolve `{ url }` da fatura. Assinar de novo apaga a assinatura anterior no Asaas. Teste indisponível = 409 `trial_unavailable`; Asaas sem chave = 503 `billing_not_configured`; Asaas falhou = 502 `billing_unavailable` |
| `POST /billing/webhook` | token do header | Estende o acesso |

`createAuthMiddleware` passa a devolver também **`validSession`**: a mesma sessão, sem a barreira do
acesso do escritório (como o `signout` não passa pela barreira). Só as rotas de `/billing` usam.

Provedor: `apps/api/src/providers/asaasClient.ts` (`createCustomer`, `createPayment`,
`createSubscription` + primeira fatura, `deleteSubscription`), injetado em `buildApp({ asaas })`. Env:
`ASAAS_API_URL` (padrão produção `https://api.asaas.com/v3`; sandbox
`https://api-sandbox.asaas.com/v3`), `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`. O retorno da fatura
(`callback.successUrl`) é a raiz do web: com o acesso liberado a pessoa entra; senão o guarda leva a
`/suspended`.

`signup` (`auth.service.ts`) grava o escritório com `accessUntil = agora`.

## Web

- `apps/web/src/routes/_public/auth/`: botão **Criar conta** no passo do e-mail (mesmo envio da chave,
  título de cadastro). O resto do cadastro não muda; a passkey abre a sessão e o guarda leva a
  `/suspended`.
- `apps/web/src/routes/_public/suspended/`: lê `GET /billing`. Primeiro pagamento: "Escolha seu plano";
  senão "Acesso vencido". Lista os planos (teste só quando disponível) e **Pagar** leva à fatura
  (`window.location`). Quem não é admin vê só o aviso. Nota: "Se você já pagou, o acesso é liberado
  assim que o pagamento for confirmado". Sair continua.

## Riscos

- O Asaas exige o domínio do `successUrl` cadastrado na conta; sem isso a fatura não volta sozinha.
- Assinatura no cartão sem os dados do cartão na criação: conferir no sandbox que a segunda cobrança
  é debitada no cartão da primeira fatura.
- Webhook precisa ser cadastrado no painel do Asaas (eventos de cobrança, envio sequencial, token).
