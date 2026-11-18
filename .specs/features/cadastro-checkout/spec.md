# Cadastro com checkout (assinatura pelo Asaas)

Pedido em 2026-11-18:

> - a intenção é que o cadastro seja feito junto do processo de checkout
> - o cadastro no sistema já é apenas por email
> - no checkout o email será required e se o pagamento tiver sucesso então o usuario já tem o cadastro
>   realizado no sistema, se o processo de pagamento falhar o cadastro é salvo de uma forma que já
>   redirecione para o `/suspended` da mesma forma quando o usuario estiver com a mensalidade vencida
> - na tela de sign in alem de permitir o usuario colocar email para entrar, deve ter o botão para o
>   processo de cadastro, que será esse novo processo de checkout

Evolução de `acesso-email` (AD-155) e `acesso-aparelho` (AD-220): o cadastro deixa de ser aberto e
gratuito. Criar o escritório passa a terminar numa **assinatura** paga no checkout do Asaas. O e-mail
continua provando quem é a pessoa, e a passkey continua abrindo toda sessão.

## Escolhas (2026-11-18)

| Pergunta | Resposta |
| --- | --- |
| Planos | Mensal, anual e um "teste" pago com valor simbólico (ex.: R$ 6) |
| Ordem do cadastro | **Confirmar o e-mail antes de pagar**: e-mail → código → dados do escritório e plano → checkout |
| Tela `/suspended` | **Pagar** (abre um novo checkout) e **Sair** |
| Escritórios que já existem | Nada a fazer: o sistema é MVP e tudo o que existe é teste |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Planos | Mensal, anual e teste com valor simbólico | Pedido, 2026-11-18 | Yes |
| Ordem | E-mail confirmado (código) antes do checkout | Pedido, 2026-11-18 | Yes |
| `/suspended` | Pagar + Sair | Pedido, 2026-11-18 | Yes |
| Escritórios atuais | Sem migração nem cobrança | Pedido, 2026-11-18 | Yes |
| Como funciona o teste de R$ 6 | O primeiro mês da assinatura mensal custa R$ 6; da segunda cobrança em diante, o valor cheio do mensal (o servidor muda o valor da assinatura no Asaas depois que o primeiro pagamento é confirmado). Alternativa: teste de N dias por R$ 6 sem renovação, e depois a pessoa escolhe mensal ou anual em `/suspended` | Converte sozinho, sem rotina diária de expiração | No |
| Valores | Mensal R$ ?, anual R$ ?, teste R$ 6, numa constante do contrato (mudar o preço = novo deploy) | Front mostra e API cobra o mesmo valor | No |
| Forma de pagamento | Só cartão de crédito | O checkout recorrente do Asaas só aceita cartão | No |
| Mensalidade vencida | Cobrança da assinatura vencida (`PAYMENT_OVERDUE`) suspende no mesmo dia; pagamento confirmado reativa | Pedido ("da mesma forma quando a mensalidade estiver vencida") | No |
| "Entrar" com e-mail sem conta | Leva ao mesmo cadastro com checkout (não existe mais o "Criar escritório" gratuito) | Um caminho só | No |
| Cancelar a assinatura | Fora desta entrega: a pessoa cancela pelo suporte | Escopo | No |

## Requirements

| ID | Requisito |
| --- | --- |
| CHK-01 | A tela `/auth` ganha o botão **Criar conta** abaixo de "Entrar". Ele leva ao mesmo passo do e-mail, com título de cadastro. |
| CHK-02 | Cadastro: e-mail (obrigatório) → chave de acesso (link ou código, AD-155) → nome, nome do escritório, CNPJ e **plano** → checkout do Asaas com nome, CNPJ e e-mail já preenchidos. |
| CHK-03 | Ao ir para o checkout, o escritório e a pessoa (admin) já ficam gravados com o escritório **suspenso**. O e-mail e o CNPJ ficam reservados a esse escritório. |
| CHK-04 | Antes de sair para o checkout, a pessoa cria a passkey do aparelho (AD-220), para poder voltar e pagar depois sem refazer o cadastro. |
| CHK-05 | Pagamento confirmado pelo Asaas (webhook, nunca o retorno do navegador) → escritório **ativo**. A pessoa volta ao Ethica e entra direto. |
| CHK-06 | Pagamento recusado, checkout cancelado, expirado ou abandonado → o escritório segue suspenso. Toda entrada leva a `/suspended`. |
| CHK-07 | `/suspended` explica a situação (cadastro sem pagamento ou mensalidade vencida) e oferece **Pagar** (escolhe o plano e abre um novo checkout) e **Sair**. Só o admin paga; os demais veem que o acesso volta quando o admin regularizar. |
| CHK-08 | Cobrança da assinatura vencida suspende o escritório; o pagamento dela reativa. |
| CHK-09 | O webhook do Asaas é público, conferido pelo token do header `asaas-access-token` e idempotente: o mesmo evento recebido duas vezes não muda nada. |
| CHK-10 | Nenhum teste automático chama o Asaas: o cliente do Asaas fica em `apps/api/src/providers/` e é injetado como o provedor de e-mail. |

## Out of scope

- Trocar de plano, cancelar a assinatura e ver faturas pelo Ethica.
- Boleto e PIX (o checkout recorrente do Asaas é só cartão).
- Cobrar os escritórios criados antes desta feature.
- Nota fiscal.

## Design direction (detalhe no `design.md`, depois das perguntas)

- **Banco** (`packages/db`): `Tenant` ganha `billing` (cliente, assinatura e último checkout do Asaas,
  plano). Sem status novo: cadastro sem pagamento e mensalidade vencida são o mesmo `suspended`
  (AD-098), e o webhook faz `suspended ↔ active` por `transitionTenantStatus`.
- **API**: módulo `billing` (AD-038). `POST /billing/checkout` (admin, liberado para escritório
  suspenso, como o `signout`) cria o checkout `RECURRENT` no Asaas e devolve o link;
  `POST /billing/webhook` recebe `CHECKOUT_PAID`, `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED` e
  `PAYMENT_OVERDUE`. O `signup` passa a criar o escritório suspenso com o plano escolhido.
- **Web**: `/auth` com "Criar conta" e plano no formulário do escritório; `/suspended` com Pagar.
- **Config**: `ASAAS_API_KEY`, `ASAAS_API_URL` (sandbox ou produção) e `ASAAS_WEBHOOK_TOKEN` em
  `apps/api/src/config/env.config.ts`.

Decisão: AD-230 em `.specs/STATE.md` (proposta até as perguntas acima serem confirmadas).
