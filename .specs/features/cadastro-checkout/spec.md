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
| Planos | Mensal R$ 60, anual com 15% de desconto sobre 12 mensalidades (R$ 612) e um teste pago de valor simbólico (R$ 6) |
| Teste | Alguns dias por R$ 6, **sem renovação**; ao fim, a pessoa escolhe mensal, anual ou avulsa |
| Forma de pagamento | Assinatura (mensal e anual) só no cartão de crédito; **mensalidade avulsa** por boleto, PIX ou cartão |
| Ordem do cadastro | **Confirmar o e-mail antes de pagar** |
| Mensalidade vencida | **5 dias de carência** depois do vencimento, depois suspende |
| "Entrar" com e-mail sem conta | Leva ao mesmo cadastro com pagamento |
| Tela `/suspended` | **Pagar** e **Sair** |
| Escritórios que já existem | Nada a fazer: o sistema é MVP e tudo o que existe é teste |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Planos e valores | Mensal R$ 60, anual R$ 612, teste R$ 6, mensalidade avulsa R$ 60 | Pedido, 2026-11-18 | Yes |
| Teste | N dias por R$ 6, sem renovar, uma vez por escritório | Pedido, 2026-11-18 | Yes |
| Forma de pagamento | Assinatura no cartão; avulsa e teste por boleto, PIX ou cartão | Pedido, 2026-11-18 | Yes |
| Ordem | E-mail confirmado (código) antes do pagamento | Pedido, 2026-11-18 | Yes |
| Carência | 5 dias depois do vencimento da mensalidade | Pedido, 2026-11-18 | Yes |
| "Entrar" com e-mail sem conta | Mesmo cadastro com pagamento | Pedido, 2026-11-18 | Yes |
| `/suspended` | Pagar + Sair | Pedido, 2026-11-18 | Yes |
| Escritórios atuais | Sem migração nem cobrança | Pedido, 2026-11-18 | Yes |
| Dias do teste | 7 dias | Comum em teste de SaaS | No |
| Carência no teste | Não: o teste acaba no 7º dia | A carência é da mensalidade | No |
| Cancelar a assinatura | Fora desta entrega: pelo suporte | Escopo | No |

## Requirements

| ID | Requisito |
| --- | --- |
| CHK-01 | A tela `/auth` ganha o botão **Criar conta** abaixo de "Entrar". Ele leva ao mesmo passo do e-mail, com título de cadastro. |
| CHK-02 | Cadastro: e-mail (obrigatório) → chave de acesso (link ou código, AD-155) → nome, nome do escritório e CNPJ → passkey do aparelho (AD-220) → escolha do plano → pagamento no Asaas. E-mail sem conta em "Entrar" segue o mesmo caminho. |
| CHK-03 | O escritório e a pessoa (admin) ficam gravados já no cadastro, **sem acesso** até o primeiro pagamento confirmado. O e-mail e o CNPJ ficam reservados a esse escritório. |
| CHK-04 | Planos: **teste** (R$ 6, 7 dias, uma vez por escritório, sem renovar), **mensal** (R$ 60, assinatura no cartão), **anual** (R$ 612, assinatura no cartão) e **mensalidade avulsa** (R$ 60, boleto, PIX ou cartão). |
| CHK-05 | Pagamento confirmado pelo Asaas (webhook, nunca o retorno do navegador) libera o acesso até o fim do período pago, mais 5 dias de carência nos planos mensal, anual e avulso. A pessoa volta ao Ethica e entra direto. |
| CHK-06 | Pagamento recusado, abandonado ou ainda não confirmado, teste encerrado ou mensalidade vencida há mais de 5 dias → toda entrada leva a `/suspended`. |
| CHK-07 | `/suspended` mostra a situação (primeiro pagamento ou acesso vencido), os planos e **Pagar** (abre a página de pagamento do Asaas), além de **Sair**. Só o admin paga; os demais veem que o acesso volta quando o admin pagar. |
| CHK-08 | O escritório tem no máximo uma assinatura viva: assinar de novo encerra a anterior no Asaas. |
| CHK-09 | O webhook do Asaas é público, conferido pelo token do header `asaas-access-token`, idempotente (o mesmo evento duas vezes não muda nada) e nunca recusa evento desconhecido. |
| CHK-10 | Nenhum teste automático chama o Asaas: o cliente do Asaas fica em `apps/api/src/providers/` e é injetado como o provedor de e-mail. |

## Out of scope

- Trocar de plano, cancelar a assinatura e ver faturas pelo Ethica.
- Cobrar os escritórios criados antes desta feature.
- Nota fiscal.

Desenho em `design.md`. Decisão: AD-230 em `.specs/STATE.md`.
