---
feature: Cadastro com checkout
slug: cadastro-checkout
descricao: Criar conta termina na assinatura paga no Asaas; sem pagamento ou mensalidade vencida, o escritório fica suspenso
data: 2026-11-20
status: parcial
areas: [apps/api, apps/web, packages/contracts, packages/db, harness]
decisoes: [AD-230, AD-231, AD-232, AD-244, AD-245, AD-246, AD-247, AD-155, AD-220, AD-098]
spec: [.specs/features/cadastro-checkout]
---

# Cadastro com checkout

**Status**: parcial · **Atualizado**: 2026-11-20 · **Áreas**: `apps/api`, `apps/web`, `packages/contracts`, `packages/db`, `harness`

> Documento vivo. Requisitos e desenho em `.specs/features/cadastro-checkout/` (`spec.md`, `design.md`).
> Correlação com o git: `git log --oneline -i --grep='cadastro-checkout'`.

## O que foi feito

- Entrada com **Criar conta**: e-mail → chave → nome, escritório e CPF ou CNPJ → passkey do aparelho. O escritório nasce sem acesso.
- Tela de planos em `/billing` (AD-245): os planos em carrossel, o Mensal no centro e recomendado (AD-246), no modelo shadcnblocks da perita: barra com a marca e Sair, a tabela "Compare os planos" com preço e Pagar em cada coluna, "Precisa de ajuda?" ao lado das perguntas frequentes e o rodapé. Planos: **teste** (R$ 6 pelo primeiro mês, uma vez, AD-247), **mensal** (R$ 60) e **anual** (R$ 612) no cartão, e **mensalidade avulsa** (R$ 60) por boleto, PIX ou cartão. **Pagar** abre a fatura do Asaas; só o admin paga, os demais veem os preços e o aviso. Sair continua.
- Pagamento confirmado pelo Asaas libera o acesso até o fim do período, mais 5 dias de carência (o teste também, AD-231). Acabou o período, toda entrada volta à tela de planos.
- Estorno ou chargeback tira o período que o pagamento tinha pago; disputa vencida devolve. Estorno parcial não muda o acesso.
- Feed iCal e aviso diário de prazos param junto com o acesso.

## Por que

O cadastro aberto e gratuito (AD-155) passa a acontecer junto do pagamento (AD-230). Uma data de acesso, em vez de status novo, resolve teste, carência e cadastro não pago sem rotina diária.

## Como

- Banco: `Tenant.accessUntil` e `Tenant.billing`; regra única `isTenantOpen`/`openTenantFilter` (`packages/db/src/models/tenant.model.ts`).
- Contrato: `packages/contracts/src/schemas/billing.schema.ts` (planos, valores, dias).
- API: `apps/api/src/modules/identity/billing.*` (`GET /billing`, `POST /billing/pay`, `POST /billing/webhook`), `validSession` em `apps/api/src/middlewares/authentication.middleware.ts`, cliente em `apps/api/src/providers/asaasClient.ts`. Variáveis `ASAAS_*` em `apps/api/src/config/env.config.ts` e `.env.example`.
- Web: `apps/web/src/routes/_public/auth/` (Criar conta) e `apps/web/src/routes/_public/billing/` (planos e Pagar), carrossel em `packages/ui/src/components/carousel.tsx`.

## Como testar

- Automático: `pnpm vitest run apps/api/src/modules/identity/billing apps/api/src/providers/asaasClient apps/web/src/routes/_public`.
- Manual (sandbox): `ASAAS_API_URL=https://api-sandbox.asaas.com/v3` e `ASAAS_API_KEY` do sandbox (`$aact_hmlg_…`) no `.env`, com a API reiniciada; sem a URL, a chave de sandbox vai à produção e o Asaas responde 401 `invalid_environment` (vira `billing_unavailable`). Uma `ASAAS_API_KEY` exportada no shell (a do MCP do Asaas) vence a do `.env`. Localmente a fatura abre, mas o acesso só libera com o webhook chegando (túnel para `/billing/webhook`) e `ASAAS_WEBHOOK_TOKEN` e `ASAAS_WEBHOOK_TOKEN`; no painel do Asaas, webhook para `<API>/billing/webhook` com os eventos de cobrança, envio sequencial e o mesmo token. Crie uma conta em `/auth` (CPF ou CNPJ válido), pague a fatura com cartão de teste e confira que a tela de planos entra no sistema sozinha.

## Antes de ir ao ar

Sem estes passos, **todo cadastro novo fica sem acesso** e "Pagar" responde "indisponível":

