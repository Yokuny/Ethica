# Validation — Cadastro com checkout

Data: 2026-11-18. Gate: `pnpm run check` (121 arquivos, 636 testes) e `(cd apps/web && pnpm run build)` verdes.

| Requisito | Prova |
| --- | --- |
| CHK-01 | `apps/web/src/routes/_public/auth/index.unit.test.tsx` — "Criar conta" pede só o e-mail e envia a chave |
| CHK-02, CHK-03 | `apps/api/src/modules/identity/auth.router.e2e.test.ts` — cadastro cria o escritório e a passkey; a sessão responde 403 `tenant_suspended` até o pagamento |
| CHK-04, CHK-05 | `apps/api/src/modules/identity/billing.router.e2e.test.ts` — teste 7 dias sem carência e uma vez só; anual = vencimento + 12 meses + 5 dias; avulsa = dia do pagamento + 1 mês + 5 dias; escritório volta a abrir |
| CHK-06 | `billing.router.e2e.test.ts` — escritório fechado recebe 403 nas outras rotas e vê `/billing` |
| CHK-07 | `billing.router.e2e.test.ts` (só admin paga, sem Asaas = `billing_not_configured`) e `apps/web/src/routes/_public/suspended/index.unit.test.tsx` (planos, Pagar abre a fatura, membro só lê o aviso) |
| CHK-08 | `billing.router.e2e.test.ts` — assinar de novo apaga a anterior; cobrança da anterior não libera nada |
| CHK-09 | `billing.router.e2e.test.ts` — token errado 401; evento, cliente ou corpo desconhecido 200 sem efeito; CONFIRMED + RECEIVED = mesma data |
| CHK-10 | `apps/api/src/providers/asaasClient.unit.test.ts` com `fetch` simulado; e2e com o cliente falso |

## Não validado

- Pagamento real no sandbox do Asaas (sem chave no ambiente desta sessão): cadastro → fatura → webhook → acesso.
- Segunda cobrança da assinatura debitada no cartão salvo na primeira fatura.
- Retorno automático da fatura ao Ethica (`callback.successUrl` exige o domínio cadastrado na conta Asaas).
