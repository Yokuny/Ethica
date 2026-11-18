# Validation — Cadastro com checkout

Data: 2026-11-18. Gate: `pnpm run check` (121 arquivos, 640 testes) e `(cd apps/web && pnpm run build)` verdes.

| Requisito | Prova |
| --- | --- |
| CHK-01 | `apps/web/src/routes/_public/auth/index.unit.test.tsx` — "Criar conta" pede só o e-mail e envia a chave |
| CHK-02, CHK-03 | `apps/api/src/modules/identity/auth.router.e2e.test.ts` — cadastro cria o escritório e a passkey; a sessão responde 403 `tenant_suspended` até o pagamento |
| CHK-04, CHK-05 | `apps/api/src/modules/identity/billing.router.e2e.test.ts` — teste 7 dias sem carência e uma vez só (fatura velha do teste paga depois de outro pagamento não vale); anual = vencimento + 12 meses + 5 dias; avulsa = dia do pagamento + 1 mês + 5 dias; escritório volta a abrir. `apps/web/src/routes/_public/suspended/index.unit.test.tsx` — acesso liberado enquanto a tela de planos está aberta leva ao sistema |
| CHK-06 | `billing.router.e2e.test.ts` — escritório fechado recebe 403 nas outras rotas e vê `/billing`; suspenso pela plataforma não vê nem `/billing`. `apps/api/src/modules/agenda/feed.router.e2e.test.ts` — feed iCal e aviso diário param com o acesso vencido |
| CHK-07 | `billing.router.e2e.test.ts` (só admin paga, sem Asaas = `billing_not_configured`) e `apps/web/src/routes/_public/suspended/index.unit.test.tsx` (planos, Pagar abre a fatura, membro só lê o aviso) |
| CHK-08 | `billing.router.e2e.test.ts` — assinar de novo apaga a anterior; cobrança da anterior não libera nada |
| CHK-09 | `billing.router.e2e.test.ts` — token errado 401; evento, cliente ou corpo desconhecido 200 sem efeito; CONFIRMED + RECEIVED = mesma data |
| AD-232 | `billing.router.e2e.test.ts` — estorno da renovação volta ao vencimento dela; chargeback volta ao início e a disputa vencida devolve; estorno parcial não muda; estorno do teste fecha o escritório |
| CHK-10 | `apps/api/src/providers/asaasClient.unit.test.ts` com `fetch` simulado; e2e com o cliente falso |

## Sandbox do Asaas (MCP, dados inventados, apagados depois)

- Cliente com CNPJ de dígito errado: recusado (400 "O CPF/CNPJ informado é inválido") — o cadastro passou a conferir o dígito.
- Assinatura `CREDIT_CARD` sem cartão: aceita; a primeira cobrança aparece na hora em `/subscriptions/{id}/payments`, com `invoiceUrl`, `customer`, `subscription` e datas `AAAA-MM-DD`.
- Primeira cobrança paga com cartão de teste: `CONFIRMED`, `confirmedDate` preenchido, `paymentDate` nulo; o cartão fica salvo na assinatura (`creditCard.creditCardToken`), então as próximas cobranças saem nele.
- `callback.successUrl` sem domínio cadastrado na conta: recusado (400 "Não há nenhum domínio configurado em sua conta") — o retorno ficou opcional (`ASAAS_RETURN_URL`).
- Cobrança avulsa `UNDEFINED`: aceita, com `invoiceUrl` e boleto.

## Não validado

- Webhook real do Asaas chegando à API (precisa da API publicada e do webhook cadastrado no painel).
- Retorno automático da fatura ao Ethica (depende do domínio cadastrado na conta Asaas).