- Railway: `ASAAS_API_URL`, `ASAAS_API_KEY` e `ASAAS_WEBHOOK_TOKEN` (`.env.example`).
- Painel do Asaas: webhook para `<API>/billing/webhook` com os eventos de cobrança (inclui estorno e chargeback), envio sequencial e o mesmo token.
- Opcional: domínio do Ethica em Minha Conta > Informações no Asaas e então `ASAAS_RETURN_URL` (volta automática da fatura).

## Pendências

- [ ] Conferir o webhook real chegando e liberando o acesso (`.specs/features/cadastro-checkout/validation.md`).
- [ ] Trocar de plano, cancelar a assinatura e ver faturas pelo Ethica (fora desta entrega).

## Histórico

- 2026-11-18 — Spec criada (`.specs/features/cadastro-checkout/spec.md`), AD-230 proposta.
- 2026-11-18 — Implementado (AD-230 ativa). Divergências da spec: o plano é escolhido na tela de planos (`/suspended`), depois da passkey, e não no formulário do escritório; o pagamento usa a fatura do Asaas, não o checkout (`/v3/checkouts` não aceita boleto nem o cliente já cadastrado). A cobrança fica no módulo `identity`, dono do `Tenant`.
- 2026-11-18 — Revisão: escritório suspenso pela plataforma não chega à tela de planos; a tela de planos reconsulta a cada 10 s e entra no sistema quando o pagamento é confirmado; o id da assinatura é gravado antes de buscar a fatura e apagar assinatura que não existe mais não é erro; pagamento ignorado pelo webhook vai ao log (`billing.paid_ignored`); fatura velha do teste paga depois de outro pagamento não vale. Pelo sandbox: retorno da fatura opcional (`ASAAS_RETURN_URL`, o Asaas recusa sem domínio cadastrado) e dígito do CNPJ conferido no cadastro.
- 2026-11-18 — Teste confirmado em 7 dias e passa a ter os 5 dias de carência (AD-231); na spec congelada o padrão era sem carência.
- 2026-11-18 — Estorno e chargeback tiram o período pago (AD-232); o log de evento sem efeito passa a `billing.payment_ignored`.
- 2026-11-20 — Escritório com CPF ou CNPJ, no cadastro e pela plataforma, com os dígitos conferidos (AD-244, supersede a AD-144).
- 2026-11-20 — Tela de planos vira `/billing` com os preços no design da perita: seletor Mensal/Anual e carrossel 3D (AD-245). O `.env` local ganha o sandbox do Asaas.
- 2026-11-20 — Sem seletor Mensal/Anual e sem giro 3D: quatro cards (Teste, Mensal, Anual, Avulsa), laterais só esmaecidos, borda fina e sem sombra (AD-246, supersede a parte visual da AD-245).
- 2026-11-20 — Cards com argumento de venda: Teste e Anual com o preço de referência riscado e "Economize" (7 dias e 12 meses do Mensal, calculados de `BILLING_PLAN_CENTS`), o Anual com o valor por mês; no topo, o meio de pagamento e a vantagem dele; embaixo, o que o Ethica muda no dia do perito (lista igual nos quatro, do `PRODUCT.md`). Clicar num card lateral o traz ao centro; os laterais só atenuam borda e ícones.
- 2026-11-20 — Teste passa a ser o primeiro mês por R$ 6 (AD-247, supersede os 7 dias da AD-230/231), riscado contra os R$ 60 do Mensal. Página de venda na estrutura da skill `pricing-page` (instalada fora do repo): frase de posicionamento e "Recomendado" no Mensal; cada card lista "Tudo do <plano>, e mais" (o Mensal soma ao Teste a equipe sem limite; sem o card do Teste ele lista tudo); tabela "Compare os planos", perguntas frequentes (só o que as ADs garantem) e Assinar o Mensal para o admin. A equipe "Só você" no Teste é só texto: o sistema ainda não limita convites no teste.
- 2026-11-20 — Página de planos no modelo da perita (`pricing.html`, shadcnblocks; o arquivo de referência fica fora do commit): só o carrossel ficou; sai o cabeçalho com trilha e o bloco Assinar o Mensal; entram a barra com a marca e Sair, a tabela "Compare os planos" com preço, posicionamento e Pagar no topo de cada coluna e linhas em grupos (Plano, No dia a dia), "Precisa de ajuda?" ao lado das perguntas e o rodapé com a promessa do produto.

## Referências

- Spec, design, tasks e validação (congelados): `.specs/features/cadastro-checkout/`
